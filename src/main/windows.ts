import { exec } from 'child_process';
import { promisify } from 'util';
import { VSCodeWindow } from '@shared/types';
import { debugLog } from '@shared/debug';

const execAsync = promisify(exec);

export async function discoverVSCodeWindows(): Promise<VSCodeWindow[]> {
  debugLog('Starting VS Code window discovery');
  // Use a much simpler approach - just get the basic window info
  try {
    const scriptPath = `${process.cwd()}/get-vscode-windows.applescript`;
    debugLog('Executing AppleScript:', scriptPath);
    const { stdout } = await execAsync(`osascript ${scriptPath}`);
    debugLog('AppleScript stdout:', stdout);
    
    if (stdout.trim()) {
      const parts = stdout.trim().split('~');
      debugLog('Parsed AppleScript parts:', parts);
      if (parts.length >= 5) {
        const [title, x, y, width, height] = parts;
        
        // Extract workspace path from title
        let path = title || 'VS Code';
        if (title.includes(' — ')) {
          path = title.split(' — ')[1] || title;
        }
        
        const windows = [{
          id: '1', // Simple ID for now
          title: title || 'VS Code',
          path,
          isActive: false,
          position: {
            x: parseInt(x) || 0,
            y: parseInt(y) || 0,
            width: parseInt(width) || 1200,
            height: parseInt(height) || 800
          }
        }];
        
        debugLog('Discovered windows:', windows);
        return windows;
      }
    }
    
    debugLog('No VS Code windows found');
    return [];
  } catch (error) {
    debugLog('Error executing AppleScript:', error);
    console.error('Error executing AppleScript:', error);
    return [];
  }
}


export async function focusWindow(_windowId: string): Promise<void> {
  debugLog('Focusing window:', _windowId);
  // For CGWindowNumber-based IDs, we need to use a different approach
  // First, let's just focus the VS Code application
  const script = `
    tell application "Visual Studio Code" to activate
  `;

  try {
    debugLog('Executing focus AppleScript');
    await execAsync(`osascript -e '${script}'`);
    debugLog('Window focused successfully');
  } catch (error) {
    debugLog('Error focusing window:', error);
    console.error('Error focusing window:', error);
  }
}

export async function hideWindow(_windowId: string): Promise<void> {
  debugLog('Hiding window:', _windowId);
  // For now, just hide the VS Code application
  const script = `
    tell application "Visual Studio Code" to set visible to false
  `;

  try {
    debugLog('Executing hide AppleScript');
    await execAsync(`osascript -e '${script}'`);
    debugLog('Window hidden successfully');
  } catch (error) {
    debugLog('Error hiding window:', error);
    console.error('Error hiding window:', error);
  }
}

export async function getFrontmostApp(): Promise<string> {
  const script = `
    tell application "System Events"
      name of first process whose frontmost is true
    end tell
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const frontmostApp = stdout.trim();
    debugLog('Frontmost app:', frontmostApp);
    return frontmostApp;
  } catch (error) {
    debugLog('Error getting frontmost app:', error);
    console.error('Error getting frontmost app:', error);
    return '';
  }
}

export async function resizeVSCodeWindows(tabBarHeight: number): Promise<void> {
  debugLog('Resizing VS Code windows with tab bar height:', tabBarHeight);
  try {
    const scriptPath = `${process.cwd()}/resize-vscode-windows.applescript`;
    debugLog('Executing resize AppleScript:', scriptPath);
    await execAsync(`osascript ${scriptPath} ${tabBarHeight}`);
    debugLog('Windows resized successfully');
  } catch (error) {
    debugLog('Error resizing windows:', error);
    console.error('Error resizing windows:', error);
  }
}