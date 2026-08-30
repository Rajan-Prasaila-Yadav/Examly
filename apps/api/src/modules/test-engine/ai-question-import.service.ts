// apps/api/src/modules/test-engine/ai-question-import.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ParsedQuestion {
  questionType: string;
  contentHtml: string;
  options: { optionLabel: string; contentHtml: string; isCorrect: boolean }[];
  hint?: string;
  shortExplanation?: string;
  stepByStepSolution?: string;
  marksPositive?: number;
  marksNegative?: number;
}

const SYSTEM_PROMPT = `You are an expert examination question extractor and LaTeX KaTeX formatter for Physics, Chemistry, Mathematics, and Biology.

The user will provide source material: pasted raw text (which may have broken OCR, garbled math symbols, fractured fractions), PDF pages, and/or scanned photos of question papers.

YOUR INSTRUCTIONS:
1. Extract ALL questions that appear in the source material accurately. Do NOT invent, hallucinate, or generate extra questions not present in the input.
2. For each question, output:
   - "questionType": SINGLE_CORRECT, MULTIPLE_CORRECT, NUMERICAL, FILL_BLANK, ASSERTION_REASON, MATRIX_MATCH, TRUE_FALSE, or DESCRIPTIVE.
   - "contentHtml": The full question statement with all mathematical, chemical, and physical formulas converted into clean KaTeX LaTeX syntax ($inline$ and $$display$$).
   - "options": Array of choices [{ "optionLabel": "A", "contentHtml": "...", "isCorrect": boolean }]. Strip leading "(A)", "A.", "(1)" prefixes from option bodies.
   - "hint": A brief helpful hint for the student.
   - "shortExplanation": A 1-2 sentence core conceptual explanation.
   - "stepByStepSolution": A complete, numbered step-by-step mathematical or conceptual derivation.

3. MATHEMATICAL & CHEMICAL FORMULA REPAIR:
   - Repair broken OCR equations into standard KaTeX LaTeX:
     * Fractions: convert "a/b" or "(x+y)/(z)" to "$\\frac{x+y}{z}$".
     * Square roots & Exponents: convert "sqrt(x)", "x^2", "e^(-kt)" to "$\\sqrt{x}$", "$x^2$", "$e^{-kt}$".
     * Chemical formulas: convert "H2SO4", "KMnO4", "C6H12O6" to "$\\text{H}_2\\text{SO}_4$", "$\\text{KMnO}_4$", "$\\text{C}_6\\text{H}_{12}\\text{O}_6$".
     * Symbols & Arrows: convert "->", "<=>", "deg", "theta", "alpha", "lambda", "omega", "mu", "pi" to "$\\rightarrow$", "$\\rightleftharpoons$", "$^\\circ$", "$\\theta$", "$\\alpha$", "$\\lambda$", "$\\omega$", "$\\mu$", "$\\pi$".
     * Vectors & Calculus: "vec(F)", "int", "d/dx", "lim" to "$\\vec{F}$", "$\\int$", "$\\frac{d}{dx}$", "$\\lim$".

4. RETURN FORMAT:
Return ONLY a valid JSON array matching this structure (no markdown fences, no conversational prose):
[
  {
    "questionType": "SINGLE_CORRECT",
    "contentHtml": "A particle moves along the x-axis according to $x(t) = 3t^2 - 4t + 5$. What is its instantaneous velocity at $t = 2\\text{ s}$?",
    "options": [
      { "optionLabel": "A", "contentHtml": "$8\\text{ m/s}$", "isCorrect": true },
      { "optionLabel": "B", "contentHtml": "$12\\text{ m/s}$", "isCorrect": false },
      { "optionLabel": "C", "contentHtml": "$6\\text{ m/s}$", "isCorrect": false },
      { "optionLabel": "D", "contentHtml": "$16\\text{ m/s}$", "isCorrect": false }
    ],
    "hint": "Differentiate the position function $x(t)$ with respect to time to find velocity $v(t)$.",
    "shortExplanation": "Velocity is the derivative of position: $v(t) = \\frac{dx}{dt} = 6t - 4$. At $t=2$, $v(2) = 12 - 4 = 8\\text{ m/s}$.",
    "stepByStepSolution": "Step 1: Given position $x(t) = 3t^2 - 4t + 5$\\nStep 2: Differentiate with respect to $t$: $v(t) = \\frac{d}{dt}(3t^2 - 4t + 5) = 6t - 4$\\nStep 3: Substitute $t = 2\\text{ s}$: $v(2) = 6(2) - 4 = 12 - 4 = 8\\text{ m/s}$."
  }
]`;

const GROQ_SYSTEM_PROMPT = `You are an examination question parser. Extract questions from source material into a strict JSON array:
[
  {
    "questionType": "SINGLE_CORRECT",
    "contentHtml": "Question statement with $inline$ or $$display$$ KaTeX LaTeX formulas",
    "options": [
      { "optionLabel": "A", "contentHtml": "Option text or formula", "isCorrect": true },
      { "optionLabel": "B", "contentHtml": "Option text or formula", "isCorrect": false }
    ],
    "hint": "Brief hint",
    "shortExplanation": "Core concept",
    "stepByStepSolution": "Step 1: ...\\nStep 2: ..."
  }
]
Repair broken OCR math into KaTeX ($frac{a}{b}$, $x^2$, $sqrt{x}$, $text{H}_2text{SO}_4$). Types: SINGLE_CORRECT, MULTIPLE_CORRECT, NUMERICAL, TRUE_FALSE. Return ONLY valid JSON array without backticks or prose.`;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
]);

@Injectable()
export class AiQuestionImportService {
  private readonly logger = new Logger(AiQuestionImportService.name);

  constructor(private readonly config: ConfigService) {}

  async parseQuestionsFromText(rawText: string): Promise<ParsedQuestion[]> {
    return this.parse({ rawText, files: [] });
  }

  async parse(input: {
    rawText?: string;
    files?: { buffer: Buffer; mimetype: string; originalname?: string }[];
  }): Promise<ParsedQuestion[]> {
    const rawText = (input.rawText || '').trim();
    const files = (input.files || []).filter((f) => f?.buffer?.length);

    if (!rawText && files.length === 0) {
      throw new BadRequestException('Please paste question text or upload an image/PDF.');
    }

    const geminiKey = this.config.get<string>('GEMINI_API_KEY');
    const groqKey =
      this.config.get<string>('GROQ_API_KEY') ||
      this.config.get<string>('GROK_API_KEY') ||
      this.config.get<string>('XAI_API_KEY');
    const openAiKey = this.config.get<string>('OPENAI_API_KEY');

    const hasGemini = geminiKey && geminiKey !== 'your_gemini_api_key_here';
    const hasGroq = groqKey && groqKey !== 'your_groq_api_key_here';
    const hasOpenAi = openAiKey && openAiKey !== 'your_openai_api_key_here';

    if (!hasGemini && !hasGroq && !hasOpenAi) {
      throw new BadRequestException(
        'No AI API Key is configured. Please add GEMINI_API_KEY or GROQ_API_KEY to your .env file and restart.',
      );
    }

    const preferredProvider = (this.config.get<string>('AI_PROVIDER') || '').toLowerCase();
    const isGroqPreferred = preferredProvider === 'groq' || (!hasGemini && hasGroq);

    let lastError: any = null;

    // ── If Groq is preferred or Gemini is not available ──
    if (isGroqPreferred && hasGroq) {
      try {
        this.logger.log('🚀 Executing question extraction with Groq AI LPU Engine...');
        const result = await this.parseWithGroq(rawText, files, groqKey!);
        if (result && result.length > 0) return result;
      } catch (groqErr: any) {
        this.logger.warn(`Groq AI notice (${groqErr.message}). Attempting fallback to Gemini...`);
        lastError = groqErr;
      }
    }

    // ── Try Gemini ──
    if (hasGemini) {
      try {
        this.logger.log('Attempting question extraction with Google Gemini...');
        const result = await this.parseWithGemini(rawText, files, geminiKey!);
        if (result && result.length > 0) return result;
      } catch (geminiErr: any) {
        this.logger.warn(`Gemini notice (${geminiErr.message}). Switching to fallback AI provider...`);
        lastError = geminiErr;
      }
    }

    // ── Secondary Groq Fallback (if Gemini was attempted first) ──
    if (!isGroqPreferred && hasGroq) {
      try {
        this.logger.log('🚀 Executing question extraction with Groq AI LPU Engine (Fallback)...');
        const result = await this.parseWithGroq(rawText, files, groqKey!);
        if (result && result.length > 0) return result;
      } catch (groqErr: any) {
        this.logger.warn(`Groq AI fallback notice (${groqErr.message}).`);
        lastError = groqErr;
      }
    }

    // ── Tertiary OpenAI Fallback ──
    if (hasOpenAi && rawText) {
      try {
        this.logger.log('Executing question extraction with OpenAI fallback...');
        const result = await this.parseWithOpenAi(rawText, openAiKey!);
        if (result && result.length > 0) return result;
      } catch (openAiErr: any) {
        this.logger.error('OpenAI fallback failed', openAiErr);
        lastError = openAiErr;
      }
    }

    throw (
      lastError ||
      new BadRequestException(
        'Failed to parse questions across configured AI providers (Gemini/Groq). Please verify your API keys and try again.',
      )
    );
  }

  // ──────────────────────────────────────────
  // ── GROQ AI ENGINE (LPU High-Speed Multi-Modal & Text) ──
  // ──────────────────────────────────────────
  private async parseWithGroq(
    rawText: string,
    files: { buffer: Buffer; mimetype: string; originalname?: string }[],
    apiKey: string,
  ): Promise<ParsedQuestion[]> {
    const hasImages = files.some((f) => (f.mimetype || '').startsWith('image/'));

    // Separate vision models from text models
    const visionModels = ['llama-3.2-11b-vision-preview', 'llama-3.2-90b-vision-preview'];
    const textModels = [
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-120b',
      'qwen/qwen3.6-27b',
      'openai/gpt-oss-20b',
      'groq/compound',
      'groq/compound-mini',
    ];

    let candidateModels: string[];
    if (hasImages && !rawText) {
      candidateModels = visionModels;
    } else {
      candidateModels = Array.from(new Set([...textModels, ...visionModels]));
    }

    // Chunk text into small segments (~1000 chars = ~300 tokens)
    const chunks = this.chunkText(rawText, 1000);
    let lastGroqError: any = null;

    for (const model of candidateModels) {
      try {
        const isVisionModel = visionModels.includes(model);
        const allExtracted: ParsedQuestion[] = [];

        for (const chunk of chunks) {
          if (!chunk.trim() && !hasImages) continue;

          let userContent: any;
          if (isVisionModel && hasImages) {
            const parts: any[] = [];
            if (chunk) {
              parts.push({
                type: 'text',
                text: `RAW SOURCE MATERIAL (Extract all questions, fix broken math into KaTeX LaTeX):\n\n${chunk}`,
              });
            }
            for (const file of files) {
              const mime = (file.mimetype || 'image/jpeg').toLowerCase();
              if (mime.startsWith('image/')) {
                const base64 = file.buffer.toString('base64');
                parts.push({
                  type: 'image_url',
                  image_url: {
                    url: `data:${mime === 'image/jpg' ? 'image/jpeg' : mime};base64,${base64}`,
                  },
                });
              }
            }
            userContent = parts;
          } else {
            userContent = `RAW SOURCE MATERIAL (Extract all questions, fix broken math/equations into KaTeX LaTeX):\n\n${chunk || 'Extract questions from uploaded document'}`;
          }

          try {
            this.logger.log(`Groq LPU Engine: generating chunk with model "${model}"...`);
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                messages: [
                  { role: 'system', content: GROQ_SYSTEM_PROMPT },
                  {
                    role: 'user',
                    content: userContent,
                  },
                ],
                temperature: 0.1,
                max_tokens: 800,
              }),
            });

            if (!response.ok) {
              const errBody = await response.text();
              this.logger.warn(`Groq chunk notice (${response.status}): ${errBody}`);
              continue;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '[]';
            const parsed = this.parseJsonArray(content);
            if (Array.isArray(parsed) && parsed.length > 0) {
              allExtracted.push(...parsed);
            }

            // Brief pacing delay between rapid chunks
            await new Promise((r) => setTimeout(r, 200));
          } catch (chunkErr: any) {
            this.logger.warn(`Groq chunk error: ${chunkErr.message}`);
          }
        }

        if (allExtracted.length > 0) {
          this.logger.log(`✅ Groq AI successfully extracted ${allExtracted.length} total questions using ${model}.`);
          return allExtracted.map((q, idx) => this.sanitize(q, idx));
        }
      } catch (err: any) {
        lastGroqError = err;
      }
    }

    throw lastGroqError || new Error('Groq AI generation failed across candidate models.');
  }

  private chunkText(text: string, maxChunkLen: number = 1000): string[] {
    const trimmed = (text || '').trim();
    if (!trimmed) return [''];
    if (trimmed.length <= maxChunkLen) return [trimmed];

    const chunks: string[] = [];
    let remaining = trimmed;

    while (remaining.length > 0) {
      if (remaining.length <= maxChunkLen) {
        chunks.push(remaining.trim());
        break;
      }

      // Try splitting on question boundary, paragraph, newline, or sentence
      let splitIdx = -1;
      const window = remaining.slice(0, maxChunkLen);

      // Search for question number pattern backwards
      const qMatch = window.match(/(?:^|\n)\s*(?:Q\s*\.?\s*\d+|Question\s*\d+|\(\d+\)|\d+[\.\)])[^\n]*/gi);
      if (qMatch && qMatch.length > 1) {
        const lastQ = qMatch[qMatch.length - 1];
        splitIdx = window.lastIndexOf(lastQ);
      }

      if (splitIdx < 300) {
        splitIdx = window.lastIndexOf('\n\n');
      }
      if (splitIdx < 300) {
        splitIdx = window.lastIndexOf('\n');
      }
      if (splitIdx < 300) {
        splitIdx = window.lastIndexOf('. ');
        if (splitIdx !== -1) splitIdx += 1;
      }
      if (splitIdx < 300) {
        splitIdx = maxChunkLen;
      }

      const piece = remaining.slice(0, splitIdx).trim();
      if (piece) chunks.push(piece);
      remaining = remaining.slice(splitIdx).trim();
    }

    return chunks.length > 0 ? chunks : [trimmed];
  }

  // ──────────────────────────────────────────
  // ── GOOGLE GEMINI ENGINE ──
  // ──────────────────────────────────────────
  private async parseWithGemini(
    rawText: string,
    files: { buffer: Buffer; mimetype: string; originalname?: string }[],
    apiKey: string,
  ): Promise<ParsedQuestion[]> {
    const parts: Array<Record<string, unknown>> = [{ text: SYSTEM_PROMPT }];
    if (rawText) {
      parts.push({
        text: `\n\nSOURCE TEXT (parse these questions only; fix formatting; do not add new items):\n\n${rawText}`,
      });
    }

    for (const file of files) {
      const mime = (file.mimetype || '').toLowerCase();
      if (!ALLOWED_MIME.has(mime)) {
        throw new BadRequestException(
          `Unsupported file type "${file.mimetype}" (${file.originalname || 'upload'}). Use PDF or images (JPG, PNG, WEBP).`,
        );
      }
      parts.push({
        inline_data: {
          mime_type: mime === 'image/jpg' ? 'image/jpeg' : mime,
          data: file.buffer.toString('base64'),
        },
      });
    }

    const configuredModel = this.config.get<string>('GEMINI_MODEL');
    let modelsToTry: string[] = [];

    if (configuredModel) {
      modelsToTry.push(configuredModel.replace(/^models\//, ''));
    }

    const fallbackCandidates = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
    ];
    modelsToTry = Array.from(new Set([...modelsToTry, ...fallbackCandidates]));

    let lastError: any = null;

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 65536,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          lastError = new Error(`Gemini ${model} returned ${response.status}: ${errorBody}`);
          continue;
        }

        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastError = new Error(`Gemini ${model} returned empty candidates.`);
          continue;
        }

        const parsed = this.parseJsonArray(text);
        return parsed.map((q, idx) => this.sanitize(q, idx));
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('Gemini models exhausted.');
  }

  // ──────────────────────────────────────────
  // ── OPENAI FALLBACK ──
  // ──────────────────────────────────────────
  private async parseWithOpenAi(rawText: string, apiKey: string): Promise<ParsedQuestion[]> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Parse these questions:\n\n${rawText}` },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '[]';
    const parsed = this.parseJsonArray(text);
    return parsed.map((q, idx) => this.sanitize(q, idx));
  }

  private parseJsonArray(text: string): ParsedQuestion[] {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.questions)) return parsed.questions;
      if (parsed && Array.isArray(parsed.data)) return parsed.data;
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          // ignore
        }
      }
    }
    throw new BadRequestException('Failed to parse AI response as JSON. Please try again.');
  }

  private sanitize(q: ParsedQuestion, idx: number): ParsedQuestion {
    return {
      questionType: q.questionType || 'SINGLE_CORRECT',
      contentHtml: q.contentHtml || `Question ${idx + 1}`,
      options: (q.options || []).map((opt, oi) => ({
        optionLabel: opt.optionLabel || String.fromCharCode(65 + oi),
        contentHtml: opt.contentHtml || '',
        isCorrect: !!opt.isCorrect,
      })),
      hint: q.hint || undefined,
      shortExplanation: q.shortExplanation || undefined,
      stepByStepSolution: q.stepByStepSolution || undefined,
      marksPositive: q.marksPositive,
      marksNegative: q.marksNegative,
    };
  }
}
