// apps/web/src/lib/render-math.tsx
import React from 'react';
import katex from 'katex';

/**
 * Universal KaTeX Mathematical & Chemical Formula Renderer
 * Parses:
 *  - $$...$$ (Display block math)
 *  - \[...\] (Display block math)
 *  - $...$   (Inline math)
 *  - \(...\) (Inline math)
 *  - Normal text & line breaks
 */
export function renderMath(text: string | null | undefined): React.ReactNode {
  if (!text || typeof text !== 'string') return null;

  try {
    // Regex splits by $$...$$, \[...\], $...$, \(...\)
    const regex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\$\n]+?\$|\\\([\s\S]+?\\\))/g;
    const parts = text.split(regex);

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
        // Plain text with line breaks preserved
        return (
          <span key={idx} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      }

      try {
        const html = katex.renderToString(formula, {
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
            className={displayMode ? 'block my-3 text-center overflow-x-auto py-1' : 'inline-block px-0.5 align-middle'}
          />
        );
      } catch (err) {
        return (
          <span key={idx} className="font-mono text-rose-500 bg-rose-50 px-1 py-0.5 rounded text-[11px]">
            {part}
          </span>
        );
      }
    });
  } catch (e) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }
}
