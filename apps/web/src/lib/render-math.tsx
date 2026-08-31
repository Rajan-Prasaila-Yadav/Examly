// apps/web/src/lib/render-math.tsx
import React from 'react';
import katex from 'katex';

/**
 * Clean & normalize raw math/HTML text
 */
function cleanRawMathText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/?(p|div|span)[^>]*>/gi, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\\&/g, '&');
}

/**
 * Universal KaTeX Mathematical & Chemical Formula Renderer
 * Parses:
 *  - $$...$$ (Display block math)
 *  - \[...\] (Display block math)
 *  - $...$   (Inline math)
 *  - \(...\) (Inline math)
 *  - Auto-detected LaTeX math commands (\frac, \sqrt, etc.)
 *  - Normal text & line breaks
 */
export function renderMath(text: string | null | undefined): React.ReactNode {
  if (!text || typeof text !== 'string') return null;

  try {
    const cleanedText = cleanRawMathText(text);

    // Regex splits by $$...$$, \[...\], $...$, \(...\)
    const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\$\n]+?\$|\\\([\s\S]+?\\\))/g;
    const parts = cleanedText.split(regex);

    return parts.map((part, idx) => {
      if (!part) return null;

      let formula = '';
      let displayMode = false;

      if (part.startsWith('$$') && part.endsWith('$$') && part.length >= 4) {
        formula = part.slice(2, -2).trim();
        displayMode = true;
      } else if (part.startsWith('\\[') && part.endsWith('\\]') && part.length >= 4) {
        formula = part.slice(2, -2).trim();
        displayMode = true;
      } else if (part.startsWith('$') && part.endsWith('$') && part.length >= 2) {
        formula = part.slice(1, -1).trim();
        displayMode = false;
      } else if (part.startsWith('\\(') && part.endsWith('\\)') && part.length >= 4) {
        formula = part.slice(2, -2).trim();
        displayMode = false;
      } else {
        // Check if plain text contains LaTeX commands like \frac, \sqrt, \cdot, \text, \approx, \pm
        if (/\\(?:frac|sqrt|cdot|times|approx|pm|sum|int|text|rightarrow|le|ge|neq|equiv|alpha|beta|gamma|Delta|theta|mu|pi)\b/.test(part)) {
          formula = part.trim();
          displayMode = false;
        } else {
          // Plain text with line breaks preserved
          return (
            <span key={idx} className="whitespace-pre-wrap">
              {part}
            </span>
          );
        }
      }

      try {
        // Clean any accidental dangling double dollar signs or escaped dollars inside formula
        const safeFormula = formula.replace(/^\$+|\$+$/g, '').trim();

        const html = katex.renderToString(safeFormula, {
          throwOnError: false,
          displayMode,
          output: 'htmlAndMathml',
          trust: true,
          strict: false,
        });

        return (
          <span
            key={idx}
            dangerouslySetInnerHTML={{ __html: html }}
            className={
              displayMode
                ? 'block my-2.5 text-center overflow-x-auto max-w-full py-1 scrollbar-thin'
                : 'inline-block px-0.5 align-middle max-w-full overflow-x-auto'
            }
          />
        );
      } catch (err) {
        return (
          <span key={idx} className="font-serif tracking-wide text-slate-800 dark:text-slate-200">
            {part.replace(/^\$+|\$+$/g, '')}
          </span>
        );
      }
    });
  } catch (e) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }
}
