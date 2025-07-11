export const makeBlockVisionApiRequest = async (url: string) => {
  const apiKey = process.env.BLOCKVISION_API_KEY;
  
  // Debug API key availability (don't log the full key for security, just check if it exists)
  console.log("API key available:", apiKey ? `Yes (starts with ${apiKey.substring(0, 3)}...)` : "No");
  
  if (!apiKey) {
    throw Error("blockvision api key not found");
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
    
    const apiResult = await response.json();
    
    // Log a bit of the result for debugging
    console.log("API response preview:", 
      JSON.stringify(apiResult).substring(0, 100) + "...");
    
    if (!apiResult) {
      //@ts-ignore
      return "No results found.";
    }
    
    const apiResultString = JSON.stringify(apiResult);
    return apiResultString;
  } catch (error: any) {
    console.error("Error in making api call:", url, error);

    // Returning error details so AI can adapt its next action
    throw new Error(`Error in making api call: ${error.message}`);
  }
};