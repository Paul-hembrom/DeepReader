import { NextRequest, NextResponse } from 'next/server';

// Ensure optimal runtime configuration for Vercel and Node.js environments
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max timeout for AI generation on Vercel

/**
 * DeepSeek Chat Completions API Route
 * Configured with DeepSeek-V4.1-Flash (or DEEPSEEK_MODEL env var)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pageNumber,
      totalPages,
      pageText,
      pageImage,
      history = [],
      message,
      bookTitle = 'Uploaded Book',
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'A valid message is required.' },
        { status: 400 }
      );
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

    if (!deepseekApiKey) {
      return NextResponse.json(
        {
          error:
            'DeepSeek API key is not configured. Please set the DEEPSEEK_API_KEY in your environment variables or Vercel project settings.',
          reply:
            '*(DeepSeek API key is missing. Please set `DEEPSEEK_API_KEY` in your project environment variables or Vercel dashboard to enable the DeepSeek v4.1 flash reader assistant.)*',
        },
        { status: 503 }
      );
    }

    const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com')
      .trim()
      .replace(/\/+$/, '');

    // DeepSeek model preference: deepseek-v4.1-flash with fallback options
    const configuredModel = process.env.DEEPSEEK_MODEL || 'deepseek-v4.1-flash';
    const CANDIDATE_MODELS = [
      configuredModel,
      ...(configuredModel !== 'deepseek-chat' ? ['deepseek-chat'] : []),
    ];

    const systemInstruction = `You are a specialized deep-reading AI assistant embedded in a PDF book reader.
CRITICAL CONSTRAINT: You are strictly and exclusively scoped to Page ${pageNumber} of ${totalPages || '?'} from the book "${bookTitle}".

RULES:
1. ONLY answer questions, explain concepts, summarize, provide definitions, or extract takeaways using the visible content and text provided for Page ${pageNumber}.
2. DO NOT hallucinate or assume content from prior or subsequent pages. Treat Page ${pageNumber} as the entire universe of available knowledge for this query, augmented only by the conversation history already conducted on this exact page.
3. If the user asks about an event, concept, formula, or character not mentioned or implied on Page ${pageNumber}, politely decline:
   "This concept is not mentioned on Page ${pageNumber}. Please check whether it appears on another page, or ask about what is discussed here."
4. Deliver high-clarity, beautifully formatted responses: use concise paragraphs, bullet points, bold key terms, and quote snippets from the page when relevant. Keep your tone thoughtful, intellectual, calm, and distraction-free.
5. If the user asks for a summary, key takeaways, or deep explanation, provide a thorough, structured breakdown of the ideas present on this single page.`;

    // Format conversation history for OpenAI-compatible DeepSeek chat completions
    const messages: Array<{
      role: 'system' | 'user' | 'assistant';
      content: any;
    }> = [
      {
        role: 'system',
        content: systemInstruction,
      },
    ];

    if (Array.isArray(history) && history.length > 0) {
      for (const turn of history) {
        if (turn.role === 'user') {
          messages.push({
            role: 'user',
            content: turn.content,
          });
        } else if (turn.role === 'assistant' || turn.role === 'model') {
          messages.push({
            role: 'assistant',
            content: turn.content,
          });
        }
      }
    }

    // Build the user prompt with page grounding
    const cleanPageText = (pageText || '').trim();
    let currentTurnContent: any = '';

    if (cleanPageText) {
      currentTurnContent = `[DOCUMENT CONTENT FOR PAGE ${pageNumber}]:\n"""\n${cleanPageText}\n"""\n\n[USER QUESTION ON PAGE ${pageNumber}]:\n${message}`;
    } else if (pageImage) {
      // If page text couldn't be extracted, pass page image or note
      const base64Data = pageImage.startsWith('data:')
        ? pageImage
        : `data:image/png;base64,${pageImage}`;

      // Multimodal payload for DeepSeek-V4.1-Flash
      currentTurnContent = [
        {
          type: 'text',
          text: `[DOCUMENT CONTENT FOR PAGE ${pageNumber} (SCANNED PAGE IMAGE ATTACHED)]\n\n[USER QUESTION ON PAGE ${pageNumber}]:\n${message}`,
        },
        {
          type: 'image_url',
          image_url: {
            url: base64Data,
          },
        },
      ];
    } else {
      currentTurnContent = `[NOTE: The text on Page ${pageNumber} appears empty, blank, or scanned without text content.]\n\n[USER QUESTION]:\n${message}`;
    }

    messages.push({
      role: 'user',
      content: currentTurnContent,
    });

    let lastError: any = null;
    let reply = '';

    // Attempt request with primary model, then fallback if model not recognized
    for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
      const modelToTry = CANDIDATE_MODELS[i];

      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${deepseekApiKey}`,
          },
          body: JSON.stringify({
            model: modelToTry,
            messages,
            temperature: 0.2, // low temperature for high precision grounding
            max_tokens: 4096,
            stream: false,
          }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          const errorText = errorData?.error?.message || (await res.text().catch(() => ''));
          const status = res.status;

          // If the model name is rejected (e.g. 404 or 400 invalid model) and we have a fallback, try fallback
          if ((status === 404 || status === 400) && i < CANDIDATE_MODELS.length - 1) {
            console.warn(`Model ${modelToTry} returned status ${status}, trying ${CANDIDATE_MODELS[i + 1]}...`);
            continue;
          }

          throw new Error(
            errorData?.error?.message ||
              `DeepSeek API error (${status}): ${errorText || res.statusText}`
          );
        }

        const data = await res.json();
        reply =
          data?.choices?.[0]?.message?.content?.trim() ||
          'No response content generated by DeepSeek model.';
        break; // Success
      } catch (err: any) {
        lastError = err;
        if (i < CANDIDATE_MODELS.length - 1) {
          continue;
        }
        throw err;
      }
    }

    if (!reply && lastError) {
      throw lastError;
    }

    return NextResponse.json({
      reply,
      pageNumber,
    });
  } catch (error: any) {
    console.error('Error generating DeepSeek response:', error);
    const errMsg = error?.message || '';
    const isRateLimited = errMsg.includes('429') || errMsg.includes('rate limit');
    const isAuthError = errMsg.includes('401') || errMsg.includes('Authentication') || errMsg.includes('API key');

    let userFriendlyMessage = errMsg || 'Failed to generate response from DeepSeek API';
    if (isAuthError) {
      userFriendlyMessage =
        'Invalid or unauthorized DeepSeek API Key. Please verify your DEEPSEEK_API_KEY environment variable.';
    } else if (isRateLimited) {
      userFriendlyMessage =
        'DeepSeek API rate limit reached. Please wait a moment and click "Retry question".';
    }

    return NextResponse.json(
      {
        error: userFriendlyMessage,
        reply: `*(DeepSeek Note: ${userFriendlyMessage})*`,
      },
      { status: isRateLimited ? 429 : isAuthError ? 401 : 500 }
    );
  }
}
