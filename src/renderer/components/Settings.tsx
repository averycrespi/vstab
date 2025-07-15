/** @jsxImportSource react */
import { useState, useEffect } from 'react';
import { AppSettings, Theme, LogLevel } from '@shared/types';
import { logger } from '../logger';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      logger.info('Loading settings', 'settings-ui');
      window.vstab
        .getSettings()
        .then((loadedSettings: AppSettings) => {
          logger.debug('Settings loaded', 'settings-ui', {
            settings: loadedSettings,
          });
          setSettings(loadedSettings);
        })
        .catch((error: any) => {
          logger.error('Error loading settings', 'settings-ui', error);
          console.error('Error loading settings:', error);
        });
    }
  }, [isOpen]);

  const handleThemeChange = (theme: Theme) => {
    if (!settings) return;
    updateSettings({ ...settings, theme });
  };

  const handleTabBarHeightChange = (height: number) => {
    if (!settings) return;
    updateSettings({ ...settings, tabBarHeight: height });
  };

  const handleAutoResizeVerticalChange = (enabled: boolean) => {
    if (!settings) return;
    updateSettings({ ...settings, autoResizeVertical: enabled });
  };

  const handleAutoResizeHorizontalChange = (enabled: boolean) => {
    if (!settings) return;
    updateSettings({ ...settings, autoResizeHorizontal: enabled });
  };

  const handleLogLevelChange = (logLevel: LogLevel) => {
    if (!settings) return;
    updateSettings({ ...settings, logLevel });
  };

  const handleLogRetentionChange = (days: number) => {
    if (!settings) return;
    updateSettings({ ...settings, logRetentionDays: days });
  };

  const handleMaxLogFileSizeChange = (sizeMB: number) => {
    if (!settings) return;
    updateSettings({ ...settings, maxLogFileSizeMB: sizeMB });
  };

  const updateSettings = async (newSettings: AppSettings) => {
    setSaving(true);
    try {
      logger.info('Updating settings', 'settings-ui', {
        settings: newSettings,
      });
      const updatedSettings = await window.vstab.updateSettings(newSettings);
      setSettings(updatedSettings);

      // Apply theme immediately
      document.documentElement.setAttribute(
        'data-theme',
        updatedSettings.theme
      );

      // Trigger window resize if needed
      if (
        settings &&
        (settings.tabBarHeight !== updatedSettings.tabBarHeight ||
          settings.autoResizeVertical !== updatedSettings.autoResizeVertical ||
          settings.autoResizeHorizontal !==
            updatedSettings.autoResizeHorizontal)
      ) {
        await window.vstab.resizeWindows(updatedSettings.tabBarHeight);
      }
    } catch (error: any) {
      logger.error('Error updating settings', 'settings-ui', error);
      console.error('Error updating settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !settings) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[var(--color-vscode-tab-inactive)] border border-[var(--color-vscode-border)] rounded-lg p-6 w-96"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4 text-[var(--color-vscode-text)]">
          Settings
        </h2>

        {/* Theme Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-[var(--color-vscode-text)]">
            Theme
          </label>
          <select
            value={settings.theme}
            onChange={e => handleThemeChange(e.target.value as Theme)}
            className="w-full px-3 py-2 bg-[var(--color-vscode-dark)] border border-[var(--color-vscode-border)] rounded text-[var(--color-vscode-text)]"
            disabled={saving}
          >
            <option value="system">Match System</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        {/* Tab Bar Height */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-[var(--color-vscode-text)]">
            Tab Bar Height: {settings.tabBarHeight}px
          </label>
          <input
            type="range"
            min="25"
            max="60"
            value={settings.tabBarHeight}
            onChange={e => handleTabBarHeightChange(Number(e.target.value))}
            className="w-full"
            disabled={saving}
          />
        </div>

        {/* Auto Resize Options */}
        <div className="mb-4">
          <label className="flex items-center text-sm text-[var(--color-vscode-text)]">
            <input
              type="checkbox"
              checked={settings.autoResizeVertical}
              onChange={e => handleAutoResizeVerticalChange(e.target.checked)}
              className="mr-2"
              disabled={saving}
            />
            Auto Resize Vertical
          </label>
        </div>

        <div className="mb-4">
          <label className="flex items-center text-sm text-[var(--color-vscode-text)]">
            <input
              type="checkbox"
              checked={settings.autoResizeHorizontal}
              onChange={e => handleAutoResizeHorizontalChange(e.target.checked)}
              className="mr-2"
              disabled={saving}
            />
            Auto Resize Horizontal
          </label>
        </div>

        {/* Logging Settings */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-3 text-[var(--color-vscode-text)]">
            Logging Settings
          </h3>

          {/* Log Level */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-[var(--color-vscode-text)]">
              Log Level
            </label>
            <select
              value={settings.logLevel}
              onChange={e => handleLogLevelChange(e.target.value as LogLevel)}
              className="w-full px-3 py-2 bg-[var(--color-vscode-dark)] border border-[var(--color-vscode-border)] rounded text-[var(--color-vscode-text)]"
              disabled={saving}
            >
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          {/* Log Retention */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-[var(--color-vscode-text)]">
              Log Retention: {settings.logRetentionDays} days
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={settings.logRetentionDays}
              onChange={e => handleLogRetentionChange(Number(e.target.value))}
              className="w-full"
              disabled={saving}
            />
          </div>

          {/* Max Log File Size */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-[var(--color-vscode-text)]">
              Max Log File Size: {settings.maxLogFileSizeMB}MB
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={settings.maxLogFileSizeMB}
              onChange={e => handleMaxLogFileSizeChange(Number(e.target.value))}
              className="w-full"
              disabled={saving}
            />
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--color-vscode-dark)] border border-[var(--color-vscode-border)] rounded text-[var(--color-vscode-text)] hover:bg-[var(--color-vscode-tab-active)]"
            disabled={saving}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
