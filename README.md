# ChatGPT Paste Formatter

Convert text copied from ChatGPT into Obsidian-friendly Markdown and MathJax without sending note content anywhere.

The plugin is designed for the common failure mode where copied ChatGPT math arrives as damaged plain Markdown, for example:

```text
### 1. (U\_r(x)) 是什么？

# [ P(r\mid x)

\frac{e^{U\_r(x)}}{Z(x)}
]
```

and should become:

```markdown
### 1. $U_r(x)$ 是什么？

$$
P(r\mid x) =
\frac{e^{U_r(x)}}{Z(x)}
$$
```

## Features

- **Paste with conversion** from the command palette.
- **Convert selection or current note** without touching code fences or inline code.
- **Preview before applying** for long or formula-heavy notes.
- Optional **automatic paste conversion**:
  - Off
  - Detected ChatGPT/math copies only (default)
  - Always
- Converts `\(...\)` → `$...$` and `\[...\]` → `$$...$$`.
- Repairs copied display-math artifacts such as standalone `[ ... ]` blocks.
- Repairs ChatGPT clipboard artifacts such as `# [ formula ... ]`.
- Converts escaped math tokens such as `U\_r` → `U_r` **inside math only**.
- Heuristically converts copied inline math such as `(x)` and `(U\_r(x))` while avoiding ordinary prose where possible.
- Optional cleanup for suspicious empty emphasis fragments such as `** **` (disabled by default because Markdown emphasis boundaries can be semantically meaningful).
- No runtime dependencies, network requests, telemetry, accounts, or external services.
- Desktop and mobile compatible.

## Commands

Open the command palette and use:

- **Paste with conversion**
- **Convert selection or current note**
- **Preview conversion for selection or current note**

When text is selected, the editor context menu also exposes conversion and preview actions.

## Default behavior

Automatic paste conversion defaults to **Detected ChatGPT/math copies only**. The plugin scores clipboard text for signals such as malformed display-math delimiters, escaped subscripts, and LaTeX commands. Ordinary pasted text is left alone.

You can switch automatic conversion off entirely and only use the manual commands.

## Settings

### Automatic paste conversion

Controls whether the normal paste event is intercepted.

### Inline math detection

- **Strict** — only strong LaTeX/math signals.
- **Balanced** — default; additionally recognizes contextual variables such as Chinese prose followed by `(x)`.
- **Aggressive** — converts more short parenthesized math-like expressions.

### Repair copied display math

Handles forms such as:

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

Some ChatGPT clipboard representations lose the visual relation between the first line and the rest of a display equation. For the specific malformed `# [ LHS` pattern, the plugin can restore an `=` only when the first two lines look unambiguously like a left-hand side and right-hand side.

This is deliberately conservative: the plugin does **not** attempt to reconstruct arbitrary mathematical meaning.

## Installation

### From a release ZIP

1. Extract the install ZIP.
2. Copy the folder into your vault at:

   ```text
   <vault>/.obsidian/plugins/chatgpt-paste-formatter/
   ```

3. Ensure the folder contains:

   ```text
   main.js
   manifest.json
   styles.css
   ```

4. Restart/reload Obsidian.
5. Open **Settings → Community plugins** and enable **ChatGPT Paste Formatter**.

### Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The source follows the official Obsidian sample-plugin pattern: TypeScript source, esbuild bundling, `manifest.json`, `versions.json`, and release assets containing `main.js`, `manifest.json`, and optional `styles.css`.

## Conversion pipeline

The converter is intentionally separated from the Obsidian UI so it can be tested independently.

```text
clipboard/editor text
        │
        ├─ split and protect fenced code blocks
        │
        ├─ clean safe clipboard artifacts
        │
        ├─ convert explicit LaTeX delimiters
        │
        ├─ repair malformed ChatGPT display-math blocks
        │
        ├─ normalize escapes inside detected math
        │
        ├─ protect inline code / existing math
        │
        └─ conservative inline-math heuristics
                │
                ▼
        Obsidian Markdown + MathJax
```

Core conversion logic lives in `src/converter.ts`; Obsidian integration is kept in `src/main.ts`, with UI settings and preview modal in separate files.

## Examples

See:

- `examples/chatgpt-input.md`
- `examples/obsidian-output.md`

The examples cover the malformed formats the plugin was initially built to repair.

## Privacy and security

All conversion happens locally in memory. The plugin does not make network requests and does not collect telemetry.

## Limitations

Clipboard representations can lose information before Obsidian receives the text. This plugin repairs syntax and a small set of highly confident structural artifacts; it cannot reliably infer arbitrary operators or symbols that are completely absent from the clipboard. For important equations, use the preview command before applying the conversion.

## License

MIT
