import { App, PluginSettingTab, Setting } from 'obsidian';
import type ChatGPTPasteFormatterPlugin from './main';
import type { AutoPasteMode, InlineMathMode } from './converter';
import { t } from './i18n';

export class FormatterSettingTab extends PluginSettingTab {
  constructor(app: App, private readonly plugin: ChatGPTPasteFormatterPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName(t('settings.title'))
      .setDesc(t('settings.languageHint'))
      .setHeading();

    new Setting(containerEl)
      .setName(t('settings.autoPaste.name'))
      .setDesc(t('settings.autoPaste.desc'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('off', t('settings.autoPaste.off'))
          .addOption('detected', t('settings.autoPaste.detected'))
          .addOption('always', t('settings.autoPaste.always'))
          .setValue(this.plugin.settings.autoPasteMode)
          .onChange(async (value) => {
            this.plugin.settings.autoPasteMode = value as AutoPasteMode;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings.inlineMath.name'))
      .setDesc(t('settings.inlineMath.desc'))
      .addDropdown((dropdown) =>
        dropdown
          .addOption('strict', t('settings.inlineMath.strict'))
          .addOption('balanced', t('settings.inlineMath.balanced'))
          .addOption('aggressive', t('settings.inlineMath.aggressive'))
          .setValue(this.plugin.settings.inlineMathMode)
          .onChange(async (value) => {
            this.plugin.settings.inlineMathMode = value as InlineMathMode;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings.delimiters.name'))
      .setDesc(t('settings.delimiters.desc'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.convertExplicitLatexDelimiters).onChange(async (value) => {
          this.plugin.settings.convertExplicitLatexDelimiters = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings.displayMath.name'))
      .setDesc(t('settings.displayMath.desc'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.repairMalformedDisplayMath).onChange(async (value) => {
          this.plugin.settings.repairMalformedDisplayMath = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings.escapes.name'))
      .setDesc(t('settings.escapes.desc'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.normalizeMathEscapes).onChange(async (value) => {
          this.plugin.settings.normalizeMathEscapes = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings.relation.name'))
      .setDesc(t('settings.relation.desc'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.repairObviousBrokenRelations).onChange(async (value) => {
          this.plugin.settings.repairObviousBrokenRelations = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings.emphasis.name'))
      .setDesc(t('settings.emphasis.desc'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.cleanEmptyEmphasis).onChange(async (value) => {
          this.plugin.settings.cleanEmptyEmphasis = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName(t('settings.notices.name'))
      .setDesc(t('settings.notices.desc'))
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showNotices).onChange(async (value) => {
          this.plugin.settings.showNotices = value;
          await this.plugin.saveSettings();
        }),
      );
  }
}
