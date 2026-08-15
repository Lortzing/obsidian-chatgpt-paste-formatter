import { Editor, Menu, Notice, Plugin } from 'obsidian';
import {
  convertChatGPTToObsidian,
  DEFAULT_SETTINGS,
  detectChatGPTMathCopy,
  type FormatterSettings,
} from './converter';
import { setLanguagePreference, t } from './i18n';
import { ConversionPreviewModal } from './preview-modal';
import { FormatterSettingTab } from './settings';

const LOCALIZED_COMMAND_IDS = [
  'paste-with-conversion',
  'convert-selection-or-note',
  'preview-selection-or-note',
] as const;

export default class ChatGPTPasteFormatterPlugin extends Plugin {
  settings: FormatterSettings = { ...DEFAULT_SETTINGS };

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new FormatterSettingTab(this.app, this));
    this.registerLocalizedCommands();

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

        if (this.settings.showAutoPasteNotices) {
          new Notice(result.changed ? t('notice.autoRepaired') : t('notice.autoUnchanged'));
        }
      }),
    );

    this.registerEvent(
      this.app.workspace.on('editor-menu', (menu: Menu, editor: Editor) => {
        if (!editor.somethingSelected()) return;
        menu.addItem((item) =>
          item
            .setTitle(t('menu.convert'))
            .onClick(() => this.convertSelectionOrNote(editor, false)),
        );
        menu.addItem((item) =>
          item
            .setTitle(t('menu.preview'))
            .onClick(() => this.convertSelectionOrNote(editor, true)),
        );
      }),
    );
  }

  async loadSettings(): Promise<void> {
    const saved: unknown = await this.loadData();
    const stored = saved !== null && typeof saved === 'object'
      ? saved as Partial<FormatterSettings>
      : {};
    this.settings = { ...DEFAULT_SETTINGS, ...stored };
    setLanguagePreference(this.settings.language);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  refreshLocalizedCommands(): void {
    for (const commandId of LOCALIZED_COMMAND_IDS) {
      this.removeCommand(commandId);
    }
    this.registerLocalizedCommands();
  }

  private registerLocalizedCommands(): void {
    this.addCommand({
      id: 'paste-with-conversion',
      name: t('command.paste'),
      editorCallback: async (editor) => {
        try {
          const text = await navigator.clipboard.readText();
          const result = convertChatGPTToObsidian(text, this.settings);
          editor.replaceSelection(result.output);
          new Notice(result.changed ? t('notice.pasteRepaired') : t('notice.pasteUnchanged'));
        } catch {
          new Notice(t('notice.clipboardFailed'));
        }
      },
    });

    this.addCommand({
      id: 'convert-selection-or-note',
      name: t('command.convert'),
      editorCallback: (editor) => this.convertSelectionOrNote(editor, false),
    });

    this.addCommand({
      id: 'preview-selection-or-note',
      name: t('command.preview'),
      editorCallback: (editor) => this.convertSelectionOrNote(editor, true),
    });
  }

  private convertSelectionOrNote(editor: Editor, preview: boolean): void {
    const hasSelection = editor.somethingSelected();
    const original = hasSelection ? editor.getSelection() : editor.getValue();
    const result = convertChatGPTToObsidian(original, this.settings);

    const apply = () => {
      if (hasSelection) editor.replaceSelection(result.output);
      else editor.setValue(result.output);
      new Notice(result.changed ? t('notice.applied') : t('notice.unchanged'));
    };

    if (preview) {
      new ConversionPreviewModal(this.app, original, result.output, apply).open();
      return;
    }
    apply();
  }
}
