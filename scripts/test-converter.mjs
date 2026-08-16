import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const dir = await mkdtemp(join(tmpdir(), 'chatgpt-paste-formatter-'));
const outfile = join(dir, 'formatter.mjs');

try {
  await esbuild.build({
    entryPoints: ['src/formatter.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2021',
    outfile,
  });

  const { convertChatGPTToObsidian, detectChatGPTMathCopy, DEFAULT_SETTINGS } = await import(pathToFileURL(outfile));

  {
    const input = '行内 \\(x^2 + 1\\)，块级 \\[y = 2\\]';
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, '行内 $x^2 + 1$，块级 $$\ny = 2\n$$');
  }

  {
    const input = `上下文 (x)，logits：\n\n[\nU(x)=\n[U\\_1(x),U\\_2(x),\\dots,U\\_{|V|}(x)]\n]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.match(out, /上下文 \$x\$/);
    assert.match(out, /\$\$\nU\(x\)=\n\[U_1\(x\),U_2\(x\),\\dots,U_\{\|V\|\}\(x\)\]\n\$\$/);
  }

  {
    const input = `# [ P(r\\mid x)\n\n\\frac{e^{U\\_r(x)}}{Z(x)}\n]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, `$$\nP(r\\mid x) =\n\\frac{e^{U_r(x)}}{Z(x)}\n$$`);
  }

  {
    const input = '其中 (U\\_r(x)) 是正确 token 的 logit，而 (r) 是编号。';
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, '其中 $U_r(x)$ 是正确 token 的 logit，而 $r$ 是编号。');
  }

  {
    const input = '代码：`(x)`\n\n```python\nx = "[\\nU\\_r(x)\\n]"\n```\n\n正文 (x)';
    const out = convertChatGPTToObsidian(input).output;
    assert.match(out, /`\(x\)`/);
    assert.match(out, /```python\nx = "\[\\nU\\_r\(x\)\\n\]"\n```/);
    assert.match(out, /正文 \$x\$/);
  }

  {
    const input = `[
p\\_i
\\===

\\frac{e^{U\\_i}}
{\\sum\\_j e^{U\\_j}}.
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, `$$
p_i
=
\\frac{e^{U_i}}
{\\sum_j e^{U_j}}.
$$`);
  }

  {
    const input = `[
\\log p\\_i
\\========

U\\_i-\\log\\sum\\_j e^{U\\_j}
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, `$$
\\log p_i
=
U_i-\\log\\sum_j e^{U_j}
$$`);
  }

  {
    const input = `[
\\=\\log(2.718+7.389+20.086)
]

[
\\=\\log(30.193)
\\approx3.4076.
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, `$$
\\begin{gathered}
=\\log(2.718+7.389+20.086)
\\\\
=\\log(30.193)
\\approx3.4076.
\\end{gathered}
$$`);

    const withoutMerge = convertChatGPTToObsidian(input, {
      ...DEFAULT_SETTINGS,
      mergeAdjacentDisplayMath: false,
    }).output;
    assert.equal((withoutMerge.match(/\$\$/g) ?? []).length, 4);
  }

  {
    const input = `[
U=[1,2,3]
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, `$$
U=[1,2,3]
$$`);
  }

  {
    const input = `[
e^{1000}, e^{1001}, e^{1002}
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, `$$
e^{1000}, e^{1001}, e^{1002}
$$`);
  }

  {
    const input = `[
U-m=[-2,-1,0].
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, `$$
U-m=[-2,-1,0].
$$`);
  }

  {
    const input = `[
e^{100}
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, `$$
e^{100}
$$`);
  }

  {
    const input = `[
This is ordinary prose.
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, input);
  }

  {
    const input = `[
p\\_i
\\===
\\frac{a}{b}
]`;
    const out = convertChatGPTToObsidian(input, {
      ...DEFAULT_SETTINGS,
      repairRepeatedEquals: false,
    }).output;
    assert.match(out, /p_i\n===\n/);
  }

  {
    assert.ok(detectChatGPTMathCopy('# [ P(r\\mid x)\n\\frac{a}{b}\n]') >= 2);
    assert.ok(detectChatGPTMathCopy('\\========') >= 2);
    assert.equal(detectChatGPTMathCopy('普通的一段中文笔记。'), 0);
  }


  {
    const mathBodies = [
      '42', 'x', 'x+y', '1,2,3', '[-2,-1,0]', 'P(A|B)',
      'sin theta', 'x in R', '\\sqrt{2}', '\\alpha+\\beta',
      '\\begin{bmatrix}\n1 & 2 \\\\ 3 & 4\n\\end{bmatrix}',
    ];
    for (const body of mathBodies) {
      const input = `[\n${body}\n]`;
      assert.equal(
        convertChatGPTToObsidian(input).output,
        `$$\n${body}\n$$`,
        `Expected display-math recovery for: ${body}`,
      );
    }
  }

  {
    const nonMathBodies = [
      'hello world', '这是普通文本。', '- list item',
      'https://example.com', '"hello"',
    ];
    for (const body of nonMathBodies) {
      const input = `[\n${body}\n]`;
      assert.equal(
        convertChatGPTToObsidian(input).output,
        input,
        `Expected non-math bracket block to stay unchanged: ${body}`,
      );
    }
  }


  {
    const input = `[
\\Delta W
========

# -r\\frac{-10}{10}

+r.
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, `$$
\\Delta W
=
-r\\frac{-10}{10}
+r.
$$`);
  }

  {
    const input = `[
\\Delta W
========

# Ordinary heading

+r.
]`;
    const out = convertChatGPTToObsidian(input).output;
    assert.equal(out, input, 'Ordinary Markdown headings inside bracket blocks must remain untouched');
  }


  {
    const fixtures = [
      {
        name: 'boxed text subtraction from long pasted response',
        input: String.raw`[
\boxed{
\text{正确 token 的 log likelihood}
--------------------------------

\text{logit normalization penalty}
}
]`,
        expected: String.raw`$$
\boxed{
\text{正确 token 的 log likelihood}
-
\text{logit normalization penalty}
}
$$`,
      },
      {
        name: 'boxed multi-line loss with standalone plus operator',
        input: String.raw`[
\boxed{
\mathcal L
==========

\sum_i
\left[
-\log P(r_i|x_i)
+
\alpha
\left(
\log\sum_j e^{U_j(x_i)}
\right)^2
\right]
}
]`,
        expected: String.raw`$$
\boxed{
\mathcal L
=
\sum_i
\left[
-\log P(r_i|x_i)
+
\alpha
\left(
\log\sum_j e^{U_j(x_i)}
\right)^2
\right]
}
$$`,
      },
      {
        name: 'boxed CE plus z-loss',
        input: String.raw`[
\boxed{
\mathcal L
==========

\mathcal L_{\mathrm{CE}}
+
\alpha\mathcal L_{\mathrm{z-loss}}
}
]`,
        expected: String.raw`$$
\boxed{
\mathcal L
=
\mathcal L_{\mathrm{CE}}
+
\alpha\mathcal L_{\mathrm{z-loss}}
}
$$`,
      },
      {
        name: 'momentum recurrence',
        input: String.raw`[
m_t
===

\beta m_{t-1}
+
(1-\beta)g_t
]`,
        expected: String.raw`$$
m_t
=
\beta m_{t-1}
+
(1-\beta)g_t
$$`,
      },
      {
        name: 'RMSProp recurrence',
        input: String.raw`[
v_t
===

\beta_2v_{t-1}
+
(1-\beta_2)g_t^2
]`,
        expected: String.raw`$$
v_t
=
\beta_2v_{t-1}
+
(1-\beta_2)g_t^2
$$`,
      },
      {
        name: 'boxed Adam update',
        input: String.raw`[
\boxed{
\Delta\theta
============

-\eta
\frac{\hat m_t}
{\sqrt{\hat v_t}+\epsilon}
}
]`,
        expected: String.raw`$$
\boxed{
\Delta\theta
=
-\eta
\frac{\hat m_t}
{\sqrt{\hat v_t}+\epsilon}
}
$$`,
      },
      {
        name: 'matrix output change',
        input: String.raw`[
\Delta y
========

\Delta W x.
]`,
        expected: String.raw`$$
\Delta y
=
\Delta W x.
$$`,
      },
      {
        name: 'Muon momentum recurrence',
        input: String.raw`[
M_t
===

\mu M_{t-1}
+
G_t.
]`,
        expected: String.raw`$$
M_t
=
\mu M_{t-1}
+
G_t.
$$`,
      },
      {
        name: 'z logsumexp heading artifact',
        input: String.raw`[
z=\log Z
========

# \log\sum_j e^{U_j}

\operatorname{logsumexp}(U).
]`,
        expected: String.raw`$$
z=\log Z
=
\log\sum_j e^{U_j}
\operatorname{logsumexp}(U).
$$`,
      },
      {
        name: 'CE flat-direction heading artifact',
        input: String.raw`[
\sum_j
\frac{\partial L_{\mathrm{CE}}}{\partial U_j}
=============================================

# \sum_jP_j-1

0.
]`,
        expected: String.raw`$$
\sum_j
\frac{\partial L_{\mathrm{CE}}}{\partial U_j}
=
\sum_jP_j-1
0.
$$`,
      },
      {
        name: 'log probability identity',
        input: String.raw`[
\log p_i
========

U_i-\log\sum_j e^{U_j}
]`,
        expected: String.raw`$$
\log p_i
=
U_i-\log\sum_j e^{U_j}
$$`,
      },
      {
        name: 'log-likelihood minus z-loss penalty',
        input: String.raw`[
L
=

\sum_i
\left[
\log P(x_i)
-----------

\alpha(\log Z(x_i))^2
\right]
]`,
        expected: String.raw`$$
L
=
\sum_i
\left[
\log P(x_i)
-
\alpha(\log Z(x_i))^2
\right]
$$`,
      },
    ];

    for (const fixture of fixtures) {
      assert.equal(
        convertChatGPTToObsidian(fixture.input).output,
        fixture.expected,
        fixture.name,
      );
    }
  }


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
    assert.ok(out.includes('$$\n\nordinary prose between formulas\n\n$$'));
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

  console.log('All converter tests passed.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
