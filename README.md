# ChatGPT Paste Formatter

> An Obsidian plugin that repairs Markdown and mathematical notation copied from ChatGPT before it lands in your notes.

[![Obsidian](https://img.shields.io/badge/Obsidian-plugin-7C3AED?logo=obsidian&logoColor=white)](https://obsidian.md)
[![GitHub release](https://img.shields.io/github/v/release/Lortzing/obsidian-chatgpt-paste-formatter?display_name=tag)](https://github.com/Lortzing/obsidian-chatgpt-paste-formatter/releases/latest)
[![Build](https://github.com/Lortzing/obsidian-chatgpt-paste-formatter/actions/workflows/lint.yml/badge.svg)](https://github.com/Lortzing/obsidian-chatgpt-paste-formatter/actions/workflows/lint.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Copy from ChatGPT → paste into Obsidian → keep formulas and Markdown readable.**

ChatGPT can place visually correct formulas on the clipboard in a form that does not survive a normal paste into Obsidian. Display equations may become stray `[ ... ]` blocks, heading markers can appear in front of formulas, math escapes such as `U\_r` can remain in the note, and relations can occasionally degrade into strings such as `\===`.

ChatGPT Paste Formatter detects and repairs these clipboard artifacts locally while protecting fenced code blocks and inline code.

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
- Selectable interface language:
  - Default — follow Obsidian
  - 中文
  - English
- Converts explicit LaTeX delimiters into Obsidian-friendly MathJax syntax:
  - `\(...\)` → `$...$`
  - `\[...\]` → `$$...$$`
- Repairs damaged display-math forms such as standalone `[ ... ]` blocks and `# [ ... ]` clipboard artifacts.
- Repairs compact blocks such as `[ U=[1,2,3] ]` when they are clearly mathematical assignments.
- Normalizes escaped math tokens such as `U\_r` → `U_r` inside detected math.
- Optionally collapses repeated relation artifacts such as `\===` and `\========` to `=` *(enabled by default)*.
- Optionally merges adjacent display-math blocks when the second block clearly continues the same derivation *(enabled by default)*.
- Heuristically recognizes inline expressions such as `(x)` and `(U\_r(x))`.
- Protects fenced code blocks and inline code from math conversion.
- Manual conversions always report whether a change was applied; automatic conversion notices can be enabled separately.
- No network requests, telemetry, accounts, API keys, or external services.

## Usage

### Manual conversion

Open the Obsidian command palette and run one of the following commands:

| Command | What it does |
| --- | --- |
| **Paste with conversion** | Reads the clipboard, converts supported artifacts, and inserts the result. |
| **Convert selection or current note** | Converts the current selection; if nothing is selected, converts the whole note. |
| **Preview conversion for selection or current note** | Shows the converted result before replacing the original text. |

When text is selected, **Convert copied text** and **Preview conversion** are also available from the editor context menu.

Manual conversions always show a result notice so that an explicit conversion action never fails silently.

### Automatic paste conversion

By default, regular paste uses **Detected ChatGPT/math copies only**. The plugin does not have access to clipboard provenance and therefore does not literally know that the source application was ChatGPT. Instead, it computes a small heuristic score from textual signatures commonly produced by ChatGPT/math clipboard output.

Automatic conversion runs when the score is at least **2**. Current signals include:

| Signal | Score |
| --- | ---: |
| Explicit `\(...\)` math | +2 |
| Explicit `\[...\]` math | +2 |
| Malformed heading-style `# [ ... ]` block | +5 |
| Standalone multiline `[ ... ]` block | +4 |
| One escaped underscore such as `U\_r` | +1 |
| Two or more escaped underscores | +2 |
| One recognized LaTeX command | +1 |
| Three or more recognized LaTeX commands | +2 |
| Repeated equals artifact such as `\===` | +2 |
| Empty emphasis artifact such as `** **` | +1 |

This detector is intentionally based on text structure rather than the clipboard source application. **Off** disables interception entirely; **Always** runs the converter for every regular paste.

## What gets repaired

| Clipboard form | Obsidian output |
| --- | --- |
| `\(x\)` | `$x$` |
| `\[x\]` | `$$ x $$` |
| multiline `[ ... ]` math block | `$$ ... $$` |
| malformed `# [ ... ]` math block | `$$ ... $$` |
| `[ U=[1,2,3] ]` | display math block |
| `U\_r` inside math | `U_r` |
| `\===` / `\========` inside math | `=` |
| adjacent derivation block beginning with `=` or `\approx` | merged into the previous display block |
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
npm ci
npm run check
```

Copy `main.js`, `manifest.json`, and `styles.css` into the plugin directory shown above.

## Settings

Settings are organized into **General**, **Paste behavior**, **Math detection**, **Repair rules**, and **Notifications**.

### General

#### Interface language

Choose **Default (follow Obsidian)**, **中文**, or **English**. Settings, context menus, preview UI, and notices use the selected language immediately. Command palette names are registered when the plugin loads, so changing the language requires a plugin reload before those command names change.

### Paste behavior

#### Automatic paste conversion

- **Off** — never intercept ordinary paste.
- **Detected ChatGPT/math copies only** — default; convert only when the detector score is at least 2.
- **Always** — run the converter for every ordinary paste.

### Math detection

#### Inline math detection

This setting only controls heuristic conversion of ordinary parentheses such as `(x)`. Explicit LaTeX delimiters are handled separately.

- **Strict** — requires strong mathematical syntax inside the parentheses. Expressions containing LaTeX commands, subscripts/superscripts, relation/operators, or clear mathematical structure can be converted, but a plain `(x)` is normally left alone.
- **Balanced** — default. Includes Strict behavior and also recognizes simple variables in mathematical/prose context, for example Chinese explanatory prose containing `其中 (x) 表示...`.
- **Aggressive** — includes Balanced behavior and accepts more short variable/function-like parenthesized expressions even when contextual evidence is weaker. This can capture more copied formulas but has the highest false-positive risk.

The converter still avoids obvious non-math cases such as URLs, Markdown link destinations, and plain numeric parenthetical text.

#### Convert LaTeX delimiters

Converts `\(...\)` and `\[...\]` into Obsidian `$...$` and `$$...$$` syntax.

#### Repair copied display math

Repairs malformed standalone `[ ... ]` and heading-style `# [ ... ]` blocks when the contents look mathematical.

### Repair rules

#### Normalize escaped math symbols

Inside detected math, converts clipboard escapes such as `U\_r` and `\+` back to `U_r` and `+`.

#### Collapse repeated equals signs

Enabled by default. Converts repeated-equals clipboard artifacts such as `\===` and `\========` to one `=` inside recognized math blocks.

#### Merge adjacent display-math continuations

Enabled by default. Adjacent display blocks are merged only when there is strong evidence of a continuous derivation — for example, the next formula begins with `=`, `\approx`, `\equiv`, `\sim`, `\leq`, `\geq`, an arrow, or another continuation operator. Two unrelated neighboring formulas are kept separate.

#### Repair obvious missing relation

For a narrow class of malformed `# [ LHS ... ]` clipboard blocks, the plugin can restore an `=` when the first two lines look unambiguously like the left- and right-hand sides of an equation.

#### Clean empty emphasis artifacts

Off by default because removing empty emphasis markers can alter neighboring Markdown emphasis in unusual clipboard content.

### Notifications

Manual conversion actions always show a result notice. **Automatic conversion notices** only controls notifications produced by intercepted ordinary paste and is off by default.

## Development

```bash
npm ci
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
├── i18n.ts            # English/Chinese localization
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
