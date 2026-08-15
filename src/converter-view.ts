import { ItemView, MarkdownView, Notice, type Editor, type EditorPosition, type WorkspaceLeaf } from 'obsidian';
import { convertChatGPTToObsidian } from './formatter';
import { t } from './i18n';
import type ChatGPTPasteFormatterPlugin from './main';

export const CONVERTER_VIEW_TYPE = 'chatgpt-paste-formatter-converter';

interface SelectionTarget {
  editor: Editor;
  from: EditorPosition;
  to: EditorPosition;
  original: string;
}

export class ConverterSidebarView extends ItemView {
  private source = '';
  private converted = '';
  private target: SelectionTarget | null = null;
  private sourceArea: HTMLTextAreaElement | null = null;
  private outputArea: HTMLTextAreaElement | null = null;

  constructor(leaf: WorkspaceLeaf, private readonly plugin: ChatGPTPasteFormatterPlugin) {
    super(leaf);
  }

  getViewType(): string {
    return CONVERTER_VIEW_TYPE;
  }

  getDisplayText(): string {
    return t('sidebar.title');
  }

  getIcon(): string {
    return 'wand-sparkles';
  }

  async onOpen(): Promise<void> {
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
    this.sourceArea = null;
    this.outputArea = null;
  }

  captureFromEditor(editor: Editor, wholeNoteIfNoSelection = false): boolean {
    const hasSelection = editor.somethingSelected();
    if (!hasSelection && !wholeNoteIfNoSelection) return false;

    const original = hasSelection ? editor.getSelection() : editor.getValue();
    const from = hasSelection ? editor.getCursor('from') : { line: 0, ch: 0 };
    const lastLine = editor.lastLine();
    const to = hasSelection
      ? editor.getCursor('to')
      : { line: lastLine, ch: editor.getLine(lastLine).length };

    this.target = { editor, from, to, original };
    this.setSource(original);
    return true;
  }

  captureActiveSelection(): boolean {
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!markdownView?.editor.somethingSelected()) return false;
    return this.captureFromEditor(markdownView.editor, false);
  }

  refreshLanguage(): void {
    this.render();
  }

  private setSource(value: string): void {
    if (value === this.source && this.sourceArea) return;
    this.source = value;
    this.refreshConversion();
    if (this.sourceArea) this.sourceArea.value = value;
  }

  private refreshConversion(): void {
    this.converted = this.source
      ? convertChatGPTToObsidian(this.source, this.plugin.settings).output
      : '';
    if (this.outputArea) this.outputArea.value = this.converted;
  }

  private render(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('cgptfmt-sidebar');

    const intro = contentEl.createDiv({ cls: 'cgptfmt-sidebar-intro' });
    intro.createEl('p', { text: t('sidebar.hint') });

    const sourcePane = contentEl.createDiv({ cls: 'cgptfmt-sidebar-pane' });
    sourcePane.createEl('h4', { text: t('sidebar.source') });
    this.sourceArea = sourcePane.createEl('textarea', {
      cls: 'cgptfmt-sidebar-text',
      attr: { placeholder: t('sidebar.sourcePlaceholder') },
    });
    this.sourceArea.value = this.source;
    this.sourceArea.addEventListener('input', () => {
      this.source = this.sourceArea?.value ?? '';
      this.refreshConversion();
    });

    const resultPane = contentEl.createDiv({ cls: 'cgptfmt-sidebar-pane' });
    resultPane.createEl('h4', { text: t('sidebar.result') });
    this.outputArea = resultPane.createEl('textarea', {
      cls: 'cgptfmt-sidebar-text',
      attr: { placeholder: t('sidebar.resultPlaceholder') },
    });
    this.outputArea.value = this.converted;
    this.outputArea.readOnly = true;

    const actions = contentEl.createDiv({ cls: 'cgptfmt-sidebar-actions' });

    const clearButton = actions.createEl('button', { text: t('sidebar.clear') });
    clearButton.addEventListener('click', () => {
      this.source = '';
      this.converted = '';
      this.target = null;
      if (this.sourceArea) this.sourceArea.value = '';
      if (this.outputArea) this.outputArea.value = '';
    });

    const copyButton = actions.createEl('button', { text: t('sidebar.copy') });
    copyButton.addEventListener('click', () => {
      void this.copyResult();
    });

    const applyButton = actions.createEl('button', {
      text: t('sidebar.apply'),
      cls: 'mod-cta',
    });
    applyButton.addEventListener('click', () => this.applyResult());
  }

  private async copyResult(): Promise<void> {
    if (!this.converted) {
      new Notice(t('sidebar.empty'));
      return;
    }

    try {
      await navigator.clipboard.writeText(this.converted);
      new Notice(t('sidebar.copied'));
    } catch {
      new Notice(t('sidebar.copyFailed'));
    }
  }

  private applyResult(): void {
    if (!this.source) {
      new Notice(t('sidebar.empty'));
      return;
    }
    if (!this.target) {
      new Notice(t('sidebar.noTarget'));
      return;
    }

    const changed = this.converted !== this.target.original;
    this.target.editor.replaceRange(this.converted, this.target.from, this.target.to);
    this.target = null;
    new Notice(changed ? t('notice.applied') : t('notice.unchanged'));
  }
}
