import { App, Modal, Setting } from 'obsidian';
import { t } from './i18n';

export class ConversionPreviewModal extends Modal {
  constructor(
    app: App,
    private readonly original: string,
    private readonly converted: string,
    private readonly onApply: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.titleEl.setText(t('preview.title'));
    this.contentEl.addClass('cgptfmt-preview');

    const grid = this.contentEl.createDiv({ cls: 'cgptfmt-preview-grid' });
    const before = grid.createDiv({ cls: 'cgptfmt-preview-pane' });
    const after = grid.createDiv({ cls: 'cgptfmt-preview-pane' });

    before.createEl('h3', { text: t('preview.before') });
    const beforeArea = before.createEl('textarea', { cls: 'cgptfmt-preview-text' });
    beforeArea.value = this.original;
    beforeArea.readOnly = true;

    after.createEl('h3', { text: t('preview.after') });
    const afterArea = after.createEl('textarea', { cls: 'cgptfmt-preview-text' });
    afterArea.value = this.converted;
    afterArea.readOnly = true;

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText(t('preview.cancel')).onClick(() => this.close()))
      .addButton((button) =>
        button
          .setButtonText(t('preview.apply'))
          .setCta()
          .onClick(() => {
            this.onApply();
            this.close();
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
