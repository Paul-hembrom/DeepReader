import { NextRequest, NextResponse } from 'next/server';

// Ensure optimal runtime configuration for Vercel and Node.js environments
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max timeout for AI generation on Vercel

/**
 * Detect whether the uploaded textbook content is in Nepali or English.
 * Strictly checks the source book text and title, ignoring user prompt language,
 * so students can ask in any language (English, Nepglish, Nepali) while the output
 * strictly matches the language of the uploaded textbook.
 */
function detectTextbookLanguage(pageText: string, bookTitle: string = ''): 'nepali' | 'english' | 'auto' {
  const combinedBookText = `${bookTitle} ${pageText}`.trim();

  // Count Devanagari Unicode characters (Devanagari block: \u0900-\u097F)
  const devanagariMatches = combinedBookText.match(/[\u0900-\u097F]/g);
  const devanagariCount = devanagariMatches ? devanagariMatches.length : 0;

  // Count Latin/English characters in the source book
  const latinMatches = combinedBookText.match(/[a-zA-Z]/g);
  const latinCount = latinMatches ? latinMatches.length : 0;

  // If the textbook page or title has meaningful Devanagari characters, it is a Nepali textbook
  if (devanagariCount >= 5 || (devanagariCount > 0 && devanagariCount >= latinCount * 0.1)) {
    return 'nepali';
  }

  if (latinCount > 10) {
    return 'english';
  }

  return 'auto';
}

/**
 * DeepSeek Chat Completions API Route
 * Configured with DeepSeek-V4.1-Flash (or DEEPSEEK_MODEL env var)
 * Designed specifically for students and learners:
 * - Solves textbook exercises, examples, questions (Abhyas/Exercise 1.1, Q3 ka/kha/a/b)
 * - Explains specific subtopics and sections (e.g. Matter 2.1, 2.2)
 * - Output language strictly determined by the uploaded book:
 *   Nepali Book -> 100% Nepali output (even if student asks in English/Nepglish)
 *   English Book -> 100% English output
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
    const detectedLanguage = detectTextbookLanguage(cleanPageText, bookTitle);

    // Build the language enforcement directive
    let languageMandate = '';
    if (detectedLanguage === 'nepali') {
      languageMandate = `### ABSOLUTE LANGUAGE DIRECTIVE (NEPALI TEXTBOOK - नेपाली पाठ्यपुस्तक):
The uploaded textbook for Page ${pageNumber} is in NEPALI (नेपाली भाषा / देवनागरी लिपि).
REGARDLESS OF THE LANGUAGE THE STUDENT USES TO ASK (English, Romanized Nepali / Nepglish, or Nepali):
YOU MUST GENERATE 100% OF YOUR RESPONSE EXCLUSIVELY IN NEPALI (नेपाली भाषा):
1. Even if the student asks in English (e.g., "solve exercise 1.1 question 3 ka" or "explain subtopic 2.2"):
   - Your entire response MUST BE IN FLUENT NEPALI (देवनागरी लिपि).
   - Headings, step-by-step explanations, working out, formulas, and conclusions must all be in Nepali.
   - Do NOT respond in English.
2. Cross-Lingual Terminology Mapping:
   - "Exercise" or "Abhyas" -> "अभ्यास"
   - "Question" or "Prashna" -> "प्रश्न" / "प्र.नं."
   - "Ka" / "(a)" -> "(क)"
   - "Kha" / "(b)" -> "(ख)"
   - "Ga" / "(c)" -> "(ग)"
   - "Gha" / "(d)" -> "(घ)"
   - "Example" / "Udaharan" -> "उदाहरण"
   - Numbers (1, 2, 3...) can be written as देवनागरी (१, २, ३...) or standard mathematical numerals when writing formulas.
3. Keep the tone friendly, encouraging, and clear for school and college learners in Nepal.`;
    } else if (detectedLanguage === 'english') {
      languageMandate = `### ABSOLUTE LANGUAGE DIRECTIVE (ENGLISH TEXTBOOK):
The uploaded textbook for Page ${pageNumber} is in ENGLISH.
REGARDLESS OF WHAT LANGUAGE THE STUDENT TYPES IN:
YOU MUST GENERATE 100% OF YOUR RESPONSE EXCLUSIVELY IN ENGLISH:
1. All step-by-step problem solutions, subtopic breakdowns, explanations, summaries, and exam tips must be in clear, academic, student-friendly English.
2. Do not output foreign languages unless the textbook page explicitly discusses foreign language vocabulary.`;
    } else {
      languageMandate = `### ABSOLUTE LANGUAGE DIRECTIVE (MIRROR BOOK LANGUAGE):
Determine the language of the source textbook page (Nepali vs. English).
Generate 100% of your response in the language of the textbook page:
- If the textbook page contains Nepali / Devanagari text, answer 100% in Nepali, even if the student's question is in English or Nepglish.
- If the textbook page contains English text, answer 100% in English.`;
    }

    const systemInstruction = `You are an expert student tutor and deep-reading AI assistant embedded in a PDF textbook reader for students and learners.
CRITICAL SCOPE CONSTRAINT: You are strictly and exclusively scoped to Page ${pageNumber} of ${totalPages || '?'} from the textbook "${bookTitle}".

${languageMandate}

STUDENT LEARNING & PROBLEM-SOLVING DIRECTIVES:

1. EXERCISE & QUESTION SOLVING (अभ्यास तथा प्रश्न समाधान):
   - When a student asks for help with an exercise, example, problem, or sub-question (e.g., "Abhyas 1.1 question 3 ka", "solve 3 of kha", "Exercise 2.1 Q4(b)", "उदाहरण २"):
     a. Locate the exact question and text on Page ${pageNumber}.
     b. Provide a clean, step-by-step pedagogical solution:
        - **प्रश्न (Question Statement)**: Quote the question being solved.
        - **दिइएको कुरा (Given Data / Information)**: List all values, known variables, or conditions.
        - **पत्ता लगाउनुपर्ने (To Find / Objective)**: Clearly state what needs to be calculated or proven.
        - **प्रयोग हुने सूत्र / सिद्धान्त (Formula / Concept / Theorem Used)**: State the formula or rule clearly.
        - **चरणबद्ध समाधान (Step-by-Step Working)**: Solve the problem showing every calculation step clearly so the learner understands every transition.
        - **अन्तिम उत्तर (Final Answer)**: State the final result clearly with correct units (e.g., से.मी., मिटर, वर्ग एकाइ, रु., cm, etc.).
        - **मुख्य सल्लाह / अवधारणा (Key Exam Tip / Note)**: Give a brief 1-2 sentence tip on why this step was taken or how to avoid common mistakes in exams.

2. SUBTOPIC & SECTION EXPLANATION (उपशीर्षक तथा पाठको विस्तृत व्याख्या):
   - When a student asks to explain a specific subtopic, section heading, or numbered topic (e.g., "Matter 2.1", "2.2", "उपशीर्षक २.१", "Section 3.4", "रासायनिक प्रतिक्रिया"):
     a. Zoom in specifically on that subtopic on Page ${pageNumber}.
     b. Provide a structured breakdown:
        - **शीर्षक र परिभाषा (Title & Core Definition)**: Clear, student-friendly definition.
        - **विस्तृत तथा सरल व्याख्या (Detailed Concept Breakdown)**: Explain the idea simply with analogies or examples from the page.
        - **मुख्य विशेषताहरू / बुँदाहरू (Key Points / Characteristics)**: Bullet points of core rules, conditions, or properties.
        - **चित्र वा उदाहरणको व्याख्या (Diagrams, Tables, or Examples)**: If the page includes diagrams, formulas, or charts related to this subtopic, explain what they illustrate.

3. PAGE GROUNDING & TRUTH:
   - ONLY answer based on the actual content, formulas, questions, and explanations visible on Page ${pageNumber}.
   - DO NOT hallucinate questions from other pages. If the requested exercise or subtopic is not on Page ${pageNumber}, politely clarify in the textbook's language:
     - In Nepali: "यो अभ्यास/उपशीर्षक पृष्ठ ${pageNumber} मा फेला परेन। कृपया यो विषय कुन पृष्ठमा छ हेर्नुहोस् वा यस पृष्ठमा भएका अभ्यास र विषयबारे सोध्नुहोस्।"
     - In English: "This exercise or subtopic is not found on Page ${pageNumber}. Please check whether it appears on another page, or ask about what is covered here."

4. FORMATTING & PEDAGOGICAL TONE:
   - Use bold headings, clean bullet points, numbered calculation steps, and highlighted key terms.
   - Maintain an encouraging, intellectual, patient tutor tone that builds student confidence.`;

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

    // Build user prompt with page grounding and explicit textbook language directive
    const langNotice =
      detectedLanguage === 'nepali'
        ? '[MANDATORY: TEXTBOOK IS IN NEPALI. EVEN IF STUDENT ASKS IN ENGLISH OR NEPGLISH, GENERATE THE ENTIRE RESPONSE 100% IN NEPALI (देवनागरी लिपि)]'
        : detectedLanguage === 'english'
        ? '[MANDATORY: TEXTBOOK IS IN ENGLISH. GENERATE THE ENTIRE RESPONSE 100% IN ENGLISH]'
        : '[MANDATORY: MATCH THE LANGUAGE OF THE SOURCE TEXTBOOK (NEPALI OR ENGLISH)]';

    let currentTurnContent: any = '';

    if (cleanPageText) {
      currentTurnContent = `${langNotice}\n\n[TEXTBOOK PAGE CONTENT FOR PAGE ${pageNumber}]:\n"""\n${cleanPageText}\n"""\n\n[STUDENT QUERY ON PAGE ${pageNumber}]:\n${message}`;
    } else if (pageImage) {
      // If page text couldn't be extracted, pass page image
      const base64Data = pageImage.startsWith('data:')
        ? pageImage
        : `data:image/png;base64,${pageImage}`;

      currentTurnContent = [
        {
          type: 'text',
          text: `${langNotice}\n\n[TEXTBOOK PAGE CONTENT FOR PAGE ${pageNumber} (SCANNED PAGE IMAGE)]\n\n[STUDENT QUERY ON PAGE ${pageNumber}]:\n${message}`,
        },
        {
          type: 'image_url',
          image_url: {
            url: base64Data,
          },
        },
      ];
    } else {
      currentTurnContent = `${langNotice}\n\n[NOTE: The text on Page ${pageNumber} appears empty or scanned without extractable text.]\n\n[STUDENT QUERY]:\n${message}`;
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
            temperature: 0.2, // low temperature for high precision grounding and exact math
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
