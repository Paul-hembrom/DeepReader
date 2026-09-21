import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { formatTextbookPageText } from '@/lib/preetiConverter';

// Ensure optimal runtime configuration for Vercel and Node.js environments
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max timeout for AI generation

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

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
  if (devanagariCount >= 5 || (devanagariCount > 0 && devanagariCount >= latinCount * 0.08)) {
    return 'nepali';
  }

  if (latinCount > 10) {
    return 'english';
  }

  return 'auto';
}

/**
 * DeepSeek & Gemini Student Reader AI API Route
 * - Solves textbook exercises, examples, questions (Abhyas/Exercise 1.1, Q3 ka/kha/a/b)
 * - Explains specific subtopics and sections (e.g. Review 1.0, Matter 2.1, 2.2)
 * - Converts legacy Preeti font text to pure Devanagari Unicode
 * - Uses DeepSeek models (with reasoning_content extraction) and Gemini 3.8 Flash fallback
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
      pageText = '',
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

    // Convert any Preeti font characters to clean Devanagari Unicode
    const { unicodeText } = formatTextbookPageText(pageText);
    const cleanPageText = (unicodeText || pageText || '').trim();
    const detectedLanguage = detectTextbookLanguage(cleanPageText, bookTitle);

    // Build the language enforcement directive
    let languageMandate = '';
    if (detectedLanguage === 'nepali') {
      languageMandate = `### ABSOLUTE LANGUAGE DIRECTIVE (NEPALI TEXTBOOK - नेपाली पाठ्यपुस्तक):
The uploaded textbook for Page ${pageNumber} is in NEPALI (नेपाली भाषा / देवनागरी लिपि).
REGARDLESS OF THE LANGUAGE THE STUDENT USES TO ASK (English, Romanized Nepali / Nepglish, or Nepali):
YOU MUST GENERATE 100% OF YOUR RESPONSE EXCLUSIVELY IN NEPALI (नेपाली भाषा):
1. Even if the student asks in English (e.g., "simplify the Review 1.0 in details explanation", "solve exercise 1.1 question 3 ka" or "explain subtopic 2.2"):
   - Your entire response MUST BE IN FLUENT NEPALI (देवनागरी लिपि).
   - Headings, step-by-step explanations, working out, formulas, definitions, and conclusions must all be in Nepali.
   - Do NOT respond in English.
2. Cross-Lingual Terminology Mapping:
   - "Review 1.0" -> "१.० पुनरवलोकन (Review)"
   - "Exercise" or "Abhyas" -> "अभ्यास"
   - "Question" or "Prashna" -> "प्रश्न" / "प्र.नं."
   - "Ka" / "(a)" -> "(क)"
   - "Kha" / "(b)" -> "(ख)"
   - "Ga" / "(c)" -> "(ग)"
   - "Gha" / "(d)" -> "(घ)"
   - "Example" / "Udaharan" -> "उदाहरण"
   - Sets and variables: keep as A, B, C, D, E, U or (क), (ख)
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

    const systemInstruction = `You are an expert student tutor and deep-reading AI assistant embedded in an interactive PDF textbook reader.
CRITICAL SCOPE CONSTRAINT: You are strictly and exclusively scoped to Page ${pageNumber} of ${totalPages || '?'} from the textbook "${bookTitle}".

${languageMandate}

STUDENT LEARNING & PROBLEM-SOLVING DIRECTIVES:

1. SUBTOPIC & SECTION EXPLANATION (उपशीर्षक तथा पुनरवलोकन / खण्डको विस्तृत व्याख्या):
   - When a student asks about a specific subtopic, review section, or heading on this page (e.g., "simplify the Review 1.0 in details explanation", "Review 1.0", "1.1 अलग्गिएका र खप्टिएका समूह", "Matter 2.1"):
     a. Identify the exact section, definitions, given sets, examples, and discussion questions on Page ${pageNumber}.
     b. Provide a comprehensive, easy-to-understand breakdown for students:
        - **शीर्षक र मुख्य परिचय (Title & Overview)**: What this section covers.
        - **विस्तृत तथा सरल व्याख्या (Detailed Concept Breakdown)**: Explain each point, rule, or set definition on the page in simple language.
        - **समूह वा उदाहरणहरूको सूचीकरण तथा विश्लेषण (Detailed Set/Item Breakdown)**: If sets or examples like A = {रूढ सङ्ख्याहरू}, B = {बिजोर सङ्ख्याहरू}, C = {3 का अपवर्त्यहरू}, D = {8 का गुणनखण्डहरू}, E = {संयुक्त सङ्ख्याहरू}, U = {10 सम्मका गन्तीका सङ्ख्याहरू} appear, explicitly list each member element:
          * U = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
          * A = {2, 3, 5, 7} (रूढ सङ्ख्याहरू)
          * B = {1, 3, 5, 7, 9} (बिजोर सङ्ख्याहरू)
          * C = {3, 6, 9} (3 का अपवर्त्यहरू)
          * D = {1, 2, 4, 8} (8 का गुणनखण्डहरू)
          * E = {4, 6, 8, 9, 10} (संयुक्त सङ्ख्याहरू)
        - **छलफलका प्रश्नहरूको उत्तर (Discussion Questions Answered)**: Provide clear, complete answers to the questions asked on the page.
        - **निष्कर्ष र परीक्षा उपयोगी बुँदा (Key Student Summary)**: 2-3 takeaway bullet points.

2. EXERCISE & QUESTION SOLVING (अभ्यास तथा प्रश्न समाधान):
   - When a student asks for help with an exercise, problem, or sub-question (e.g., "Abhyas 1.1 question 3 ka", "Exercise 2.1 Q4"):
     a. Locate the question on Page ${pageNumber}.
     b. Provide a clean, step-by-step pedagogical solution:
        - **प्रश्न (Question Statement)**
        - **दिइएको कुरा (Given Data)**
        - **प्रयोग हुने सूत्र / विधि (Formula / Method)**
        - **चरणबद्ध समाधान (Step-by-Step Working)**
        - **अन्तिम उत्तर (Final Answer)**

3. PAGE GROUNDING:
   - Base your answer on the content and problems on Page ${pageNumber}.
   - Format with bold headings, clean bullet points, and well-spaced mathematics.`;

    const langNotice =
      detectedLanguage === 'nepali'
        ? '[MANDATORY: TEXTBOOK IS IN NEPALI. GENERATE THE ENTIRE RESPONSE 100% IN NEPALI (देवनागरी लिपि)]'
        : detectedLanguage === 'english'
        ? '[MANDATORY: TEXTBOOK IS IN ENGLISH. GENERATE THE ENTIRE RESPONSE 100% IN ENGLISH]'
        : '[MANDATORY: MATCH THE LANGUAGE OF THE SOURCE TEXTBOOK]';

    const userPromptText = `${langNotice}\n\n[TEXTBOOK PAGE CONTENT FOR PAGE ${pageNumber}]:\n"""\n${cleanPageText || '(Image rendered on page canvas)'}\n"""\n\n[STUDENT QUERY ON PAGE ${pageNumber}]:\n${message}`;

    let reply = '';
    let modelUsed = '';

    // ==========================================
    // 1. ATTEMPT DEEPSEEK API (IF KEY AVAILABLE)
    // ==========================================
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    if (deepseekApiKey) {
      const baseUrl = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com')
        .trim()
        .replace(/\/+$/, '');

      const configuredModel = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
      const CANDIDATE_MODELS = Array.from(
        new Set([
          configuredModel,
          'deepseek-chat',
          'deepseek-reasoner',
          'deepseek-v4.1-flash',
          'deepseek-flash',
        ])
      );

      const deepseekMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        {
          role: 'system',
          content: systemInstruction,
        },
      ];

      if (Array.isArray(history) && history.length > 0) {
        for (const turn of history.slice(-6)) {
          if (turn.role === 'user') {
            deepseekMessages.push({ role: 'user', content: String(turn.content) });
          } else if (turn.role === 'assistant' || turn.role === 'model') {
            deepseekMessages.push({ role: 'assistant', content: String(turn.content) });
          }
        }
      }

      deepseekMessages.push({
        role: 'user',
        content: userPromptText,
      });

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
              messages: deepseekMessages,
              temperature: 0.2,
              max_tokens: 4096,
              stream: false,
            }),
          });

          if (!res.ok) {
            const status = res.status;
            // If model is not found on this endpoint, try next candidate
            if ((status === 404 || status === 400) && i < CANDIDATE_MODELS.length - 1) {
              continue;
            }
            break;
          }

          const data = await res.json();
          const choice = data?.choices?.[0]?.message;
          const content = choice?.content?.trim() || '';
          const reasoning = choice?.reasoning_content?.trim() || '';

          // Prefer content; if empty (reasoner finished in thinking), use reasoning
          const responseText = content || reasoning;
          if (responseText) {
            reply = responseText;
            modelUsed = `DeepSeek (${modelToTry})`;
            break;
          }
        } catch (deepseekErr) {
          console.warn(`DeepSeek error for model ${modelToTry}:`, deepseekErr);
          if (i < CANDIDATE_MODELS.length - 1) continue;
        }
      }
    }

    // ==========================================
    // 2. RESILIENT FALLBACK TO GEMINI FLASH
    // ==========================================
    if (!reply) {
      const gemini = getGeminiClient();
      if (gemini) {
        try {
          const parts: any[] = [];

          // If high-resolution page canvas snapshot exists, attach it for visual verification
          if (pageImage && typeof pageImage === 'string') {
            const matches = pageImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              parts.push({
                inlineData: {
                  mimeType: matches[1],
                  data: matches[2],
                },
              });
            }
          }

          parts.push({ text: userPromptText });

          const geminiResult = await gemini.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: parts,
            config: {
              systemInstruction,
              temperature: 0.2,
            },
          });

          if (geminiResult.text) {
            reply = geminiResult.text.trim();
            modelUsed = 'Gemini 3.8 Flash';
          }
        } catch (geminiErr: any) {
          console.error('Gemini fallback error:', geminiErr);
        }
      }
    }

    // If still no reply and no API keys configured
    if (!reply) {
      return NextResponse.json(
        {
          error:
            'Unable to generate response. Please verify DEEPSEEK_API_KEY or GEMINI_API_KEY in your settings.',
          reply:
            '*(Unable to contact AI models. Please ensure your API credentials are configured in Settings > Secrets.)*',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reply,
      pageNumber,
      detectedLanguage,
      modelUsed,
    });
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    const errMsg = error?.message || 'Failed to generate response';

    return NextResponse.json(
      {
        error: errMsg,
        reply: `*(Error: ${errMsg})*`,
      },
      { status: 500 }
    );
  }
}
