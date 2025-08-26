# Smoke Tests with Real AI

## Status: Requires Manual Configuration

The smoke tests are designed to validate Shakespeare's core functionality with real AI, but they require proper Goose CLI session management.

## Issue Identified

The current GooseAI implementation (`src/utils/goose.ts`) spawns the `goose` CLI as a subprocess, but Goose requires an interactive session with proper context and configuration. Running it as a one-off command via `spawn` causes it to hang waiting for session initialization.

## Solutions

### Option 1: Use Goose Session Management
Goose CLI works best within an established session. The tests would need to:
1. Initialize a goose session
2. Maintain session state across multiple prompts  
3. Properly close the session

### Option 2: Use AI API Directly
Replace the Goose CLI wrapper with direct API calls to the AI provider (OpenAI, Anthropic, etc.)

### Option 3: Mock for Integration Tests
Keep the real AI testing as manual validation and use comprehensive mocks for automated testing.

## Current Test Structure

The smoke tests are properly structured to validate:

1. **Real AI Content Analysis**: Tests that AI accurately scores content quality
2. **Worst Content Identification**: Verifies AI correctly identifies poor quality content  
3. **Content Improvement**: Tests that AI generates meaningful improvements
4. **End-to-End Workflow**: Full content improvement cycle

## Manual Testing

To manually test real AI integration:

1. Start a goose session: `goose`
2. Test content scoring by pasting prompts from `src/utils/ai.ts`
3. Verify responses match expected format
4. Test content improvement prompts

## Recommendation

For automated testing, the current integration tests with realistic mock scoring (implemented in `test/utils/mocks.ts`) provide comprehensive validation of Shakespeare's functionality without the complexity of real AI session management.

The smoke tests serve as documentation of how real AI integration should work when properly configured.