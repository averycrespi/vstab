import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { logger } from '@shared/logger';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'vstab');
const TAB_ORDER_FILE = path.join(CONFIG_DIR, 'tab_order.json');

export async function loadTabOrder(): Promise<string[]> {
  try {
    logger.debug('Loading tab order from file', 'persistence', {
      file: TAB_ORDER_FILE,
    });
    const data = await fs.readFile(TAB_ORDER_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    // Ensure we return an array of strings
    if (Array.isArray(parsed)) {
      logger.debug('Tab order loaded successfully', 'persistence', {
        order: parsed,
      });
      return parsed;
    }
    logger.warn(
      'Tab order file contains invalid data, returning empty array',
      'persistence',
      { data: parsed }
    );
    return [];
  } catch (error) {
    // File doesn't exist or is invalid
    logger.debug(
      'Tab order file not found or invalid, returning empty array',
      'persistence',
      error
    );
    return [];
  }
}

export async function saveTabOrder(windowIds: string[]): Promise<void> {
  try {
    logger.debug('Saving tab order to file', 'persistence', {
      order: windowIds,
      file: TAB_ORDER_FILE,
    });
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(TAB_ORDER_FILE, JSON.stringify(windowIds, null, 2));
    logger.info('Tab order saved successfully', 'persistence', {
      windowCount: windowIds.length,
    });
  } catch (error) {
    logger.error('Error saving tab order', 'persistence', error);
    console.error('Error saving tab order:', error);
    throw error;
  }
}
