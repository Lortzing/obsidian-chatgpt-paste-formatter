import { Editor, Menu, Notice, Plugin } from 'obsidian';
import {
  convertChatGPTToObsidian,
  DEFAULT_SETTINGS,
  detectChatGPTMathCopy,
  type FormatterSettings,
} from './converter';
import { ConversionPreviewModal } from './preview-modal';
import { FormatterSettingTab } from './settings';

export default class ChatGPTPasteFormatterPlugin extends Plugin {
  settings: FormatterSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new FormatterSettingTab(this.app, this));

    this.addCommand({
      id: 'paste-with-conversion',
      name: 'Paste with conversion',
      editorCallback: async (editor) => {
        try {
          const text = await navigator.clipboard.readText();
          const result = convertChatGPTToObsidian(text, this.settings);
          editor.replaceSelection(result.output);
          this.notify(result.changed ? 'Pasted with ChatGPT formatting repaired.' : 'Pasted; no conversion was needed.');
        } catch {
          new Notice('Clipboard access failed. Paste normally, select the text, then run the conversion command.');
        }
      },
    });

    this.addCommand({
      id: 'convert-selection-or-note',
      name: 'Convert selection or current note',
      editorCallback: (editor) => this.convertSelectionOrNote(editor, false),
    });

    this.addCommand({
      id: 'preview-selection-or-note',
      name: 'Preview conversion for selection or current note',
      editorCallback: (editor) => this.convertSelectionOrNote(editor, true),
    });

    this.registerEvent(
      this.app.workspace.on('editor-paste', (event, editor) => {
        if (event.defaultPrevented) return;
        if (this.settings.autoPasteMode === 'off') return;
        const text = event.clipboardData?.getData('text/plain') ?? '';
        if (!text) return;

        if (this.settings.autoPasteMode === 'detected' && detectChatGPTMathCopy(text) < 2) return;

        const result = convertChatGPTToObsidian(text, this.settings);
        if (!result.changed && this.settings.autoPasteMode !== 'always') return;

        event.preventDefault();
        editor.replaceSelection(result.output);
      }),
    );

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
        if (!editor.somethingSelected()) return;
        menu.addItem((item) =>
          item
            .setTitle('Convert copied text')
            .onClick(() => this.convertSelectionOrNote(editor, false)),
        );
        menu.addItem((item) =>
          item
            .setTitle('Preview conversion')
            .onClick(() => this.convertSelectionOrNote(editor, true)),
        );
      }),
    );
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as FormatterSettings;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private convertSelectionOrNote(editor: Editor, preview: boolean): void {
    const hasSelection = editor.somethingSelected();
    const original = hasSelection ? editor.getSelection() : editor.getValue();
    const result = convertChatGPTToObsidian(original, this.settings);

    const apply = () => {
      if (hasSelection) editor.replaceSelection(result.output);
      else editor.setValue(result.output);
      this.notify(result.changed ? 'Conversion applied.' : 'No conversion was needed.');
    };

    if (preview) {
      new ConversionPreviewModal(this.app, original, result.output, apply).open();
      return;
    }
    apply();
  }

  private notify(message: string): void {
    if (this.settings.showNotices) new Notice(message);
  }
}
