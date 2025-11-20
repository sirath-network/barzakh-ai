declare module "@ai-sdk/anthropic" {
  // Minimal type declaration to satisfy TypeScript. The actual package provides
  // a function that returns an AI SDK provider, so we type it as `any` here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function anthropic(model: string): any;
}

