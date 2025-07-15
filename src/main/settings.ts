import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { AppSettings } from '../shared/types';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'vstab');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'settings.json');

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  tabBarHeight: 45,
  autoHide: true,
  persistTabOrder: true,
  autoResizeVertical: true,
  autoResizeHorizontal: true,
  debugLogging: false,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Merge with defaults to ensure all properties exist
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    // File doesn't exist or is invalid, return defaults
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

export async function initializeSettings(): Promise<AppSettings> {
  try {
    // Check if settings file exists
    await fs.access(SETTINGS_FILE);
    // If it exists, load it
    return await loadSettings();
  } catch {
    // File doesn't exist, create it with defaults
    await saveSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
}

export function getDefaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}
