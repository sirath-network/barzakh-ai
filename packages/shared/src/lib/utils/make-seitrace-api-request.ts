export const makeSeiTraceApiRequest = async (url: string) => {
  const apiKey = process.env.SEITRACE_API_KEY;
  
  // Debug API key availability (don't log the full key for security, just check if it exists)
  console.log("API key available:", apiKey ? `Yes (starts with ${apiKey.substring(0, 3)}...)` : "No");
  
  if (!apiKey) {
    throw Error("seitrace api key not found");
  }

  // Validate URL format before making request
  try {
    new URL(url);
  } catch (error) {
    throw new Error(`Invalid URL format: ${url}`);
  }
  
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": apiKey,
    },
  };

  // Log request details
  console.log("Making request to:", url);
  console.log("With headers:", JSON.stringify({
    accept: options.headers.accept,
    "x-api-key": "****" // Don't log the actual key
  }));

  try {
    console.log("fetching data ------ ", url);
    const response = await fetch(url, options);
    
    // Log response status
    console.log("Response status:", response.status, response.statusText);
    
    // Check if the response is successful
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}:`, errorText);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // Check content type to ensure we're getting JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const textResponse = await response.text();
      console.error("Non-JSON response received:", {
        contentType,
        response: textResponse.substring(0, 200) + "..."
      });
      
      // If it's an HTML error page, throw a more descriptive error
      if (textResponse.includes("<!DOCTYPE") || textResponse.includes("<html")) {
        throw new Error(`Received HTML error page instead of JSON. This usually indicates an invalid API endpoint: ${url}`);
      }
      
      throw new Error(`Expected JSON response but got: ${contentType}`);
    }
    
    const apiResult = await response.json();
    
    // Log a bit of the result for debugging
    console.log("API response preview:", 
      JSON.stringify(apiResult).substring(0, 100) + "...");
    
    if (!apiResult) {
      return "No results found.";
    }
    
    const apiResultString = JSON.stringify(apiResult);
    return apiResultString;
  } catch (error: any) {
    console.error("Error in making api call:", url, error);

    // Provide more specific error messages
    if (error.message.includes("Failed to fetch")) {
      throw new Error(`Network error: Could not reach ${url}. Please check your internet connection.`);
    } else if (error.message.includes("<!DOCTYPE")) {
      throw new Error(`Invalid API endpoint: ${url} returned an HTML page instead of JSON data.`);
    } else if (error.name === "SyntaxError" && error.message.includes("JSON")) {
      throw new Error(`Invalid JSON response from ${url}. The API may be returning an error page.`);
    }

    // Returning error details so AI can adapt its next action
    throw new Error(`Error in making api call: ${error.message}`);
  }
};