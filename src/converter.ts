export type InlineMathMode = 'strict' | 'balanced' | 'aggressive';
export type AutoPasteMode = 'off' | 'detected' | 'always';

export interface FormatterSettings {
  autoPasteMode: AutoPasteMode;
  inlineMathMode: InlineMathMode;
  convertExplicitLatexDelimiters: boolean;
  repairMalformedDisplayMath: boolean;
  normalizeMathEscapes: boolean;
  repairObviousBrokenRelations: boolean;
  cleanEmptyEmphasis: boolean;
  showNotices: boolean;
}

export interface ConversionStats {
  explicitInlineMath: number;
  explicitDisplayMath: number;
  malformedDisplayMath: number;
  heuristicInlineMath: number;
  normalizedMathEscapes: number;
  cleanedArtifacts: number;
}

export interface ConversionResult {
  output: string;
  changed: boolean;
  score: number;
  stats: ConversionStats;
}

export const DEFAULT_SETTINGS: FormatterSettings = {
  autoPasteMode: 'detected',
  inlineMathMode: 'balanced',
  convertExplicitLatexDelimiters: true,
  repairMalformedDisplayMath: true,
  normalizeMathEscapes: true,
  repairObviousBrokenRelations: true,
  cleanEmptyEmphasis: false,
  showNotices: true,
};

const EMPTY_STATS = (): ConversionStats => ({
  explicitInlineMath: 0,
  explicitDisplayMath: 0,
  malformedDisplayMath: 0,
  heuristicInlineMath: 0,
  normalizedMathEscapes: 0,
  cleanedArtifacts: 0,
});

interface Segment {
  code: boolean;
  text: string;
}

interface MathOpen {
  kind: 'explicit' | 'malformed';
  first: string;
  headingArtifact: boolean;
}

interface MathClose {
  punctuation: string;
}

export function detectChatGPTMathCopy(text: string): number {
  let score = 0;
  if (/\\\([\s\S]*?\\\)/.test(text)) score += 2;
  if (/\\\[[\s\S]*?\\\]/.test(text)) score += 2;
  if (/^#{1,6}\s+\[/m.test(text)) score += 5;
  if (/(^|\n)\s*\[\s*\n[\s\S]*?\n\s*\]\s*(?=\n|$)/.test(text)) score += 4;

  const escapedUnderscores = text.match(/\\_/g)?.length ?? 0;
  if (escapedUnderscores >= 2) score += 2;
  else if (escapedUnderscores === 1) score += 1;

  const latexTokens = text.match(/\\(?:frac|sum|prod|int|log|boxed|operatorname|mathbf|mathcal|begin|end|sqrt|partial|nabla|mid|approx|mathrm)\b/g)?.length ?? 0;
  if (latexTokens >= 3) score += 2;
  else if (latexTokens > 0) score += 1;

  if (/\*\*\s+\*\*/.test(text)) score += 1;
  return score;
}

export function convertChatGPTToObsidian(
  input: string,
  settings: FormatterSettings = DEFAULT_SETTINGS,
): ConversionResult {
  const stats = EMPTY_STATS();
  const score = detectChatGPTMathCopy(input);
  const normalizedInput = input.replace(/\r\n?/g, '\n').replace(/\u200B/g, '');

  const segments = splitFencedCodeBlocks(normalizedInput);
  const output = segments
    .map((segment) => (segment.code ? segment.text : processText(segment.text, settings, stats)))
    .join('');

  return {
    output,
    changed: output !== normalizedInput,
    score,
    stats,
  };
}

function processText(text: string, settings: FormatterSettings, stats: ConversionStats): string {
  let out = text;

  if (settings.cleanEmptyEmphasis) {
    out = out.replace(/\*\*[ \t]+\*\*/g, () => {
      stats.cleanedArtifacts += 1;
      return ' ';
    });
  }

  if (settings.convertExplicitLatexDelimiters) {
    out = convertExplicitSameLineMath(out, settings, stats);
  }

  if (settings.repairMalformedDisplayMath || settings.convertExplicitLatexDelimiters) {
    out = convertDisplayBlocks(out, settings, stats);
  }

  out = transformOutsideInlineCode(out, (chunk) => convertHeuristicInlineMath(chunk, settings, stats));
  return out;
}

function splitFencedCodeBlocks(text: string): Segment[] {
  const rawLines = text.match(/[^\n]*(?:\n|$)/g)?.filter((line) => line.length > 0) ?? [];
  const segments: Segment[] = [];
  let buffer = '';
  let inFence = false;
  let fenceChar = '';
  let fenceLength = 0;

  const flush = (code: boolean) => {
    if (!buffer) return;
    segments.push({ code, text: buffer });
    buffer = '';
  };

  for (const rawLine of rawLines) {
    const line = rawLine.endsWith('\n') ? rawLine.slice(0, -1) : rawLine;
    const match = line.match(/^\s*(`{3,}|~{3,})/);

    if (!inFence && match) {
      flush(false);
      inFence = true;
      fenceChar = match[1][0];
      fenceLength = match[1].length;
      buffer += rawLine;
      continue;
    }

    if (inFence) {
      buffer += rawLine;
      const closeRegex = new RegExp(`^\\s*${escapeRegExp(fenceChar)}{${fenceLength},}\\s*$`);
      if (closeRegex.test(line)) {
        flush(true);
        inFence = false;
        fenceChar = '';
        fenceLength = 0;
      }
      continue;
    }

    buffer += rawLine;
  }

  flush(inFence);
  return mergeAdjacentSegments(segments);
}

function mergeAdjacentSegments(segments: Segment[]): Segment[] {
  const merged: Segment[] = [];
  for (const segment of segments) {
    const prev = merged[merged.length - 1];
    if (prev && prev.code === segment.code) prev.text += segment.text;
    else merged.push({ ...segment });
  }
  return merged;
}

function convertExplicitSameLineMath(
  text: string,
  settings: FormatterSettings,
  stats: ConversionStats,
): string {
  return transformOutsideInlineCode(text, (chunk) => {
    let out = chunk.replace(/\\\((.+?)\\\)/gs, (_match, inner: string) => {
      stats.explicitInlineMath += 1;
      return `$${normalizeMath(inner.trim(), settings, stats)}$`;
    });

    out = out.replace(/\\\[([^\n]*?)\\\]/g, (_match, inner: string) => {
      stats.explicitDisplayMath += 1;
      return `$$\n${normalizeMath(inner.trim(), settings, stats)}\n$$`;
    });
    return out;
  });
}

function convertDisplayBlocks(
  text: string,
  settings: FormatterSettings,
  stats: ConversionStats,
): string {
  const lines = text.split('\n');
  const out: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const open = parseMathOpen(lines[i]);
    if (!open) {
      out.push(lines[i]);
      continue;
    }

    if (open.kind === 'malformed' && !settings.repairMalformedDisplayMath) {
      out.push(lines[i]);
      continue;
    }
    if (open.kind === 'explicit' && !settings.convertExplicitLatexDelimiters) {
      out.push(lines[i]);
      continue;
    }

    const body: string[] = [];
    if (open.first.trim()) body.push(open.first);

    let close: MathClose | null = null;
    let closeIndex = -1;
    for (let j = i + 1; j < lines.length; j += 1) {
      const candidate = parseMathClose(lines[j], open.kind);
      if (candidate) {
        close = candidate;
        closeIndex = j;
        break;
      }
      body.push(lines[j]);
    }

    if (!close || closeIndex < 0) {
      out.push(lines[i]);
      continue;
    }

    if (open.kind === 'malformed' && !looksLikeDisplayMath(body)) {
      out.push(lines[i]);
      continue;
    }

    const cleaned = cleanDisplayBody(body, open, settings, stats);
    out.push('$$');
    out.push(...cleaned);
    out.push(`$$${close.punctuation}`);

    if (open.kind === 'explicit') stats.explicitDisplayMath += 1;
    else stats.malformedDisplayMath += 1;
    i = closeIndex;
  }

  return out.join('\n');
}

function parseMathOpen(line: string): MathOpen | null {
  let match = line.match(/^\s*\\\[\s*(.*)$/);
  if (match) return { kind: 'explicit', first: match[1], headingArtifact: false };

  match = line.match(/^\s*#{1,6}\s+\[\s*(.*)$/);
  if (match) return { kind: 'malformed', first: match[1], headingArtifact: true };

  match = line.match(/^\s*\[\s*$/);
  if (match) return { kind: 'malformed', first: '', headingArtifact: false };

  return null;
}

function parseMathClose(line: string, kind: MathOpen['kind']): MathClose | null {
  const explicit = line.match(/^\s*\\\]\s*([.,;:!?，。；：！？]?)\s*$/);
  if (explicit) return { punctuation: explicit[1] ?? '' };
  if (kind === 'malformed') {
    const malformed = line.match(/^\s*\]\s*([.,;:!?，。；：！？]?)\s*$/);
    if (malformed) return { punctuation: malformed[1] ?? '' };
  }
  return null;
}

function looksLikeDisplayMath(lines: string[]): boolean {
  const body = lines.join('\n').trim();
  if (!body) return false;

  let score = 0;
  if (/\\[A-Za-z]+/.test(body)) score += 2;
  if (/\\_/.test(body) || /[_^]/.test(body)) score += 1;
  if (/[=<>]/.test(body)) score += 1;
  if (/\\(?:frac|sum|int|boxed|operatorname|begin|end|log|sqrt)\b/.test(body)) score += 2;
  if (/^[\s\S]{0,120}$/.test(body) && /[A-Za-z][A-Za-z0-9_{}'\\]*\([^\n]*\)/.test(body)) score += 1;

  return score >= 2;
}

function cleanDisplayBody(
  lines: string[],
  open: MathOpen,
  settings: FormatterSettings,
  stats: ConversionStats,
): string[] {
  const cleaned: string[] = [];
  const hadHeading: boolean[] = [];

  for (const rawLine of lines) {
    let line = rawLine;
    let heading = false;

    if (open.kind === 'malformed') {
      const match = line.match(/^\s*#{1,6}\s+(.+)$/);
      if (match) {
        heading = true;
        line = match[1];
        stats.cleanedArtifacts += 1;
      }
    }

    line = normalizeMath(line.trim(), settings, stats);
    if (line.length === 0) continue;
    cleaned.push(line);
    hadHeading.push(heading);
  }

  if (settings.repairObviousBrokenRelations && open.headingArtifact && cleaned.length >= 2) {
    if (isLikelyLeftHandSide(cleaned[0]) && isLikelyRightHandSide(cleaned[1])) {
      cleaned[0] = `${cleaned[0]} =`;
      stats.cleanedArtifacts += 1;
    } else if (/^\\boxed\{\s*.+/.test(cleaned[0]) && !/[=<>]/.test(cleaned[0]) && isLikelyRightHandSide(cleaned[1])) {
      cleaned[0] = `${cleaned[0]} =`;
      stats.cleanedArtifacts += 1;
    }
  }

  // A heading marker inside a copied math block often denotes another visual line.
  // Keep the line, but do not invent relation operators beyond the obvious first LHS/RHS case.
  void hadHeading;
  return cleaned.length > 0 ? cleaned : [''];
}

function isLikelyLeftHandSide(line: string): boolean {
  if (/[=<>]|\\(?:approx|equiv|propto|leq|geq|to)\b/.test(line)) return false;
  if (/^\\(?:boxed|begin|left|frac|sum|int|prod)\b/.test(line)) return false;
  if (/[{[]\s*$/.test(line)) return false;
  return /^(?:\\(?:log|mathcal|operatorname)\s*)?[A-Za-z][A-Za-z0-9_{}'\\]*(?:\([^)]*\))?$/.test(line.trim());
}

function isLikelyRightHandSide(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^[}\]]/.test(t)) return false;
  return /^(?:[-+]?\\|[-+]?\d|[-+]?[A-Za-z]|\[|\(|\{)/.test(t);
}

function normalizeMath(text: string, settings: FormatterSettings, stats: ConversionStats): string {
  if (!settings.normalizeMathEscapes) return text;

  return text.replace(/\\([_+=-])/g, (_match, char: string) => {
    stats.normalizedMathEscapes += 1;
    return char;
  });
}

function transformOutsideInlineCode(text: string, transform: (chunk: string) => string): string {
  const out: string[] = [];
  let start = 0;
  let i = 0;

  while (i < text.length) {
    if (text[i] !== '`') {
      i += 1;
      continue;
    }

    let ticks = 1;
    while (text[i + ticks] === '`') ticks += 1;
    const delimiter = '`'.repeat(ticks);
    const close = text.indexOf(delimiter, i + ticks);
    if (close < 0) break;

    if (i > start) out.push(transform(text.slice(start, i)));
    out.push(text.slice(i, close + ticks));
    i = close + ticks;
    start = i;
  }

  if (start < text.length) out.push(transform(text.slice(start)));
  return out.join('');
}

function convertHeuristicInlineMath(
  text: string,
  settings: FormatterSettings,
  stats: ConversionStats,
): string {
  if (settings.inlineMathMode === 'strict') {
    return convertPlainParens(text, settings, stats, false);
  }
  return convertPlainParens(text, settings, stats, true);
}

function convertPlainParens(
  text: string,
  settings: FormatterSettings,
  stats: ConversionStats,
  allowContextualVariables: boolean,
): string {
  let out = '';
  let lastEmit = 0;
  let depth = 0;
  let start = -1;
  let inInlineMath = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (ch === '$' && text[i - 1] !== '\\') {
      if (text[i + 1] === '$') {
        const close = text.indexOf('$$', i + 2);
        if (close >= 0) i = close + 1;
        continue;
      }
      inInlineMath = !inInlineMath;
      continue;
    }
    if (inInlineMath) continue;

    if (ch === '(') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === ')' && depth > 0) {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        const inner = text.slice(start + 1, i).trim();
        const before = text.slice(Math.max(0, start - 80), start);
        const after = text.slice(i + 1, Math.min(text.length, i + 81));
        if (shouldConvertParens(inner, before, after, settings.inlineMathMode, allowContextualVariables)) {
          const normalized = normalizeMath(inner, settings, stats);
          out += text.slice(lastEmit, start) + `$${normalized}$`;
          lastEmit = i + 1;
          stats.heuristicInlineMath += 1;
        }
        start = -1;
      }
    }
  }

  if (lastEmit === 0) return text;
  out += text.slice(lastEmit);
  return out;
}

function shouldConvertParens(
  inner: string,
  before: string,
  after: string,
  mode: InlineMathMode,
  allowContextualVariables: boolean,
): boolean {
  if (!inner || inner.length > 240) return false;
  if (/\s{2,}/.test(inner) && !/\\[A-Za-z]+/.test(inner)) return false;
  if (/https?:\/\//i.test(inner)) return false;
  if (before.endsWith(']')) return false; // Markdown link destination.
  if (/^[0-9]+$/.test(inner)) return false; // List/section markers.

  const wordCount = inner.match(/[A-Za-z]{2,}/g)?.length ?? 0;
  if (wordCount > 5 && !/\\[A-Za-z]+/.test(inner)) return false;

  const hardMath =
    /\\[A-Za-z]+/.test(inner) ||
    /\\_/.test(inner) ||
    /[_^]/.test(inner) ||
    /[=<>]/.test(inner) ||
    /(?:^|\s)[A-Za-z0-9)}\]]\s*[+\-*/]\s*[A-Za-z0-9({[]/.test(inner);
  if (hardMath) return true;

  const nestedFunction = /^[A-Za-z][A-Za-z0-9_{}'\\]*\([^()]*\)$/.test(inner);
  if (nestedFunction) return true;

  const simpleFunction = /^[A-Za-z][A-Za-z0-9_{}'\\]*$/.test(inner);
  const beforeTrimmed = before.replace(/\s+$/, '');
  const afterTrimmed = after.replace(/^\s+/, '');
  const cjkBefore = /[\u3400-\u9FFF，。；：、]$/.test(beforeTrimmed);
  const proseAfter = /^[\u3400-\u9FFF，。；：、]|^(?:是|为|的|中|表示|就是|对应)/.test(afterTrimmed);

  if (allowContextualVariables && simpleFunction && (cjkBefore || proseAfter)) return true;
  if (mode === 'aggressive' && simpleFunction && inner.length <= 12) return true;

  return false;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
