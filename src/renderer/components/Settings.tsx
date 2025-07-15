/** @jsxImportSource react */
import { useState, useEffect } from 'react';
import { AppSettings, Theme } from '@shared/types';
import { debugLog } from '@shared/debug';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      debugLog('Loading settings');
      window.vstab
        .getSettings()
        .then((loadedSettings: AppSettings) => {
          debugLog('Settings loaded:', loadedSettings);
          setSettings(loadedSettings);
        })
        .catch((error: any) => {
          debugLog('Error loading settings:', error);
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

  const handleDebugLoggingChange = (enabled: boolean) => {
    if (!settings) return;
    updateSettings({ ...settings, debugLogging: enabled });
  };

  const handleShowTrayIconChange = (enabled: boolean) => {
    if (!settings) return;
    updateSettings({ ...settings, showTrayIcon: enabled });
  };

  const handleTrayClickActionChange = (
    action: 'toggle-window' | 'show-menu'
  ) => {
    if (!settings) return;
    updateSettings({ ...settings, trayClickAction: action });
  };

  const updateSettings = async (newSettings: AppSettings) => {
    setSaving(true);
    try {
      debugLog('Updating settings:', newSettings);
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

      // Trigger tray menu update if needed
      if (
        settings &&
        (settings.showTrayIcon !== updatedSettings.showTrayIcon ||
          settings.trayClickAction !== updatedSettings.trayClickAction)
      ) {
        try {
          await window.vstab.updateTrayMenu();
        } catch (error) {
          debugLog('Error updating tray menu:', error);
          console.error('Error updating tray menu:', error);
        }
      }
    } catch (error: any) {
      debugLog('Error updating settings:', error);
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

        {/* Debug Logging */}
        <div className="mb-6">
          <label className="flex items-center text-sm text-[var(--color-vscode-text)]">
            <input
              type="checkbox"
              checked={settings.debugLogging}
              onChange={e => handleDebugLoggingChange(e.target.checked)}
              className="mr-2"
              disabled={saving}
            />
            Enable Debug Logging
          </label>
        </div>

        {/* Tray Icon Settings */}
        <div className="mb-4">
          <label className="flex items-center text-sm text-[var(--color-vscode-text)]">
            <input
              type="checkbox"
              checked={settings.showTrayIcon}
              onChange={e => handleShowTrayIconChange(e.target.checked)}
              className="mr-2"
              disabled={saving}
            />
            Show Tray Icon
          </label>
        </div>

        {settings.showTrayIcon && (
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-[var(--color-vscode-text)]">
              Tray Click Action
            </label>
            <select
              value={settings.trayClickAction}
              onChange={e =>
                handleTrayClickActionChange(
                  e.target.value as 'toggle-window' | 'show-menu'
                )
              }
              className="w-full px-3 py-2 bg-[var(--color-vscode-dark)] border border-[var(--color-vscode-border)] rounded text-[var(--color-vscode-text)]"
              disabled={saving}
            >
              <option value="toggle-window">Toggle Window</option>
              <option value="show-menu">Show Menu</option>
            </select>
          </div>
        )}

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
