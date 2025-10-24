/**
 * Phase 2: AI Response Generation
 *
 * Uses Claude Sonnet 4.5 to generate a comprehensive response to the user's prompt.
 *
 * Input: Phase 1 results (prompt, context, metadata)
 * Output: AI-generated response for blog post
 */

import Anthropic from '@anthropic-ai/sdk';

/**
 * Initialize Anthropic client
 */
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable not set');
  }

  return new Anthropic({ apiKey });
}

/**
 * Process Phase 2: Response Generation
 *
 * @param {Object} phase1Result - Results from Phase 1
 * @returns {Object} Generated response and metadata
 */
export async function processPhase2(phase1Result) {
  console.log('Phase 2: Starting AI response generation');

  try {
    const anthropic = getAnthropicClient();

    // Construct system prompt
    const systemPrompt = `You are an AI assistant contributing to "My Weird Prompts," a digital garden blog that captures and explores interesting questions and prompts.

Your role is to provide thoughtful, comprehensive, and engaging responses to prompts that range from practical to philosophical, technical to creative.

Guidelines:
- Be thorough but accessible
- Use clear explanations with examples when helpful
- Break down complex topics into digestible sections
- Be engaging and conversational while remaining informative
- If the prompt is open-ended, explore multiple angles
- If the prompt is technical, provide accurate and practical information
- Add relevant context or related information that enriches the answer
- Use markdown formatting (headers, lists, code blocks) to structure your response

Your response will be published as a blog post, so write with a public audience in mind.`;

    // Construct user message
    let userMessage = '';

    // Add context if provided
    if (phase1Result.context && phase1Result.context.trim().length > 0) {
      userMessage += `**Context/Background:**\n${phase1Result.context}\n\n`;
    }

    // Add the main prompt
    userMessage += `**Prompt:**\n${phase1Result.prompt}`;

    console.log('Sending request to Claude Sonnet 4.5...');
    console.log('Prompt length:', phase1Result.prompt.length);
    console.log('Context length:', phase1Result.context?.length || 0);

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 1.0,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Extract response text
    const responseText = message.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n\n');

    console.log('Claude response received:', {
      length: responseText.length,
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    });

    // Prepare result
    const result = {
      response: responseText,
      metadata: {
        model: 'claude-sonnet-4-20250514',
        tokensUsed: message.usage.input_tokens + message.usage.output_tokens,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        generatedAt: new Date().toISOString(),
      },
    };

    console.log('Phase 2 complete');

    return result;

  } catch (error) {
    console.error('Phase 2 error:', error);
    throw new Error(`Phase 2 response generation failed: ${error.message}`);
  }
}

export default { processPhase2 };
