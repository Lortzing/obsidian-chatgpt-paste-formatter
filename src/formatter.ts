import {
  convertChatGPTToObsidian as convertCore,
  DEFAULT_SETTINGS,
  detectChatGPTMathCopy,
  type ConversionResult,
  type FormatterSettings,
} from './converter';

export { DEFAULT_SETTINGS, detectChatGPTMathCopy };
export type { FormatterSettings };

/**
 * Public formatting pipeline used by the plugin.
 *
 * ChatGPT clipboard text can occasionally lose the backslashes from display
 * math delimiters, turning `\[` / `\]` into standalone `[` / `]` lines. The
 * core converter intentionally treats those blocks conservatively to avoid
 * rewriting ordinary Markdown. This normalization step restores the explicit
 * delimiters only when the body is unambiguously math-like.
 */
export function convertChatGPTToObsidian(
  input: string,
  settings: FormatterSettings = DEFAULT_SETTINGS,
): ConversionResult {
  const normalizedInput = input.replace(/\r\n?/g, '\n').replace(/\u200B/g, '');
  const recoveredInput = recoverBareDisplayMath(normalizedInput);
  const result = convertCore(recoveredInput, settings);

  return {
    ...result,
    changed: result.output !== normalizedInput,
  };
}

export function recoverBareDisplayMath(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let inFence = false;
  let fenceChar = '';
  let fenceLength = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fence = line.match(/^\s*(`{3,}|~{3,})/);

    if (inFence) {
      out.push(line);
      if (fence && fence[1][0] === fenceChar && fence[1].length >= fenceLength) {
        inFence = false;
        fenceChar = '';
        fenceLength = 0;
      }
      continue;
    }

    if (fence) {
      inFence = true;
      fenceChar = fence[1][0];
      fenceLength = fence[1].length;
      out.push(line);
      continue;
    }

    const open = line.match(/^(\s*)\[\s*$/);
    if (!open) {
      out.push(line);
      continue;
    }

    let closeIndex = -1;
    let punctuation = '';
    for (let j = i + 1; j < lines.length; j += 1) {
      if (/^\s*(`{3,}|~{3,})/.test(lines[j])) break;
      const close = lines[j].match(/^\s*\]\s*([.,;:!?，。；：！？]?)\s*$/);
      if (close) {
        closeIndex = j;
        punctuation = close[1] ?? '';
        break;
      }
    }

    if (closeIndex < 0) {
      out.push(line);
      continue;
    }

    const body = lines.slice(i + 1, closeIndex);
    if (!looksLikeClearlyMath(body)) {
      out.push(line);
      continue;
    }

    const indent = open[1];
    out.push(`${indent}\\[`);
    out.push(...body);
    out.push(`${indent}\\]${punctuation}`);
    i = closeIndex;
  }

  return out.join('\n');
}

function looksLikeClearlyMath(lines: string[]): boolean {
  const body = lines.join('\n').trim();
  if (!body || body.length > 2000) return false;

  // Superscripts/subscripts are strong evidence even without a LaTeX command.
  // Covers copied blocks such as `e^{100}`, `x^2`, `a_{ij}`, etc.
  if (/(?:\^|_)(?:\{[^{}\n]+\}|[A-Za-z0-9]+)/.test(body)) return true;

  // Equations whose left side is a compact symbolic expression.
  // Covers `U-m=[-2,-1,0]` while rejecting prose such as `This is a note`.
  if (/^[A-Za-z][A-Za-z0-9_{}^'\\]*(?:\s*[+\-*/]\s*[A-Za-z0-9_{}^'\\]+)*\s*[=<>]\s*\S[\s\S]*$/.test(body)) {
    return true;
  }

  // Compact arithmetic expressions such as `x+y`, `a-b`, or `2+2`.
  const atom = String.raw`(?:[A-Za-z](?:[_^](?:\{[^{}\n]+\}|[A-Za-z0-9]+))?|\d+(?:\.\d+)?)`;
  const arithmetic = new RegExp(`^[-+]?${atom}(?:\\s*[+\\-*/]\\s*${atom})+[.,]?$`);
  if (arithmetic.test(body)) return true;

  return false;
}
