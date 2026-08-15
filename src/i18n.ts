import { moment } from 'obsidian';

export type SupportedLocale = 'en' | 'zh-cn';
export type LanguagePreference = 'system' | SupportedLocale;

let languagePreference: LanguagePreference = 'system';

const EN = {
  'settings.title': 'ChatGPT Paste Formatter',
  'settings.subtitle': 'Repair ChatGPT clipboard Markdown and math before it reaches your notes.',
  'settings.section.general': 'General',
  'settings.section.paste': 'Paste behavior',
  'settings.section.detection': 'Math detection',
  'settings.section.repair': 'Repair rules',
  'settings.section.notifications': 'Notifications',
  'settings.language.name': 'Interface language',
  'settings.language.desc': 'Use the Obsidian language automatically, or force Chinese or English. Settings and command palette names update immediately.',
  'settings.language.system': 'Default (follow Obsidian)',
  'settings.language.zh': '中文',
  'settings.language.en': 'English',
  'settings.autoPaste.name': 'Automatic paste conversion',
  'settings.autoPaste.desc': 'Detected only is the safer default: normal clipboard text is left untouched.',
  'settings.autoPaste.off': 'Off',
  'settings.autoPaste.detected': 'Detected ChatGPT/math copies only',
  'settings.autoPaste.always': 'Always convert pasted text',
  'settings.inlineMath.name': 'Inline math detection',
  'settings.inlineMath.desc': 'Controls how aggressively parenthesized expressions such as (x) are treated as inline math.',
  'settings.inlineMath.strict': 'Strict',
  'settings.inlineMath.balanced': 'Balanced',
  'settings.inlineMath.aggressive': 'Aggressive',
  'settings.delimiters.name': 'Convert LaTeX delimiters',
  'settings.delimiters.desc': 'Convert \\(...\\) to $...$ and \\[...\\] to $$...$$.',
  'settings.displayMath.name': 'Repair copied display math',
  'settings.displayMath.desc': 'Repair ChatGPT clipboard artifacts such as standalone [ ... ] blocks and “# [ formula” lines. Standalone bracket blocks are handled permissively unless they clearly look like prose or Markdown.',
  'settings.escapes.name': 'Normalize escaped math symbols',
  'settings.escapes.desc': 'Inside detected math only, convert copied escapes such as U\\_r and \\+ back to U_r and +.',
  'settings.repeatedEquals.name': 'Collapse repeated equals signs',
  'settings.repeatedEquals.desc': 'Repair clipboard artifacts such as \\=== or \\======== to a single = inside detected math.',
  'settings.mergeMath.name': 'Merge adjacent display-math continuations',
  'settings.mergeMath.desc': 'Merge adjacent formula blocks when the next block clearly continues the same derivation, for example when it starts with = or ≈.',
  'settings.relation.name': 'Repair obvious missing relation',
  'settings.relation.desc': 'For malformed “# [ LHS” equation blocks, insert an equals sign only when the first two lines clearly look like LHS/RHS.',
  'settings.emphasis.name': 'Clean empty emphasis artifacts',
  'settings.emphasis.desc': 'Optional and off by default. Removing ** ** can merge adjacent emphasis spans, so enable only if your clipboard format needs it.',
  'settings.autoNotices.name': 'Automatic conversion notices',
  'settings.autoNotices.desc': 'Show a notice after automatic paste conversion. Manual conversions always show a result notice.',
  'command.paste': 'Paste with conversion',
  'command.convert': 'Convert selection or current note',
  'command.preview': 'Open converter sidebar for selection or current note',
  'menu.convert': 'Convert copied text',
  'menu.preview': 'Open in converter sidebar',
  'notice.pasteRepaired': 'Pasted with ChatGPT formatting repaired.',
  'notice.pasteUnchanged': 'Pasted; no conversion was needed.',
  'notice.autoRepaired': 'Automatically repaired pasted ChatGPT/math formatting.',
  'notice.autoUnchanged': 'Automatic conversion checked the pasted text; no changes were needed.',
  'notice.clipboardFailed': 'Clipboard access failed. Paste normally, select the text, then run the conversion command.',
  'notice.applied': 'Conversion applied.',
  'notice.unchanged': 'No conversion was needed.',
  'preview.title': 'Preview conversion',
  'preview.before': 'Before',
  'preview.after': 'After',
  'preview.cancel': 'Cancel',
  'preview.apply': 'Apply',
  'sidebar.title': 'ChatGPT converter',
  'sidebar.hint': 'Select text in the editor with the mouse or keyboard to sync it here automatically. You can also edit the source box manually.',
  'sidebar.source': 'Selected / source text',
  'sidebar.result': 'Converted result',
  'sidebar.sourcePlaceholder': 'Select text in a note, or paste/edit text here…',
  'sidebar.resultPlaceholder': 'The converted Obsidian Markdown will appear here.',
  'sidebar.clear': 'Clear',
  'sidebar.copy': 'Copy result',
  'sidebar.apply': 'Apply to original selection',
  'sidebar.empty': 'There is no text to convert.',
  'sidebar.copied': 'Converted result copied.',
  'sidebar.copyFailed': 'Could not write to the clipboard.',
  'sidebar.noTarget': 'No editor selection is attached. Select text in a note first, then apply again.',
} as const;

export type TranslationKey = keyof typeof EN;

const ZH_CN: Record<TranslationKey, string> = {
  'settings.title': 'ChatGPT 粘贴格式化',
  'settings.subtitle': '在内容进入笔记前，修复从 ChatGPT 复制产生的 Markdown 与数学公式格式。',
  'settings.section.general': '常规',
  'settings.section.paste': '粘贴行为',
  'settings.section.detection': '公式检测',
  'settings.section.repair': '修复规则',
  'settings.section.notifications': '通知',
  'settings.language.name': '界面语言',
  'settings.language.desc': '默认跟随 Obsidian，也可以固定使用中文或 English。设置页和命令面板名称都会立即更新。',
  'settings.language.system': '默认（跟随 Obsidian）',
  'settings.language.zh': '中文',
  'settings.language.en': 'English',
  'settings.autoPaste.name': '自动粘贴转换',
  'settings.autoPaste.desc': '推荐使用“仅检测到 ChatGPT/数学内容时转换”，普通剪贴板文本不会被修改。',
  'settings.autoPaste.off': '关闭',
  'settings.autoPaste.detected': '仅检测到 ChatGPT/数学内容时转换',
  'settings.autoPaste.always': '始终转换粘贴文本',
  'settings.inlineMath.name': '行内公式检测',
  'settings.inlineMath.desc': '控制将 (x) 这类括号表达式识别为行内公式时的激进程度。',
  'settings.inlineMath.strict': '严格',
  'settings.inlineMath.balanced': '均衡',
  'settings.inlineMath.aggressive': '激进',
  'settings.delimiters.name': '转换 LaTeX 定界符',
  'settings.delimiters.desc': '将 \\(...\\) 转换为 $...$，并将 \\[...\\] 转换为 $$...$$。',
  'settings.displayMath.name': '修复复制后的块级公式',
  'settings.displayMath.desc': '修复 ChatGPT 剪贴板中的异常格式，例如独立的 [ ... ] 块和“# [ formula”行。对于独立方括号块会采用更宽松的识别，除非内容明显属于自然语言或 Markdown。',
  'settings.escapes.name': '规范化公式中的转义符号',
  'settings.escapes.desc': '仅在检测到的数学内容中，将 U\\_r、\\+ 等复制产生的转义恢复为 U_r、+。',
  'settings.repeatedEquals.name': '折叠连续等号',
  'settings.repeatedEquals.desc': '在检测到的数学内容中，将 \\===、\\======== 等复制异常修复为单个 =。',
  'settings.mergeMath.name': '合并连续的块级公式',
  'settings.mergeMath.desc': '当相邻公式明显属于同一推导时进行合并，例如后一块以 = 或 ≈ 开头。',
  'settings.relation.name': '修复明显缺失的关系符',
  'settings.relation.desc': '对于异常的“# [ LHS”公式块，仅在前两行明显构成左式/右式时自动补充等号。',
  'settings.emphasis.name': '清理空的强调标记',
  'settings.emphasis.desc': '默认关闭。删除 ** ** 可能会合并相邻的强调区间，仅在你的剪贴板格式确实需要时启用。',
  'settings.autoNotices.name': '自动转换通知',
  'settings.autoNotices.desc': '自动粘贴转换后是否显示通知。手动转换始终会显示结果通知。',
  'command.paste': '粘贴并转换格式',
  'command.convert': '转换所选内容或当前笔记',
  'command.preview': '在右侧转换栏中打开所选内容或当前笔记',
  'menu.convert': '转换复制的文本',
  'menu.preview': '在右侧转换栏中打开',
  'notice.pasteRepaired': '已粘贴，并修复 ChatGPT 格式。',
  'notice.pasteUnchanged': '已粘贴，无需转换。',
  'notice.autoRepaired': '已自动修复粘贴内容中的 ChatGPT/数学格式。',
  'notice.autoUnchanged': '已检查粘贴内容，无需自动修复。',
  'notice.clipboardFailed': '无法读取剪贴板。请正常粘贴并选中文本，然后运行转换命令。',
  'notice.applied': '已应用转换。',
  'notice.unchanged': '无需转换。',
  'preview.title': '预览转换结果',
  'preview.before': '转换前',
  'preview.after': '转换后',
  'preview.cancel': '取消',
  'preview.apply': '应用',
  'sidebar.title': 'ChatGPT 转换器',
  'sidebar.hint': '在编辑器中用鼠标拖动或键盘选中文本，会自动同步到这里。也可以直接编辑上方原文框。',
  'sidebar.source': '选中 / 原始文本',
  'sidebar.result': '转换结果',
  'sidebar.sourcePlaceholder': '在笔记中选中文本，或在这里粘贴 / 编辑文本…',
  'sidebar.resultPlaceholder': '转换后的 Obsidian Markdown 会显示在这里。',
  'sidebar.clear': '清空',
  'sidebar.copy': '复制结果',
  'sidebar.apply': '应用到原选区',
  'sidebar.empty': '当前没有可转换的文本。',
  'sidebar.copied': '已复制转换结果。',
  'sidebar.copyFailed': '无法写入剪贴板。',
  'sidebar.noTarget': '当前没有关联的编辑器选区。请先在笔记中选中文本，然后再应用。',
};

const DICTIONARIES: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en: EN,
  'zh-cn': ZH_CN,
};

export function setLanguagePreference(preference: LanguagePreference): void {
  languagePreference = preference;
}

export function getLanguagePreference(): LanguagePreference {
  return languagePreference;
}

export function getSupportedLocale(preference: LanguagePreference = languagePreference): SupportedLocale {
  if (preference !== 'system') return preference;
  const detected = (moment.locale() || document.documentElement.lang || navigator.language || 'en').toLowerCase();
  return detected.startsWith('zh') ? 'zh-cn' : 'en';
}

export function t(key: TranslationKey): string {
  return DICTIONARIES[getSupportedLocale()][key];
}
