# CometAPI Integration Setup

## Overview
The `grok-4-fast-reasoning` model from CometAPI has been successfully integrated into BarzakhAI. CometAPI is an OpenAI-compatible API service that provides access to various AI models including Grok.

## Configuration

### Environment Variable
Add the following environment variable to your `.env` or `.env.local` file:

```bash
COMETAPI_API_KEY=your_cometapi_api_key_here
```

### Getting Your API Key
1. Visit [CometAPI](https://cometapi.com)
2. Sign up or log in to your account
3. Navigate to your dashboard
4. Generate or copy your API key

## Model Details

### Model ID
- **Internal ID**: `chat-model-grok`
- **Model Name**: `grok-4-fast-reasoning`
- **Provider**: CometAPI
- **Base URL**: `https://api.cometapi.com/v1`

### Usage in Code
The model is automatically available in the chat interface and can be selected from the model dropdown. It's configured in `packages/shared/src/lib/ai/models.ts`.

### Model Characteristics
- **Type**: Language Model with Reasoning
- **Speed**: Fast reasoning variant
- **Use Cases**: Complex reasoning, analysis, problem-solving tasks
- **Description**: Grok-4-Fast-Reasoning model from CometAPI with advanced reasoning capabilities

## API Documentation References
- [CometAPI Chat Endpoint](https://apidoc.cometapi.com/chat)
- [CometAPI Responses Endpoint](https://apidoc.cometapi.com/responses)

## Technical Implementation

The integration uses the `@ai-sdk/openai` package with a custom provider configuration:

```typescript
import { createOpenAI } from "@ai-sdk/openai";

const cometai = createOpenAI({
  baseURL: "https://api.cometapi.com/v1",
  apiKey: process.env.COMETAPI_API_KEY,
});

// Model registration
"chat-model-grok": cometai("grok-4-fast-reasoning")
```

## Troubleshooting

### Model Not Available
- Ensure `COMETAPI_API_KEY` is set in your environment
- Restart your development server after adding the environment variable
- Check that your API key is valid and has the necessary permissions

### API Errors
- Verify your API key is correct
- Check your CometAPI account balance/credits
- Review the [CometAPI error documentation](https://apidoc.cometapi.com/errors)

## Notes
- CometAPI is OpenAI-compatible, making integration seamless
- The model supports standard chat completions format
- Streaming and non-streaming modes are both supported

