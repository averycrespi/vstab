import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

const USER_DATA_PATH = app.getPath('userData');
const TAB_ORDER_FILE = path.join(USER_DATA_PATH, 'tab-order.json');

export async function loadTabOrder(): Promise<string[]> {
  try {
    const data = await fs.readFile(TAB_ORDER_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid
    return [];
  }
}

export async function saveTabOrder(windowIds: string[]): Promise<void> {
  try {
    await fs.mkdir(USER_DATA_PATH, { recursive: true });
    await fs.writeFile(TAB_ORDER_FILE, JSON.stringify(windowIds, null, 2));
  } catch (error) {
    console.error('Error saving tab order:', error);
    throw error;
  }
}