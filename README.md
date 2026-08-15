# ChatGPT Paste Formatter

> An Obsidian plugin that repairs Markdown and mathematical notation copied from ChatGPT before it lands in your notes.

[![Obsidian](https://img.shields.io/badge/Obsidian-plugin-7C3AED?logo=obsidian&logoColor=white)](https://obsidian.md)
[![GitHub release](https://img.shields.io/github/v/release/Lortzing/obsidian-chatgpt-paste-formatter?display_name=tag)](https://github.com/Lortzing/obsidian-chatgpt-paste-formatter/releases/latest)
[![Build](https://github.com/Lortzing/obsidian-chatgpt-paste-formatter/actions/workflows/lint.yml/badge.svg)](https://github.com/Lortzing/obsidian-chatgpt-paste-formatter/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Copy from ChatGPT → paste into Obsidian → keep formulas and Markdown readable.**

ChatGPT can place visually correct formulas on the clipboard in a form that does not survive a normal paste into Obsidian. Display equations may become stray `[ ... ]` blocks, heading markers can appear in front of formulas, and math escapes such as `U\_r` can remain in the note.

ChatGPT Paste Formatter detects and repairs these common clipboard artifacts locally while protecting fenced code blocks and inline code.

> [!NOTE]
> This project is currently in beta and is **not yet listed in Obsidian Community Plugins**. BRAT is the recommended installation method for testing.

## Demo

<p align="center">
  <img src="assets/demo.gif" alt="ChatGPT Paste Formatter conversion demo" width="720">
</p>

<details>
<summary>Static preview</summary>

<p align="center">
  <img src="assets/preview.png" alt="ChatGPT Paste Formatter before and after preview" width="720">
</p>

</details>

The images are product demonstrations of the transformation rather than screenshots of a particular Obsidian theme.

## Example

### Copied from ChatGPT

```text
### 1. (U\_r(x)) 是什么？

# [ P(r\mid x)

\frac{e^{U\_r(x)}}{Z(x)}
]
```

### After conversion

```markdown
### 1. $U_r(x)$ 是什么？

$$
P(r\mid x) =
\frac{e^{U_r(x)}}{Z(x)}
$$
```

## Features

- **Paste with conversion** directly from the command palette.
- **Convert the current selection or note** after content has already been pasted.
- **Preview changes before applying them** to formula-heavy notes.
- Optional automatic paste conversion with three modes:
  - Off
  - Detected ChatGPT/math copies only *(default)*
  - Always
- Converts explicit LaTeX delimiters into Obsidian-friendly MathJax syntax:
  - `\(...\)` → `$...$`
  - `\[...\]` → `$$...$$`
- Repairs damaged display-math forms such as standalone `[ ... ]` blocks and `# [ ... ]` clipboard artifacts.
- Normalizes escaped math tokens such as `U\_r` → `U_r` inside detected math.
- Heuristically recognizes inline expressions such as `(x)` and `(U\_r(x))`.
- Protects fenced code blocks and inline code from math conversion.
- No network requests, telemetry, accounts, API keys, or external services.
- Uses only Obsidian-compatible APIs and is intended to work on desktop and mobile.

## Usage

Open the Obsidian command palette and run one of the following commands:

| Command | What it does |
| --- | --- |
| **Paste with conversion** | Reads the clipboard, converts supported ChatGPT artifacts, and inserts the result. |
| **Convert selection or current note** | Converts the current selection; if nothing is selected, converts the whole note. |
| **Preview conversion for selection or current note** | Shows the converted result before replacing the original text. |

When text is selected, conversion and preview actions are also available from the editor context menu.

### Automatic paste conversion

By default, the plugin intercepts a normal paste only when the clipboard looks like ChatGPT/math content. Detection uses signals such as malformed display-math delimiters, escaped subscripts, and LaTeX commands.

If you prefer fully explicit behavior, set automatic paste conversion to **Off** and use the commands above instead.

## What gets repaired

| Clipboard form | Obsidian output |
| --- | --- |
| `\(x\)` | `$x$` |
| `\[x\]` | `$$ x $$` |
| multiline `[ ... ]` math block | `$$ ... $$` |
| malformed `# [ ... ]` math block | `$$ ... $$` |
| `U\_r` inside math | `U_r` |
| obvious inline math such as `(U\_r(x))` | `$U_r(x)$` |

The converter is intentionally conservative. It repairs syntax and a limited set of high-confidence structural artifacts; it does **not** try to reconstruct arbitrary missing mathematical meaning.

## Installation

### BRAT — recommended for beta testing

1. Install **BRAT** from Obsidian Community Plugins.
2. Open the command palette and run **BRAT: Add a beta plugin for testing**.
3. Enter:

   ```text
   Lortzing/obsidian-chatgpt-paste-formatter
   ```

4. Enable **ChatGPT Paste Formatter** under **Settings → Community plugins**.

BRAT installs published GitHub release assets. If no release is visible yet, use the source installation below until the first release is published.

### GitHub Releases

For a published version, download these files from the matching GitHub Release:

```text
main.js
manifest.json
styles.css
```

Create:

```text
<Vault>/.obsidian/plugins/chatgpt-paste-formatter/
```

put the three files there, reload Obsidian, and enable the plugin.

### Build from source

Requirements: Node.js and npm.

```bash
git clone https://github.com/Lortzing/obsidian-chatgpt-paste-formatter.git
cd obsidian-chatgpt-paste-formatter
npm install
npm run check
```

Copy `main.js`, `manifest.json`, and `styles.css` into the plugin directory shown above.

## Settings

### Automatic paste conversion

Controls whether the regular Obsidian paste event is intercepted.

### Inline math detection

- **Strict** — only strong LaTeX/math signals.
- **Balanced** — default; recognizes common contextual inline math without being overly aggressive.
- **Aggressive** — converts more short parenthesized math-like expressions.

### Repair copied display math

Repairs malformed blocks such as:

```text
[
U(x)=
[U\_1(x),U\_2(x)]
]
```

and:

```text
# [ L\_{\mathrm{CE}}

-\sum_i \log P(r_i\mid x_i)
]
```

### Repair obvious missing relation

For a narrow class of malformed `# [ LHS ... ]` clipboard blocks, the plugin can restore an `=` when the first two lines look unambiguously like the left- and right-hand sides of an equation.

This option is deliberately conservative.

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm test
npm run lint
npm run build
# or all three:
npm run check
```

### Project structure

```text
src/
├── main.ts            # Obsidian plugin integration
├── converter.ts       # clipboard/text conversion engine
├── preview-modal.ts   # conversion preview UI
└── settings.ts        # plugin settings UI

assets/                # README demo assets
examples/              # representative ChatGPT input/output samples
scripts/               # converter test/demo helpers
manifest.json          # Obsidian plugin manifest
versions.json          # plugin → minimum Obsidian compatibility map
styles.css             # plugin UI styles
```

The conversion engine is kept separate from the Obsidian UI so it can be tested independently.

## Privacy

All conversion happens locally in memory. The plugin does not send note or clipboard content anywhere and does not include telemetry.

## Limitations

Clipboard representations can lose information before Obsidian receives the text. If an operator, symbol, or part of an equation is completely absent from the copied text, the plugin cannot reliably infer it.

For important equations or large notes, use **Preview conversion** before applying changes.

Mobile support is intended, but clipboard permission behavior can vary by operating system and should be beta-tested on real devices.

## Roadmap

- Expand regression coverage with more real ChatGPT clipboard samples.
- Improve structural parsing of damaged display math.
- Reduce false positives in inline-math detection.
- Run a BRAT public beta.
- Submit to the Obsidian Community Plugins directory after beta validation.

## Contributing

Bug reports and real-world examples of broken ChatGPT clipboard output are especially useful. Please open an issue with:

1. the text copied from ChatGPT,
2. the current conversion result, and
3. the expected Obsidian Markdown.

Pull requests are welcome.

## License

[MIT](LICENSE)
