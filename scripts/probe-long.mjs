import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';

const dir = await mkdtemp(join(tmpdir(), 'probe-'));
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

  const { convertChatGPTToObsidian } = await import(pathToFileURL(outfile));
  const cases = [
    {
      name: 'adjacent derivation blocks',
      input: String.raw`[
=\log(2.718+7.389+20.086)
]

[
=\log(30.193)
\approx3.4076.
]`,
      expected: String.raw`$$
=\log(2.718+7.389+20.086)
=\log(30.193)
\approx3.4076.
$$`,
    },
    {
      name: 'boxed text subtraction',
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
--------------------------------
\text{logit normalization penalty}
}
$$`,
    },
    {
      name: 'boxed loss',
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
      name: 'boxed CE plus z loss',
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
      name: 'momentum long fixture',
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
      name: 'math heading artifact',
      input: String.raw`[
\Delta W
========

# -r\frac{-10}{10}

+r.
]`,
      expected: String.raw`$$
\Delta W
=
-r\frac{-10}{10}
+r.
$$`,
    },
  ];

  for (const test of cases) {
    const actual = convertChatGPTToObsidian(test.input).output;
    try {
      assert.equal(actual, test.expected);
    } catch (error) {
      console.error(`FAIL: ${test.name}\nACTUAL:\n${actual}\nEXPECTED:\n${test.expected}`);
      throw error;
    }
    console.log(`PASS: ${test.name}`);
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
