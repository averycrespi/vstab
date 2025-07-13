import { exec } from 'child_process';
import { promisify } from 'util';
import { VSCodeWindow } from '@shared/types';

const execAsync = promisify(exec);

export async function discoverVSCodeWindows(): Promise<VSCodeWindow[]> {
  // Use a much simpler approach - just get the basic window info
  try {
    const { stdout } = await execAsync(`osascript ${process.cwd()}/get-vscode-windows.applescript`);
    
    if (stdout.trim()) {
      const parts = stdout.trim().split('~');
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
        
        return windows;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error executing AppleScript:', error);
    return [];
  }
}


export async function focusWindow(_windowId: string): Promise<void> {
  // For CGWindowNumber-based IDs, we need to use a different approach
  // First, let's just focus the VS Code application
  const script = `
    tell application "Visual Studio Code" to activate
  `;

  try {
    await execAsync(`osascript -e '${script}'`);
  } catch (error) {
    console.error('Error focusing window:', error);
  }
}

export async function hideWindow(_windowId: string): Promise<void> {
  // For now, just hide the VS Code application
  const script = `
    tell application "Visual Studio Code" to set visible to false
  `;

  try {
    await execAsync(`osascript -e '${script}'`);
  } catch (error) {
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
    return stdout.trim();
  } catch (error) {
    console.error('Error getting frontmost app:', error);
    return '';
  }
}

export async function resizeVSCodeWindows(tabBarHeight: number): Promise<void> {
  try {
    await execAsync(`osascript ${process.cwd()}/resize-vscode-windows.applescript ${tabBarHeight}`);
  } catch (error) {
    console.error('Error resizing windows:', error);
  }
}