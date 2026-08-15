from pathlib import Path

converter_path = Path('src/converter.ts')
converter = converter_path.read_text()

old_list_reject = "  if (/^\\s*(?:[-*+]\\s+|\\d+[.)]\\s+|>\\s+)/m.test(body)) return false;\n"
new_list_reject = "  if (/^\\s*(?:[-*+][ \\t]+\\S|\\d+[.)][ \\t]+\\S|>[ \\t]+\\S)/m.test(body)) return false;\n"
if old_list_reject not in converter:
    raise SystemExit('display-math list rejection marker not found')
converter = converter.replace(old_list_reject, new_list_reject, 1)

old_normalize = """function normalizeMath(text: string, settings: FormatterSettings, stats: ConversionStats): string {\n  let out = text;\n\n  if (settings.repairRepeatedEquals) {\n"""
new_normalize = """function normalizeMath(text: string, settings: FormatterSettings, stats: ConversionStats): string {\n  let out = text;\n\n  if (/^\\\\?-{3,}$/.test(out.trim())) {\n    out = '-';\n    stats.cleanedArtifacts += 1;\n  }\n\n  if (settings.repairRepeatedEquals) {\n"""
if old_normalize not in converter:
    raise SystemExit('normalizeMath marker not found')
converter = converter.replace(old_normalize, new_normalize, 1)

old_merge_return = "      return `$$\\n${firstBody.trimEnd()}\\n${secondBody.trimStart()}\\n$$`;\n"
new_merge_return = "      return `$$\\n${mergeDisplayBodiesWithLineBreak(firstBody, secondBody)}\\n$$`;\n"
if old_merge_return not in converter:
    raise SystemExit('merge return marker not found')
converter = converter.replace(old_merge_return, new_merge_return, 1)

merge_helper_marker = "function looksLikeMathContinuation(body: string): boolean {\n"
merge_helper = r'''function mergeDisplayBodiesWithLineBreak(firstBody: string, secondBody: string): string {
  const first = firstBody.trim();
  const second = secondBody.trim();
  const gathered = first.match(/^\\begin\{gathered\}\n([\s\S]*?)\n\\end\{gathered\}$/);

  if (gathered) {
    return `\\begin{gathered}\n${gathered[1].trimEnd()}\n\\\\\n${second}\n\\end{gathered}`;
  }

  return `\\begin{gathered}\n${first}\n\\\\\n${second}\n\\end{gathered}`;
}

'''
if merge_helper_marker not in converter:
    raise SystemExit('merge helper marker not found')
converter = converter.replace(merge_helper_marker, merge_helper + merge_helper_marker, 1)
converter_path.write_text(converter)

# Promote real pasted examples into permanent regression tests.
tests_path = Path('scripts/test-converter.mjs')
tests = tests_path.read_text()
old_adjacent = r'''    assert.equal(out, `$$
=\log(2.718+7.389+20.086)
=\log(30.193)
\approx3.4076.
$$`);
'''
new_adjacent = r'''    assert.equal(out, `$$
\\begin{gathered}
=\log(2.718+7.389+20.086)
\\\\
=\log(30.193)
\approx3.4076.
\\end{gathered}
$$`);
'''
if old_adjacent not in tests:
    raise SystemExit('adjacent-display expected output marker not found')
tests = tests.replace(old_adjacent, new_adjacent, 1)

marker = "  console.log('All converter tests passed.');"
regressions = r'''
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

''' + marker
if marker not in tests:
    raise SystemExit('test insertion marker not found')
tests_path.write_text(tests.replace(marker, regressions, 1))
