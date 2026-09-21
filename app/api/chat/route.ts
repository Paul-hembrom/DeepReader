import { NextRequest, NextResponse } from 'next/server';

// Ensure optimal runtime configuration for Vercel and Node.js environments
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max timeout for AI generation on Vercel

/**
 * Detect whether the textbook page content is in Nepali or English.
 * Devanagari script covers Nepali (Unicode block \u0900-\u097F).
 */
function detectTextbookLanguage(text: string, title: string = '', userMessage: string = ''): 'nepali' | 'english' | 'auto' {
  const combinedBookText = `${title} ${text}`.trim();

  // Count Devanagari Unicode characters
  const devanagariMatches = combinedBookText.match(/[\u0900-\u097F]/g);
  const devanagariCount = devanagariMatches ? devanagariMatches.length : 0;

  // Count Latin/English alphabetic characters
  const latinMatches = combinedBookText.match(/[a-zA-Z]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;

  // If the book page text has Devanagari characters, it's a Nepali textbook
  if (devanagariCount > 10 || (devanagariCount > 0 && devanagariCount >= latinCount * 0.15)) {
    return 'nepali';
  }

  // Also check if user message is in Devanagari/Nepali
  const userDevanagari = (userMessage.match(/[\u0900-\u097F]/g) || []).length;
  if (userDevanagari > 5 && devanagariCount > 0) {
    return 'nepali';
  }

  if (latinCount > devanagariCount) {
    return 'english';
  }

  return 'auto';
}

/**
 * DeepSeek Chat Completions API Route
 * Configured with DeepSeek-V4.1-Flash (or DEEPSEEK_MODEL env var)
 * Strictly enforces 100% Nepali output for Nepali textbooks and 100% English for English textbooks.
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

    const cleanPageText = (pageText || '').trim();
    const detectedLanguage = detectTextbookLanguage(cleanPageText, bookTitle, message);

    // Dynamic, ironclad language instructions based on textbook content
    let languageMandate = '';
    if (detectedLanguage === 'nepali') {
      languageMandate = `### ABSOLUTE LANGUAGE DIRECTIVE (NEPALI - नेपाली):
The textbook / source document for Page ${pageNumber} is in NEPALI (नेपाली / देवनागरी लिपि).
YOU MUST STRICTLY AND UNCONDITIONALLY GENERATE EVERYTHING 100% IN NEPALI (नेपाली भाषा):
1. All page summaries must be completely in fluent, natural Nepali (नेपालीमा स्पष्ट सारांश).
2. All explanations, breakdowns, key takeaways, and bullet points must be 100% in Nepali (नेपालीमा विस्तृत व्याख्या र मुख्य बुँदाहरू).
3. All definitions of terms, vocabulary notes, and answers to questions must be exclusively in Nepali.
4. Even if the user submits a question or prompt in English, your entire response, headings, analysis, and conclusions MUST BE GENERATED ENTIRELY IN NEPALI.
5. DO NOT mix or answer in English. Use standard, respectful, grammatically accurate Nepali with Devanagari script.`;
    } else if (detectedLanguage === 'english') {
      languageMandate = `### ABSOLUTE LANGUAGE DIRECTIVE (ENGLISH):
The textbook / source document for Page ${pageNumber} is in ENGLISH.
YOU MUST STRICTLY AND UNCONDITIONALLY GENERATE EVERYTHING 100% IN ENGLISH:
1. All page summaries, key takeaways, explanations, simplified analogies, definitions, and answers must be completely in clear, natural English.
2. DO NOT switch or translate to any other language unless the user specifically and explicitly requests a translation.`;
    } else {
      languageMandate = `### ABSOLUTE LANGUAGE DIRECTIVE (STRICT SOURCE MATCHING):
- If the provided textbook page or image content is in NEPALI (नेपाली / देवनागरी लिपि): You MUST generate EVERYTHING ENTIRELY in Nepali (all summaries, explanations, takeaways, vocabulary, and answers in fluent Nepali).
- If the provided textbook page or image content is in ENGLISH: You MUST generate EVERYTHING ENTIRELY in English.
- Always strictly mirror and match the language of the provided book page. Never output English for a Nepali textbook, and never output foreign languages for an English textbook.`;
    }

    const systemInstruction = `You are a specialized deep-reading AI assistant embedded in a PDF textbook reader.
CRITICAL SCOPE CONSTRAINT: You are strictly and exclusively scoped to Page ${pageNumber} of ${totalPages || '?'} from the book "${bookTitle}".

${languageMandate}

CORE GROUNDING RULES:
1. STRICT LANGUAGE MATCHING: Mirror the textbook page language without exception (Nepali $\\rightarrow$ Nepali only; English $\\rightarrow$ English only).
2. ONLY answer questions, explain concepts, summarize, provide definitions, or extract takeaways using the visible content and text provided for Page ${pageNumber}.
3. DO NOT hallucinate or assume content from prior or subsequent pages. Treat Page ${pageNumber} as the entire universe of available knowledge for this query, augmented only by the conversation history already conducted on this exact page.
4. If the user asks about an event, concept, formula, or character not mentioned or implied on Page ${pageNumber}, politely decline in the matching language:
   - If Nepali: "यो अवधारणा वा विषय पृष्ठ ${pageNumber} मा उल्लेख गरिएको छैन। कृपया अर्को पृष्ठ हेर्नुहोस् वा यस पृष्ठमा भएका विषयवस्तुबारे सोध्नुहोस्।"
   - If English: "This concept is not mentioned on Page ${pageNumber}. Please check whether it appears on another page, or ask about what is discussed here."
5. Deliver high-clarity, beautifully structured responses: use concise paragraphs, bullet points, bold key terms, and quote snippets from the page when relevant. Keep your tone thoughtful, intellectual, calm, and distraction-free.
6. When requested to summarize, explain, or list key takeaways, provide a thorough, structured breakdown of the ideas present on this single page in the required language.`;

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

    // Build the user prompt with page grounding and explicit language tag
    const langNotice =
      detectedLanguage === 'nepali'
        ? '[MANDATORY: SOURCE TEXT IS IN NEPALI. RESPOND 100% IN NEPALI (नेपाली भाषा / देवनागरी लिपि)]'
        : detectedLanguage === 'english'
        ? '[MANDATORY: SOURCE TEXT IS IN ENGLISH. RESPOND 100% IN ENGLISH]'
        : '[MANDATORY: MATCH THE LANGUAGE OF THE SOURCE TEXTBOOK (NEPALI OR ENGLISH)]';

    let currentTurnContent: any = '';

    if (cleanPageText) {
      currentTurnContent = `${langNotice}\n\n[DOCUMENT CONTENT FOR PAGE ${pageNumber}]:\n"""\n${cleanPageText}\n"""\n\n[USER QUESTION ON PAGE ${pageNumber}]:\n${message}`;
    } else if (pageImage) {
      // If page text couldn't be extracted, pass page image
      const base64Data = pageImage.startsWith('data:')
        ? pageImage
        : `data:image/png;base64,${pageImage}`;

      // Multimodal payload for DeepSeek-V4.1-Flash
      currentTurnContent = [
        {
          type: 'text',
          text: `${langNotice}\n\n[DOCUMENT CONTENT FOR PAGE ${pageNumber} (SCANNED PAGE IMAGE ATTACHED)]\n\n[USER QUESTION ON PAGE ${pageNumber}]:\n${message}`,
        },
        {
          type: 'image_url',
          image_url: {
            url: base64Data,
          },
        },
      ];
    } else {
      currentTurnContent = `${langNotice}\n\n[NOTE: The text on Page ${pageNumber} appears empty, blank, or scanned without text content.]\n\n[USER QUESTION]:\n${message}`;
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
      detectedLanguage,
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
