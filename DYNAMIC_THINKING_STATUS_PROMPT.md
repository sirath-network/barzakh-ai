# Dynamic AI Thinking Status Implementation

## Overview
Transform the static "Thinking..." animation into an intelligent, context-aware status system that dynamically reflects what the AI is actually doing based on user prompts and tool execution.

## Problem Statement
Currently, the `ThinkingAnimation` component always displays a static "Thinking" text regardless of what the AI is processing. This provides no insight into progress or activity, creating a poor user experience during tool execution.

## Objectives
1. **Replace static text with dynamic, AI-generated status messages** that accurately reflect:
   - The specific tool/function being executed (blockchain queries, portfolio analysis, data fetching, etc.)
   - The user's intent extracted from their prompt
   - The current processing stage within a multi-step operation

2. **Generate status messages intelligently** using the AI itself (not static templates) that:
   - Analyze user prompts to identify entities and intents
   - Detect which tools are being invoked
   - Create contextually appropriate status descriptions
   - Update in real-time as processing stages change

3. **Ensure responsiveness**: Status updates must appear instantaneously without noticeable lag.

## Requirements

### Functional Requirements

#### FR1: Prompt Analysis & Intent Extraction
- Extract key entities from user prompts (addresses, token names, wallet identifiers, etc.)
- Identify user intent (query, analyze, compare, track, etc.)
- Detect multiple operations within a single prompt
- Pass extracted context to status generator

#### FR2: Tool Execution Detection
- Intercept or monitor tool/function calls during AI processing
- Capture tool metadata:
  - Tool name/type (portfolio_tracker, blockchain_scanner, data_fetcher, etc.)
  - Input parameters (addresses, query types, etc.)
  - Execution stage (started, in-progress, completed)
- Map tools to user-facing descriptions

#### FR3: AI-Generated Status Messages
- Use lightweight LLM call to generate status text based on:
  - User's original prompt
  - Current tool being executed
  - Extracted entities from prompt
  - Processing stage
- Generate messages that are:
  - Action-oriented (present continuous tense)
  - Specific to the operation ("Fetching portfolio..." not "Processing...")
  - Under 50 characters for UI clarity
  - Grammatically correct and professional
  - Free of technical jargon

#### FR4: Real-Time Status Updates
- Update status text as tools execute in sequence
- Handle multi-step operations (show progression)
- Transition smoothly between status messages
- Maintain status visibility throughout processing

#### FR5: Fallback Behavior
- If AI status generation fails, fall back to tool-specific default messages
- Never show blank or empty status
- Maintain fallback message quality

### Technical Requirements

#### TR1: Integration Points
- **Frontend Component**: Modify `ThinkingAnimation` component to accept dynamic status text prop
- **Status Source**: Create mechanism to receive status updates (possibly via `useChat` stream or separate status channel)
- **Message Flow**: Integrate with existing `useChat` hook from `ai/react` to capture tool execution metadata
- **API Route**: May need to add status generation endpoint or integrate into existing chat API

#### TR2: Performance Constraints
- Status generation must be lightweight (use fast model or optimized prompt)
- Minimize API calls (batch or cache where possible)
- Status updates should not block main AI processing
- Target: <100ms latency for status generation

#### TR3: Component Architecture
```
ThinkingAnimation (existing)
  ?
Accepts: statusText prop (string)
  ?
Displays: Dynamic text + animation dots
  ?
Updates: When statusText prop changes
```

#### TR4: Data Flow
```
User Prompt ? Intent Extraction ? Tool Detection ? Status Generation ? UI Update
```

### Status Message Guidelines

#### Message Format
- **Tense**: Present continuous ("Fetching...", "Analyzing...", "Scanning...")
- **Structure**: Action verb + object/context
- **Length**: 5-50 characters (prioritize clarity over brevity)
- **Tone**: Professional, clear, action-oriented

#### Message Examples by Scenario

**Blockchain/Portfolio Queries:**
- "Fetching portfolio for vitalik.eth..."
- "Scanning blockchain transactions..."
- "Analyzing on-chain holdings..."
- "Retrieving wallet balance..."
- "Searching transaction history..."

**Multi-Step Operations:**
- "Fetching first wallet data..." ? "Analyzing second wallet..." ? "Comparing portfolios..."
- "Collecting token prices..." ? "Calculating returns..." ? "Generating report..."

**Data Analysis:**
- "Processing transaction data..."
- "Calculating portfolio metrics..."
- "Analyzing token distribution..."

**Generic Fallbacks (when context unclear):**
- "Analyzing request..."
- "Processing query..."
- "Gathering information..."

#### What to Avoid
- Generic messages when specific context exists
- Technical jargon (avoid "Querying GraphQL endpoint...")
- Past tense ("Fetched data...")
- Overly verbose descriptions (>50 chars)
- Status messages that don't match actual activity

## Implementation Strategy

### Phase 1: Component Modification
1. Update `ThinkingAnimation` to accept `statusText?: string` prop
2. Replace hardcoded "Thinking" text with dynamic prop (fallback to "Thinking..." if undefined)
3. Ensure smooth text transitions (fade/update animation)
4. Test component in isolation

### Phase 2: Status Generation Infrastructure
1. **Option A - Stream Integration**: Capture tool metadata from AI stream events
   - Extend `useChat` to expose tool execution events
   - Generate status when tools are called
   
2. **Option B - Separate Status Channel**: Create dedicated status update mechanism
   - Add status endpoint to chat API
   - Stream status updates alongside messages
   
3. **Option C - Client-Side Analysis**: Analyze messages/tools client-side
   - Parse AI response for tool calls
   - Generate status from detected tools + user prompt

### Phase 3: AI Status Generator
1. Create lightweight status generation function:
   ```typescript
   async function generateStatus(
     userPrompt: string,
     toolName: string,
     toolParams: Record<string, any>,
     stage?: string
   ): Promise<string>
   ```
2. Use fast LLM model (or cached template mapping as fallback)
3. Implement fallback hierarchy:
   - AI-generated status (preferred)
   - Tool-specific default (if AI fails)
   - Generic fallback ("Analyzing...")

### Phase 4: Integration
1. Connect status generator to tool execution pipeline
2. Wire status updates to `ThinkingAnimation` component
3. Ensure real-time updates during processing
4. Handle edge cases (rapid tool switching, errors, etc.)

### Phase 5: Testing & Refinement
1. Test with various user prompts and tool combinations
2. Verify message quality and relevance
3. Ensure no performance degradation
4. Validate fallback behavior

## Success Criteria

### Primary Success Metrics
? **Accuracy**: Status messages accurately reflect actual AI activity (90%+ user agreement)
? **Responsiveness**: Status updates appear within 100ms of tool execution
? **Clarity**: Users understand what's happening without technical knowledge
? **Coverage**: No generic "Thinking..." messages when specific tools are executing

### Quality Indicators
- Status messages use specific actions ("Fetching portfolio..." vs "Processing...")
- Entities from prompts appear in status when relevant
- Multi-step operations show clear progression
- Messages remain concise (<50 chars) while staying informative

### Technical Benchmarks
- Status generation latency < 100ms (p95)
- No increase in main AI response time
- Component re-renders optimized (React.memo if needed)
- Zero blank/undefined status displays

## Implementation Notes

### Existing Codebase Integration
- **Component Location**: `/workspace/apps/frontend/components/thinking-animation.tsx`
- **Usage**: Component used in `ThinkingMessage` which is rendered during `isLoading` state
- **Hook**: `useChat` from `ai/react` manages chat state and loading
- **Stream**: AI responses likely streamed through `useChat` hook

### Key Files to Modify
1. `apps/frontend/components/thinking-animation.tsx` - Add dynamic status prop
2. `apps/frontend/components/thinking-message.tsx` - Pass status from parent
3. `apps/frontend/components/messages.tsx` - May need to pass status context
4. `apps/frontend/components/chat.tsx` - Likely need to generate/update status here
5. Potentially create: `apps/frontend/lib/status-generator.ts` - Status generation logic

### Considerations
- **Stream Compatibility**: Ensure status updates work with streaming responses
- **Error Handling**: Gracefully handle status generation failures
- **State Management**: Determine where status state lives (local vs global)
- **Performance**: Cache status generations for similar tool+prompt combinations
- **Accessibility**: Ensure status updates are announced to screen readers

## Example Implementation Flow

### Scenario: User asks "Show me vitalik.eth portfolio"

1. **User submits prompt**: "Show me vitalik.eth portfolio"
2. **Intent extraction**: 
   - Entity: "vitalik.eth"
   - Intent: "show portfolio"
   - Tool: portfolio_tracker
3. **Tool execution starts**: portfolio_tracker called with address
4. **Status generation**:
   - Input: prompt="Show me vitalik.eth portfolio", tool="portfolio_tracker", params={address: "vitalik.eth"}
   - Output: "Fetching portfolio for vitalik.eth..."
5. **UI update**: `ThinkingAnimation` displays "Fetching portfolio for vitalik.eth..."
6. **Processing continues**: Status may update if additional tools called
7. **Response complete**: Status disappears, results shown

### Scenario: User asks "Compare these two wallets"

1. **User submits prompt**: "Compare these two wallets"
2. **Status sequence**:
   - "Fetching first wallet data..."
   - "Analyzing second wallet..."
   - "Comparing portfolios..."
   - "Generating comparison..."

## Constraints & Limitations

- Must not block or delay main AI processing
- Status generation cost must be minimal (lightweight model or efficient caching)
- Must work within existing architecture (no major refactoring)
- Status must clear when processing completes
- Must handle edge cases gracefully (rapid tool switching, simultaneous operations, etc.)

## Future Enhancements (Out of Scope)

- Progress indicators (percentage complete)
- Estimated time remaining
- Tool execution metrics display
- Status history/logging
- Custom status messages from user preferences

---

## Deliverables

1. ? Modified `ThinkingAnimation` component with dynamic status support
2. ? Status generation system (AI-powered with fallbacks)
3. ? Integration with tool execution pipeline
4. ? Updated component tree to pass status through
5. ? Comprehensive error handling and fallbacks
6. ? No breaking changes to existing functionality
