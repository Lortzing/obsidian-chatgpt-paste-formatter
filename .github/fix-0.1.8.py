from pathlib import Path

# 1) Replace regex-based adjacent display merging with a delimiter-aware line parser.
converter_path = Path('src/converter.ts')
converter = converter_path.read_text()
start = converter.index('function mergeAdjacentDisplayMathBlocks')
end = converter.index('function looksLikeMathContinuation', start)
new_merge = r'''interface RenderedDisplayMathBlock {
  end: number;
  body: string;
  punctuation: string;
}

function readRenderedDisplayMathBlock(lines: string[], start: number): RenderedDisplayMathBlock | null {
  if (lines[start]?.trim() !== '$$') return null;

  for (let i = start + 1; i < lines.length; i += 1) {
    const close = lines[i].match(/^\s*\$\$([.,;:!?，。；：！？]?)\s*$/);
    if (!close) continue;
    return {
      end: i,
      body: lines.slice(start + 1, i).join('\n'),
      punctuation: close[1] ?? '',
    };
  }

  return null;
}

function mergeAdjacentDisplayMathBlocks(text: string, stats: ConversionStats): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const first = readRenderedDisplayMathBlock(lines, i);
    if (!first) {
      out.push(lines[i]);
      i += 1;
      continue;
    }

    let mergedBody = first.body;
    let lastBody = first.body;
    let punctuation = first.punctuation;
    let end = first.end;
    let merged = false;

    while (!punctuation) {
      let nextStart = end + 1;
      while (nextStart < lines.length && lines[nextStart].trim() === '') nextStart += 1;

      const next = readRenderedDisplayMathBlock(lines, nextStart);
      if (!next) break;
      if (!looksLikeMathContinuation(next.body) && !endsWithMathContinuation(lastBody)) break;

      mergedBody = mergeDisplayBodiesWithLineBreak(mergedBody, next.body);
      lastBody = next.body;
      punctuation = next.punctuation;
      end = next.end;
      merged = true;
      stats.mergedDisplayMath += 1;
    }

    if (merged) {
      out.push('$$');
      out.push(...mergedBody.split('\n'));
      out.push(`$$${punctuation}`);
      i = end + 1;
      continue;
    }

    out.push(...lines.slice(i, first.end + 1));
    i = first.end + 1;
  }

  return out.join('\n');
}

function mergeDisplayBodiesWithLineBreak(firstBody: string, secondBody: string): string {
  const first = firstBody.trim();
  const second = secondBody.trim();
  const gathered = first.match(/^\\begin\{gathered\}\n([\s\S]*?)\n\\end\{gathered\}$/);

  if (gathered) {
    return `\\begin{gathered}\n${gathered[1].trimEnd()}\n\\\\\n${second}\n\\end{gathered}`;
  }

  return `\\begin{gathered}\n${first}\n\\\\\n${second}\n\\end{gathered}`;
}

'''
converter = converter[:start] + new_merge + converter[end:]

# Protect explicit LaTeX delimiters from heuristic parenthesis conversion when their conversion setting is off.
old_state = """  let depth = 0;\n  let start = -1;\n  let inInlineMath = false;\n\n  for (let i = 0; i < text.length; i += 1) {\n    const ch = text[i];\n\n    if (ch === '$' && text[i - 1] !== '\\\\') {\n"""
new_state = """  let depth = 0;\n  let start = -1;\n  let inInlineMath = false;\n  let explicitDelimiterClose: ')' | ']' | null = null;\n\n  for (let i = 0; i < text.length; i += 1) {\n    const ch = text[i];\n\n    if (explicitDelimiterClose) {\n      if (ch === '\\\\' && text[i + 1] === explicitDelimiterClose) {\n        explicitDelimiterClose = null;\n        i += 1;\n      }\n      continue;\n    }\n\n    if (ch === '\\\\' && (text[i + 1] === '(' || text[i + 1] === '[')) {\n      explicitDelimiterClose = text[i + 1] === '(' ? ')' : ']';\n      i += 1;\n      continue;\n    }\n\n    if (ch === '$' && text[i - 1] !== '\\\\') {\n"""
if old_state not in converter:
    raise SystemExit('convertPlainParens state marker not found')
converter = converter.replace(old_state, new_state, 1)
converter_path.write_text(converter)

# 2) Make the malformed-display setting actually gate the bare-block pre-recovery layer.
formatter_path = Path('src/formatter.ts')
formatter = formatter_path.read_text()
old_recovery = "  const recoveredInput = recoverBareDisplayMath(normalizedInput);\n"
new_recovery = "  const recoveredInput = settings.repairMalformedDisplayMath\n    ? recoverBareDisplayMath(normalizedInput)\n    : normalizedInput;\n"
if old_recovery not in formatter:
    raise SystemExit('formatter recovery marker not found')
formatter_path.write_text(formatter.replace(old_recovery, new_recovery, 1))

# 3) Expand permanent converter coverage, including a full mixed prose/math document fixture.
test_path = Path('scripts/test-converter.mjs')
tests = test_path.read_text()
old_import = "import { mkdtemp, rm } from 'node:fs/promises';"
new_import = "import { mkdtemp, readFile, rm } from 'node:fs/promises';"
if old_import not in tests:
    raise SystemExit('test import marker not found')
tests = tests.replace(old_import, new_import, 1)

marker = "  console.log('All converter tests passed.');"
if marker not in tests:
    raise SystemExit('test insertion marker not found')

extra_tests = r'''
  // Adjacent display merging must never search across ordinary prose for a later pair of $$ delimiters.
  {
    const input = String.raw`[
a=1
]

ordinary prose between formulas

[
=2
]

[
=3
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.match(out, /^\$\$\na=1\n\$\$/);
    assert.match(out, /\$\$\n\nbordinary prose between formulas/); // replaced below to avoid accidental broad matching
    assert.equal((out.match(/\\begin\{gathered\}/g) ?? []).length, 1);
    const gatheredStart = out.indexOf('\\begin{gathered}');
    const gatheredEnd = out.indexOf('\\end{gathered}', gatheredStart);
    const gathered = out.slice(gatheredStart, gatheredEnd + '\\end{gathered}'.length);
    assert.equal(gathered, String.raw`\begin{gathered}
=2
\\
=3
\end{gathered}`);
    assert.ok(!gathered.includes('ordinary prose'));
  }

  // Settings should be behaviorally meaningful, not just UI toggles.
  {
    const malformed = '[\nx+1\n]';
    assert.equal(
      convertChatGPTToObsidian(malformed, { ...DEFAULT_SETTINGS, repairMalformedDisplayMath: false }).output,
      malformed,
    );

    const explicit = String.raw`keep \(x+1\) here
\[
y=2
\]`;
    assert.equal(
      convertChatGPTToObsidian(explicit, { ...DEFAULT_SETTINGS, convertExplicitLatexDelimiters: false }).output,
      explicit,
    );

    const escaped = String.raw`[
x\_1\+y
]`;
    assert.equal(
      convertChatGPTToObsidian(escaped, { ...DEFAULT_SETTINGS, normalizeMathEscapes: false }).output,
      String.raw`$$
x\_1\+y
$$`,
    );

    const relation = String.raw`# [ P(r\mid x)

\frac{e^x}{Z}
]`;
    assert.equal(
      convertChatGPTToObsidian(relation, { ...DEFAULT_SETTINGS, repairObviousBrokenRelations: false }).output,
      String.raw`$$
P(r\mid x)
\frac{e^x}{Z}
$$`,
    );

    assert.equal(
      convertChatGPTToObsidian('a ** ** b', { ...DEFAULT_SETTINGS, cleanEmptyEmphasis: false }).output,
      'a ** ** b',
    );
    assert.equal(
      convertChatGPTToObsidian('a ** ** b', { ...DEFAULT_SETTINGS, cleanEmptyEmphasis: true }).output,
      'a   b',
    );
  }

  // Inline-math modes have distinct precision/recall behavior.
  {
    const strict = convertChatGPTToObsidian('变量 (x)，表达式 (x^2)。', {
      ...DEFAULT_SETTINGS,
      inlineMathMode: 'strict',
    }).output;
    assert.equal(strict, '变量 (x)，表达式 $x^2$。');

    const balanced = convertChatGPTToObsidian('变量 (x)。', {
      ...DEFAULT_SETTINGS,
      inlineMathMode: 'balanced',
    }).output;
    assert.equal(balanced, '变量 $x$。');

    const balancedEnglish = convertChatGPTToObsidian('value (x) here', {
      ...DEFAULT_SETTINGS,
      inlineMathMode: 'balanced',
    }).output;
    assert.equal(balancedEnglish, 'value (x) here');

    const aggressive = convertChatGPTToObsidian('value (x) here', {
      ...DEFAULT_SETTINGS,
      inlineMathMode: 'aggressive',
    }).output;
    assert.equal(aggressive, 'value $x$ here');
  }

  // Full-document regression copied from a real long ChatGPT response.
  {
    const input = await readFile('tests/fixtures/rmsprop-logsumexp-long.md', 'utf8');
    const out = convertChatGPTToObsidian(input).output;

    assert.ok(out.includes(String.raw`你这里本质上是 RMSProp：

$$
S_W=\beta S_W+(1-\beta)g_W^2
$$

然后

$$
W_{t+1}
=
W_t-r\frac{g_W}{\sqrt{S_W+\epsilon}}
$$`));

    const gatheredStarts = [...out.matchAll(/\\begin\{gathered\}/g)].map((match) => match.index ?? -1);
    assert.equal(gatheredStarts.length, 1, 'Only the genuinely adjacent logsumexp continuation should use gathered');
    const gatheredStart = gatheredStarts[0];
    const gatheredEnd = out.indexOf('\\end{gathered}', gatheredStart);
    assert.ok(gatheredEnd > gatheredStart);
    const gathered = out.slice(gatheredStart, gatheredEnd + '\\end{gathered}'.length);
    assert.equal(gathered, String.raw`\begin{gathered}
=\log(2.718+7.389+20.086)
\\
=\log(30.193)
\approx3.4076.
\end{gathered}`);
    assert.ok(out.indexOf('数值大约：') < gatheredStart);
    assert.ok(out.indexOf('然后') < gatheredStart);
    assert.ok(!gathered.includes('RMSProp'));
    assert.ok(!gathered.includes('然后'));
  }

'''
# Fix the small no-cross-prose assertion before insertion.
extra_tests = extra_tests.replace("assert.match(out, /\\$\\$\\n\\nbordinary prose between formulas/); // replaced below to avoid accidental broad matching\n", "assert.ok(out.includes('$$\\n\\nordinary prose between formulas\\n\\n$$'));\n")
tests = tests.replace(marker, extra_tests + marker, 1)
test_path.write_text(tests)
