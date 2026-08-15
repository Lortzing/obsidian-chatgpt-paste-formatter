from pathlib import Path
import json

converter_path = Path("src/converter.ts")
converter = converter_path.read_text()

old_reject = "  if (/^\\s*(?:[-*+]\\s+|\\d+[.)]\\s+|>\\s+|#{1,6}\\s+)/m.test(body)) return false;\n"
new_reject = """  if (/^\\s*(?:[-*+]\\s+|\\d+[.)]\\s+|>\\s+)/m.test(body)) return false;

  const headingPayloads = body
    .split('\\n')
    .map((line) => line.match(/^\\s*#{1,6}\\s+(.+)$/)?.[1] ?? null)
    .filter((line): line is string => line !== null);
  if (headingPayloads.some((line) => !looksLikeMathHeadingArtifact(line))) return false;
"""
if old_reject not in converter:
    raise SystemExit("heading rejection marker not found")
converter = converter.replace(old_reject, new_reject, 1)

helper_marker = "function cleanDisplayBody(\n"
helper = r"""function looksLikeMathHeadingArtifact(text: string): boolean {
  const value = text.trim();
  if (!value || value.length > 1000) return false;
  if (/https?:\/\/|www\./i.test(value)) return false;

  if (/\\[A-Za-z]+/.test(value)) return true;
  if (/(?:\^|_)(?:\{[^{}\n]+\}|[A-Za-z0-9])/.test(value)) return true;
  if (/[=<>≤≥≈≠∈∉∝→←↔±×÷∑∏√∞∂∇]/.test(value)) return true;
  if (/[A-Za-z0-9)\]}]\s*[+\-*/]\s*(?:[A-Za-z0-9({]|\[)/.test(value)) return true;

  return /^[+-]?(?:[A-Za-z]|\d)[A-Za-z0-9\s\\_{}()[\],.;:+\-*/=<>|^'!%&]*$/.test(value)
    && /[+\-*/^_{}()[\]\\]/.test(value);
}

"""
if helper_marker not in converter:
    raise SystemExit("cleanDisplayBody marker not found")
converter = converter.replace(helper_marker, helper + helper_marker, 1)

old_clean = r"""    if (open.kind === 'malformed') {
      const match = line.match(/^\s*#{1,6}\s+(.+)$/);
      if (match) {
        heading = true;
        line = match[1];
        stats.cleanedArtifacts += 1;
      }
    }
"""
new_clean = r"""    const match = line.match(/^\s*#{1,6}\s+(.+)$/);
    if (match && (open.kind === 'malformed' || looksLikeMathHeadingArtifact(match[1]))) {
      heading = true;
      line = match[1];
      stats.cleanedArtifacts += 1;
    }
"""
if old_clean not in converter:
    raise SystemExit("display cleaning marker not found")
converter = converter.replace(old_clean, new_clean, 1)
converter_path.write_text(converter)

tests_path = Path("scripts/test-converter.mjs")
tests = tests_path.read_text()
marker = "  console.log('All converter tests passed.');"
regression = r"""
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

""" + marker
if marker not in tests:
    raise SystemExit("test insertion marker not found")
tests_path.write_text(tests.replace(marker, regression, 1))

for filename in ("package.json", "manifest.json"):
    path = Path(filename)
    data = json.loads(path.read_text())
    data["version"] = "0.1.6"
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

versions_path = Path("versions.json")
versions = json.loads(versions_path.read_text())
versions["0.1.6"] = "1.7.2"
versions_path.write_text(json.dumps(versions, indent=2, ensure_ascii=False) + "\n")
