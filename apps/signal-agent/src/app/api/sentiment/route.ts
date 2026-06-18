import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { image_url, token_name, market_data } = await req.json();

    if (!image_url || !token_name) {
      return NextResponse.json({ error: "Missing image_url or token_name" }, { status: 400 });
    }

    // 1. Enforce x402 Payment Standard
    // In a real flow, we verify the txHash of the USDC payment on Arc
    const paymentReceipt = req.headers.get('x-402-receipt');

    if (!paymentReceipt) {
      // Respond with a 402 Payment Required
      // Asking the orchestrator agent to pay 0.002 USDC on Arc
      return NextResponse.json(
        {
          error: "Payment Required",
          x402_invoice: {
            amount: 0.002,
            currency: "USDC",
            chain: "Arc",
            destination_wallet: process.env.AGENT_WALLET_ADDRESS || "0xAgentWalletAddressHere"
          }
        },
        { status: 402 }
      );
    }

    // 2. Fetch the image to process it
    const imageResponse = await fetch(image_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!imageResponse.ok) {
      console.error(`[SignalAgent] Failed to fetch image. Status: ${imageResponse.status}, URL: ${image_url}`);
      return NextResponse.json({ error: `Failed to fetch image from URL: ${imageResponse.status}` }, { status: 400 });
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // 3. Process with Azure AI Foundry (GPT-4o)
    let prompt = `Analyze this image associated with the token ${token_name}. Are there bullish or bearish signals? Provide a sentiment score from 0 to 100 where 100 is extremely bullish, a VERY short analysis (maximum 2 sentences), and a definitive trading signal (e.g. STRONG BUY, BUY, HOLD, SELL, LONG, SHORT). Additionally, provide specific numeric trade targets: "entry_price", "take_profit", and "stop_loss". Output purely as JSON with keys "sentiment_score", "analysis", "trading_signal", "entry_price", "take_profit", and "stop_loss" and nothing else.`;

    if (market_data) {
      prompt += `\n\nCRITICAL CONTEXT: Do not base your analysis solely on the logo. Here is real-time market data for ${token_name}:
        - Current Price: $${market_data.price}
        - 1h Change: ${market_data.change_1h ? market_data.change_1h.toFixed(2) + '%' : 'N/A'}
        - 24h Change: ${market_data.change_24h ? market_data.change_24h.toFixed(2) + '%' : 'N/A'}
        - 7d Change: ${market_data.change_7d ? market_data.change_7d.toFixed(2) + '%' : 'N/A'}
        - 30d Change: ${market_data.change_30d ? market_data.change_30d.toFixed(2) + '%' : 'N/A'}
        - 1y Change: ${market_data.change_1y ? market_data.change_1y.toFixed(2) + '%' : 'N/A'}
        - 24h Volume: $${market_data.volume_24h}
        - Market Cap: $${market_data.market_cap}
        - All Time High (ATH): $${market_data.ath}
        - All Time Low (ATL): $${market_data.atl}
        Incorporate this multi-timeframe price action, volume, and momentum into your specific trading signal and analysis!`;
    }

    const azureEndpoint = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    const openRouterResponse = await fetch(`${azureEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o',
        response_format: { type: "json_object" },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ],
        max_tokens: 4096,
      }),
    });

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text();
      throw new Error(`Azure AI Foundry API Error: ${openRouterResponse.status} - ${errorText}`);
    }

    const responseData = await openRouterResponse.json();
    let content = responseData.choices[0].message.content;

    if (!content) {
      throw new Error("No response text from GPT-4o via Azure AI Foundry");
    }

    // Clean markdown blocks if the model wrapped it
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let resultData;
    try {
        resultData = JSON.parse(content);
    } catch (parseError) {
        console.error("[SignalAgent] JSON Parse Error. Raw content:", content);
        // Fallback in case the LLM hallucinates malformed JSON
        resultData = {
            sentiment_score: 50,
            trading_signal: "HOLD",
            entry_price: 0,
            take_profit: 0,
            stop_loss: 0,
            analysis: "Analysis failed due to malformed response from the model. Please try again."
        };
    }

    return NextResponse.json({
      success: true,
      sentiment_score: resultData.sentiment_score,
      trading_signal: resultData.trading_signal,
      entry_price: resultData.entry_price,
      take_profit: resultData.take_profit,
      stop_loss: resultData.stop_loss,
      analysis: resultData.analysis,
      paid_with: "Arc USDC",
      receipt_id: paymentReceipt // Echoing back the verified receipt
    });

  } catch (e: any) {
    console.error("[SignalAgent] Error processing request:", e);
    return NextResponse.json({ error: e.message || "Invalid request" }, { status: 500 });
  }
}
