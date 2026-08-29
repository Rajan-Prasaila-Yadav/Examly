// Gemini-powered question parsing from raw text, PDF, or images.
// Extracts and reformats the author's material — never invents extra questions.
import { Injectable, BadRequestException } from '@nestjs/common';
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

const SYSTEM_PROMPT = `You are an expert examination question parser for Physics, Chemistry, Biology, and Mathematics.

The user will provide source material: pasted text (often with broken LaTeX/Unicode), PDF pages, and/or photos of questions.

Your job:
1. Identify ONLY the questions that appear in the source. Do NOT invent, rewrite the meaning of, or add extra questions.
2. For each source question, fill: statement, options, correct option(s), hint, short explanation, step-by-step solution.
3. Repair broken math into KaTeX-compatible LaTeX ($inline$ and $$display$$). Convert Unicode symbols (√, ², →, ⇌, θ, Δ) to LaTeX.
4. Strip option labels like (A) / A. from option bodies.
5. If the source marks a correct answer, use it. If it does not, still extract the options and set isCorrect false on all of them (do not guess).
6. Hint / explanation / solution must belong to THAT same question, not a different problem.

Return ONLY a JSON array (no markdown fences) of:
[
  {
    "questionType": "SINGLE_CORRECT",
    "contentHtml": "question with $LaTeX$",
    "options": [
      { "optionLabel": "A", "contentHtml": "text", "isCorrect": true },
      { "optionLabel": "B", "contentHtml": "text", "isCorrect": false }
    ],
    "hint": "...",
    "shortExplanation": "...",
    "stepByStepSolution": "Step 1: ..."
  }
]

questionType must be one of: SINGLE_CORRECT, MULTIPLE_CORRECT, NUMERICAL, FILL_BLANK, ASSERTION_REASON, MATRIX_MATCH, TRUE_FALSE, DESCRIPTIVE.
If there are no questions in the source, return [].`;

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
  constructor(private readonly config: ConfigService) {}

  async parseQuestionsFromText(rawText: string): Promise<ParsedQuestion[]> {
    return this.parse({ rawText, files: [] });
  }

  async parse(input: {
    rawText?: string;
    files?: { buffer: Buffer; mimetype: string; originalname?: string }[];
  }): Promise<ParsedQuestion[]> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new BadRequestException(
        'GEMINI_API_KEY is not configured. Add it to the repo root .env file and restart the API.',
      );
    }

    const rawText = (input.rawText || '').trim();
    const files = (input.files || []).filter((f) => f?.buffer?.length);
    if (!rawText && files.length === 0) {
      throw new BadRequestException('Paste question text or upload a PDF / images.');
    }

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
      const clean = configuredModel.replace(/^models\//, '');
      modelsToTry.push(clean);
    }

    // 1. Discover available models dynamically from Google Gemini API
    try {
      const listResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      if (listResp.ok) {
        const listData = await listResp.json();
        const available: string[] = (listData.models || [])
          .filter((m: any) => {
            const name = (m.name || '').toLowerCase();
            const isSupported = m.supportedGenerationMethods?.includes('generateContent');
            // Exclude specialized models that have 0 free-tier text quota
            const isSpecialized =
              name.includes('-tts') ||
              name.includes('embedding') ||
              name.includes('imagen') ||
              name.includes('aqa') ||
              name.includes('bison') ||
              name.includes('gecko') ||
              name.includes('realtime');
            return isSupported && !isSpecialized;
          })
          .map((m: any) => m.name.replace(/^models\//, ''));

        if (available.length > 0) {
          // Sort with preference for standard text models
          const priority = [
            'gemini-2.5-flash',
            'gemini-2.5-pro',
            'gemini-2.0-flash',
            'gemini-1.5-flash',
            'gemini-1.5-pro',
          ];
          available.sort((a, b) => {
            const ai = priority.findIndex((p) => a === p || a.startsWith(`${p}-`));
            const bi = priority.findIndex((p) => b === p || b.startsWith(`${p}-`));
            if (ai !== -1 && bi !== -1) return ai - bi;
            if (ai !== -1) return -1;
            if (bi !== -1) return 1;
            return 0;
          });
          modelsToTry = Array.from(new Set([...modelsToTry, ...available]));
        }
      }
    } catch {
      // If list fails, fall back to known models
    }

    // Default candidates if discovery returns empty
    const fallbackCandidates = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash-002',
      'gemini-1.5-pro-002',
      'gemini-1.5-flash-001',
      'gemini-1.5-pro-001',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
    ];
    modelsToTry = Array.from(new Set([...modelsToTry, ...fallbackCandidates]));

    const apiVersions = ['v1beta', 'v1'];
    let lastError: Error | null = null;

    for (const apiVer of apiVersions) {
      for (const model of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/${apiVer}/models/${model}:generateContent?key=${apiKey}`;
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
            if (response.status === 403) {
              throw new BadRequestException(
                `Google Gemini API 403 (Permission Denied): The Google Cloud project for this API key does not have Generative Language API access enabled. Please generate a new free API key at https://aistudio.google.com/app/apikey and paste it into your .env file as GEMINI_API_KEY.`,
              );
            }
            // If 404 or 429 quota exhausted on this specific model, try the next model
            if (response.status === 404 || response.status === 429) {
              lastError = new BadRequestException(`Gemini model ${model} unavailable (${response.status}): ${errorBody}`);
              continue;
            }
            throw new BadRequestException(`Gemini API error (${response.status}): ${errorBody}`);
          }

          const result = await response.json();
          const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            throw new BadRequestException(
              'Gemini returned an empty response. Try clearer text, or fewer pages/images.',
            );
          }

          const parsed = this.parseJsonArray(text);
          return parsed.map((q, idx) => this.sanitize(q, idx));
        } catch (error: any) {
          if (
            error instanceof BadRequestException &&
            (error.message.includes('404') || error.message.includes('429') || error.message.includes('unavailable'))
          ) {
            lastError = error;
            continue;
          }
          if (error instanceof BadRequestException) throw error;
          lastError = error;
        }
      }
    }

    // Try OpenAI fallback if OPENAI_API_KEY is configured
    const openAiKey = this.config.get<string>('OPENAI_API_KEY');
    if (openAiKey && openAiKey !== 'your_openai_api_key_here') {
      try {
        return await this.parseWithOpenAi(rawText, openAiKey);
      } catch (err: any) {
        throw new BadRequestException(`OpenAI fallback also failed: ${err.message}`);
      }
    }

    throw (
      lastError ||
      new BadRequestException(
        'AI question parsing failed across candidate models. Please check your GEMINI_API_KEY at https://aistudio.google.com/app/apikey.',
      )
    );
  }

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
    } catch {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) return parsed;
      }
    }
    throw new BadRequestException('Failed to parse Gemini response as JSON. Please try again.');
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
