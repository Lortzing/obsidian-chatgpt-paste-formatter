import { App, PluginSettingTab, Setting } from 'obsidian';
import type ChatGPTPasteFormatterPlugin from './main';
import type { AutoPasteMode, InlineMathMode } from './converter';

export class FormatterSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ChatGPTPasteFormatterPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Automatic paste conversion')
      .setDesc('Detected only is the safer default: normal clipboard text is left untouched.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('off', 'Off')
          .addOption('detected', 'Detected ChatGPT/math copies only')
          .addOption('always', 'Always convert pasted text')
          .setValue(this.plugin.settings.autoPasteMode)
          .onChange(async (value) => {
            this.plugin.settings.autoPasteMode = value as AutoPasteMode;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Inline math detection')
      .setDesc('Balanced converts obvious LaTeX and contextual variables such as Chinese prose followed by (x).')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('strict', 'Strict')
          .addOption('balanced', 'Balanced')
          .addOption('aggressive', 'Aggressive')
          .setValue(this.plugin.settings.inlineMathMode)
          .onChange(async (value) => {
            this.plugin.settings.inlineMathMode = value as InlineMathMode;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName('Convert LaTeX delimiters')
      .setDesc('Convert \\(...\\) to $...$ and \\[...\\] to $$...$$.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.convertExplicitLatexDelimiters).onChange(async (value) => {
          this.plugin.settings.convertExplicitLatexDelimiters = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Repair copied display math')
      .setDesc('Repair ChatGPT clipboard artifacts such as standalone [ ... ] blocks and “# [ formula” lines.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.repairMalformedDisplayMath).onChange(async (value) => {
          this.plugin.settings.repairMalformedDisplayMath = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Normalize escaped math symbols')
      .setDesc('Inside detected math only, convert copied escapes such as U\\_r and \\+ back to U_r and +.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.normalizeMathEscapes).onChange(async (value) => {
          this.plugin.settings.normalizeMathEscapes = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Repair obvious missing relation')
      .setDesc('For malformed “# [ LHS” equation blocks, insert an equals sign only when the first two lines look unambiguously like LHS/RHS.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.repairObviousBrokenRelations).onChange(async (value) => {
          this.plugin.settings.repairObviousBrokenRelations = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Clean empty emphasis artifacts')
      .setDesc('Optional and off by default. Removing ** ** can merge adjacent emphasis spans, so enable only if your clipboard format needs it.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.cleanEmptyEmphasis).onChange(async (value) => {
          this.plugin.settings.cleanEmptyEmphasis = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName('Show conversion notices')
      .setDesc('Show a short notice after manual conversions.')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showNotices).onChange(async (value) => {
          this.plugin.settings.showNotices = value;
          await this.plugin.saveSettings();
        }),
      );
  }
}
