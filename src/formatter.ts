import {
  convertChatGPTToObsidian as convertCore,
  DEFAULT_SETTINGS,
  detectChatGPTMathCopy,
  looksLikeDisplayMath,
  type ConversionResult,
  type FormatterSettings,
} from './converter';

export { DEFAULT_SETTINGS, detectChatGPTMathCopy };
export type { FormatterSettings };

export function convertChatGPTToObsidian(
  input: string,
  settings: FormatterSettings = DEFAULT_SETTINGS,
): ConversionResult {
  const normalizedInput = input.replace(/\r\n?/g, '\n').replace(/\u200B/g, '');
  const recoveredInput = settings.repairMalformedDisplayMath
    ? recoverBareDisplayMath(normalizedInput)
    : normalizedInput;
  const result = convertCore(recoveredInput, settings);
  return { ...result, changed: result.output !== normalizedInput };
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
    if (!looksLikeDisplayMath(body)) {
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
