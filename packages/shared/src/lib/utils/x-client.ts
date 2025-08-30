// This file contains the X API client.
// It uses the twitter-api-v2 library to interact with the X API.

import { TwitterApi } from "twitter-api-v2";

// Get the API credentials from the environment variables.
const apiKey = process.env.X_API_KEY;
const apiSecretKey = process.env.X_API_SECRET_KEY;
const accessToken = process.env.X_ACCESS_TOKEN;
const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

// Check if all the required environment variables are set.
if (!apiKey || !apiSecretKey || !accessToken || !accessTokenSecret) {
  throw new Error(
    "Missing X API credentials. Please set X_API_KEY, X_API_SECRET_KEY, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET in your .env file."
  );
}

// Create the X API client.
// The client is configured with the API credentials.
// It will be used to make requests to the X API.
const xClient = new TwitterApi({
  appKey: apiKey,
  appSecret: apiSecretKey,
  accessToken: accessToken,
  accessSecret: accessTokenSecret,
});

export default xClient;
