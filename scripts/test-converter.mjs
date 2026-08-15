import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
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
=\\log(2.718+7.389+20.086)
=\\log(30.193)
\\approx3.4076.
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

  console.log('All converter tests passed.');
} finally {
  await rm(dir, { recursive: true, force: true });
}
