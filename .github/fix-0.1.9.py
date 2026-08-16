from pathlib import Path

converter_path = Path('src/converter.ts')
converter = converter_path.read_text()

old_return = """  // A heading marker inside a copied math block often denotes another visual line.\n  // Keep the line, but do not invent relation operators beyond the obvious first LHS/RHS case.\n  void hadHeading;\n  return cleaned.length > 0 ? cleaned : [''];\n}\n\nfunction isLikelyLeftHandSide(line: string): boolean {\n"""
new_return = r'''  // A heading marker inside a copied math block often denotes another visual line.
  // Keep the line, but do not invent relation operators beyond the obvious first LHS/RHS case.
  void hadHeading;
  const repairedRows = repairBrokenEnvironmentRowBreaks(cleaned, stats);
  return repairedRows.length > 0 ? repairedRows : [''];
}

const ROW_BREAK_ENVIRONMENTS = new Set([
  'matrix',
  'matrix*',
  'smallmatrix',
  'pmatrix',
  'bmatrix',
  'Bmatrix',
  'vmatrix',
  'Vmatrix',
  'cases',
  'dcases',
  'rcases',
  'aligned',
  'alignedat',
  'gathered',
  'array',
  'split',
]);

function repairBrokenEnvironmentRowBreaks(lines: string[], stats: ConversionStats): string[] {
  const environmentStack: string[] = [];
  const repaired: string[] = [];

  for (const sourceLine of lines) {
    const activeBefore = environmentStack.some((environment) => ROW_BREAK_ENVIRONMENTS.has(environment));
    const beginOnLine = [...sourceLine.matchAll(/\\begin\{([^{}]+)\}/g)]
      .some((match) => ROW_BREAK_ENVIRONMENTS.has(match[1]));
    const insideRowEnvironment = activeBefore || beginOnLine;
    const closesRowEnvironment = [...sourceLine.matchAll(/\\end\{([^{}]+)\}/g)]
      .some((match) => ROW_BREAK_ENVIRONMENTS.has(match[1]));

    let line = sourceLine;
    if (insideRowEnvironment && !closesRowEnvironment) {
      const trailingBackslashes = line.match(/(\\+)$/)?.[1].length ?? 0;
      if (trailingBackslashes === 1) {
        line += '\\';
        stats.cleanedArtifacts += 1;
      }
    }
    repaired.push(line);

    const events = sourceLine.matchAll(/\\(begin|end)\{([^{}]+)\}/g);
    for (const event of events) {
      const kind = event[1];
      const environment = event[2];
      if (kind === 'begin') {
        environmentStack.push(environment);
        continue;
      }

      const index = environmentStack.lastIndexOf(environment);
      if (index >= 0) environmentStack.splice(index, 1);
    }
  }

  return repaired;
}

function isLikelyLeftHandSide(line: string): boolean {
'''
if old_return not in converter:
    raise SystemExit('cleanDisplayBody return marker not found')
converter_path.write_text(converter.replace(old_return, new_return, 1))

# Add focused row-break regression coverage.
test_path = Path('scripts/test-converter.mjs')
tests = test_path.read_text()
marker = "  // Full-document regression copied from a real long ChatGPT response.\n"
if marker not in tests:
    raise SystemExit('test insertion marker not found')

test_block = r'''  // Recover ChatGPT-damaged row separators inside LaTeX row environments only.
  {
    const slash = '\\';
    const matrixInput = [
      '[',
      '\\Delta W=-M',
      '===========',
      '',
      '-U',
      '\\begin{bmatrix}',
      `\\sigma_1&&${slash}`,
      `&\\sigma_2&${slash}`,
      '&&\\ddots',
      '\\end{bmatrix}',
      'V^\\top.',
      ']',
    ].join('\n');
    assert.equal(
      convertChatGPTToObsidian(matrixInput).output,
      String.raw`$$
\Delta W=-M
=
-U
\begin{bmatrix}
\sigma_1&&\\
&\sigma_2&\\
&&\ddots
\end{bmatrix}
V^\top.
$$`,
      'single trailing backslashes in bmatrix rows should become TeX row breaks',
    );

    const casesInput = [
      '[',
      'f(x)=',
      '\\begin{cases}',
      `x^2, & x<0,${slash}`,
      `2x+1, & 0\\le x<2,${slash}`,
      '5, & x\\ge 2.',
      '\\end{cases}',
      ']',
    ].join('\n');
    assert.equal(
      convertChatGPTToObsidian(casesInput).output,
      String.raw`$$
f(x)=
\begin{cases}
x^2, & x<0,\\
2x+1, & 0\le x<2,\\
5, & x\ge 2.
\end{cases}
$$`,
      'single trailing backslashes in cases rows should become TeX row breaks',
    );

    const alreadyCorrect = String.raw`[
\begin{aligned}
x&=1\\
y&=2
\end{aligned}
]`;
    assert.equal(
      convertChatGPTToObsidian(alreadyCorrect).output,
      String.raw`$$
\begin{aligned}
x&=1\\
y&=2
\end{aligned}
$$`,
      'existing double-backslash row breaks must remain exactly double',
    );

    const outsideEnvironment = ['[', `x+1${slash}`, 'y+2', ']'].join('\n');
    assert.equal(
      convertChatGPTToObsidian(outsideEnvironment).output,
      ['$$', `x+1${slash}`, 'y+2', '$$'].join('\n'),
      'a lone trailing backslash outside a row environment must not be rewritten',
    );
  }

'''
test_path.write_text(tests.replace(marker, test_block + marker, 1))
