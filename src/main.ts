import { Editor, Menu, Notice, Plugin } from 'obsidian';
import {
  convertChatGPTToObsidian,
  DEFAULT_SETTINGS,
  detectChatGPTMathCopy,
  type FormatterSettings,
} from './formatter';
import { CONVERTER_VIEW_TYPE, ConverterSidebarView } from './converter-view';
import { setLanguagePreference, t } from './i18n';
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
    this.registerView(CONVERTER_VIEW_TYPE, (leaf) => new ConverterSidebarView(leaf, this));
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
            .onClick(() => this.convertSelectionOrNote(editor)),
        );
        menu.addItem((item) =>
          item
            .setTitle(t('menu.preview'))
            .onClick(() => {
              void this.openConverterSidebar(editor, false);
            }),
        );
      }),
    );

    this.registerDomEvent(document, 'mouseup', () => this.syncSidebarSelection());
    this.registerDomEvent(document, 'keyup', () => this.syncSidebarSelection());
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(CONVERTER_VIEW_TYPE);
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
    this.getConverterView()?.refreshLanguage();
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
      editorCallback: (editor) => this.convertSelectionOrNote(editor),
    });

    this.addCommand({
      id: 'preview-selection-or-note',
      name: t('command.preview'),
      editorCallback: (editor) => {
        void this.openConverterSidebar(editor, true);
      },
    });
  }

  private convertSelectionOrNote(editor: Editor): void {
    const hasSelection = editor.somethingSelected();
    const original = hasSelection ? editor.getSelection() : editor.getValue();
    const result = convertChatGPTToObsidian(original, this.settings);

    if (hasSelection) editor.replaceSelection(result.output);
    else editor.setValue(result.output);
    new Notice(result.changed ? t('notice.applied') : t('notice.unchanged'));
  }

  private async openConverterSidebar(editor?: Editor, wholeNoteIfNoSelection = false): Promise<void> {
    let leaf = this.app.workspace.getLeavesOfType(CONVERTER_VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) ?? undefined;
    }
    if (!leaf) return;

    if (leaf.getViewState().type !== CONVERTER_VIEW_TYPE) {
      await leaf.setViewState({ type: CONVERTER_VIEW_TYPE, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);

    const view = leaf.view;
    if (!(view instanceof ConverterSidebarView)) return;
    if (editor) view.captureFromEditor(editor, wholeNoteIfNoSelection);
    else view.captureActiveSelection();
  }

  private getConverterView(): ConverterSidebarView | null {
    const leaf = this.app.workspace.getLeavesOfType(CONVERTER_VIEW_TYPE)[0];
    return leaf?.view instanceof ConverterSidebarView ? leaf.view : null;
  }

  private syncSidebarSelection(): void {
    this.getConverterView()?.captureActiveSelection();
  }
}
