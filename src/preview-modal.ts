import { App, Modal, Setting } from 'obsidian';

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
    this.titleEl.setText('Preview conversion');
    this.contentEl.addClass('cgptfmt-preview');

    const grid = this.contentEl.createDiv({ cls: 'cgptfmt-preview-grid' });
    const before = grid.createDiv({ cls: 'cgptfmt-preview-pane' });
    const after = grid.createDiv({ cls: 'cgptfmt-preview-pane' });

    before.createEl('h3', { text: 'Before' });
    const beforeArea = before.createEl('textarea', { cls: 'cgptfmt-preview-text' });
    beforeArea.value = this.original;
    beforeArea.readOnly = true;

    after.createEl('h3', { text: 'After' });
    const afterArea = after.createEl('textarea', { cls: 'cgptfmt-preview-text' });
    afterArea.value = this.converted;
    afterArea.readOnly = true;

    new Setting(this.contentEl)
      .addButton((button) => button.setButtonText('Cancel').onClick(() => this.close()))
      .addButton((button) =>
        button
          .setButtonText('Apply')
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
