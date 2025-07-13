import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { VSCodeWindow } from '@shared/types';
import { debugLog } from '@shared/debug';

const execAsync = promisify(exec);

// Store mapping between stable IDs and actual yabai window IDs
const windowIdMap = new Map<string, number>();

interface YabaiWindow {
  id: number;
  pid: number;
  app: string;
  title: string;
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  space: number;
  display: number;
  'has-focus': boolean;
  'is-visible': boolean;
  'is-minimized': boolean;
}

function generateStableWindowId(title: string, pid: number): string {
  // Extract workspace path from title for stable identification
  let workspacePath = title;
  if (title.includes(' — ')) {
    // Format: "filename — workspace-name" or "filename — /path/to/workspace"
    workspacePath = title.split(' — ')[1];
  }
  
  // Create hash from workspace path + pid for stability
  const hash = createHash('md5').update(`${workspacePath}-${pid}`).digest('hex');
  return hash.substring(0, 8); // Use first 8 characters for readability
}

async function isYabaiAvailable(): Promise<boolean> {
  try {
    await execAsync('which yabai');
    return true;
  } catch {
    return false;
  }
}

async function discoverVSCodeWindowsYabai(): Promise<VSCodeWindow[]> {
  debugLog('Starting yabai VS Code window discovery');
  
  try {
    const { stdout } = await execAsync('yabai -m query --windows');
    const windows: YabaiWindow[] = JSON.parse(stdout);
    
    // Filter for VS Code windows
    const vscodeWindows = windows.filter(window => 
      window.app.includes('Visual Studio Code') || 
      window.app.includes('Code')
    );
    
    debugLog(`Found ${vscodeWindows.length} VS Code windows via yabai`);
    
    const result: VSCodeWindow[] = vscodeWindows.map(window => {
      // Extract workspace path from title
      let path = window.title || 'VS Code';
      if (window.title.includes(' — ')) {
        path = window.title.split(' — ')[1] || window.title;
      }
      
      const stableId = generateStableWindowId(window.title, window.pid);
      
      // Store mapping for window operations
      windowIdMap.set(stableId, window.id);
      
      return {
        id: stableId,
        title: window.title,
        path,
        isActive: window['has-focus'],
        position: {
          x: window.frame.x,
          y: window.frame.y,
          width: window.frame.w,
          height: window.frame.h
        },
        yabaiMetadata: {
          space: window.space,
          display: window.display,
          pid: window.pid,
          isVisible: window['is-visible'],
          isMinimized: window['is-minimized']
        }
      };
    });
    
    debugLog('Discovered windows via yabai:', result);
    return result;
  } catch (error) {
    debugLog('Error executing yabai query:', error);
    console.error('Error executing yabai query:', error);
    return [];
  }
}

export async function discoverVSCodeWindows(): Promise<VSCodeWindow[]> {
  debugLog('Starting VS Code window discovery');
  
  if (!(await isYabaiAvailable())) {
    throw new Error('yabai is required but not available. Please install yabai: brew install koekeishiya/formulae/yabai');
  }
  
  debugLog('Using yabai for window discovery');
  return await discoverVSCodeWindowsYabai();
}

export async function focusWindow(windowId: string): Promise<void> {
  debugLog('Focusing window:', windowId);
  
  if (!windowIdMap.has(windowId)) {
    throw new Error(`Window ID ${windowId} not found in current window map`);
  }
  
  const yabaiWindowId = windowIdMap.get(windowId)!;
  try {
    debugLog('Focusing window via yabai:', yabaiWindowId);
    await execAsync(`yabai -m window --focus ${yabaiWindowId}`);
    debugLog('Window focused successfully via yabai');
  } catch (error) {
    debugLog('Error focusing window via yabai:', error);
    throw new Error(`Failed to focus window ${windowId} via yabai: ${error}`);
  }
}

export async function hideWindow(windowId: string): Promise<void> {
  debugLog('Hiding window:', windowId);
  
  if (!windowIdMap.has(windowId)) {
    throw new Error(`Window ID ${windowId} not found in current window map`);
  }
  
  const yabaiWindowId = windowIdMap.get(windowId)!;
  try {
    debugLog('Hiding window via yabai:', yabaiWindowId);
    // Use yabai to minimize the specific window
    await execAsync(`yabai -m window ${yabaiWindowId} --minimize`);
    debugLog('Window hidden successfully via yabai');
  } catch (error) {
    debugLog('Error hiding window via yabai:', error);
    throw new Error(`Failed to hide window ${windowId} via yabai: ${error}`);
  }
}

export async function getFrontmostApp(): Promise<string> {
  try {
    // Get all windows and find the focused one
    const { stdout } = await execAsync('yabai -m query --windows');
    const windows: YabaiWindow[] = JSON.parse(stdout);
    
    const focusedWindow = windows.find(window => window['has-focus']);
    if (focusedWindow) {
      debugLog('Frontmost app via yabai:', focusedWindow.app);
      return focusedWindow.app;
    }
    
    debugLog('No focused window found via yabai');
    return '';
  } catch (error) {
    debugLog('Error getting frontmost app via yabai:', error);
    console.error('Error getting frontmost app via yabai:', error);
    return '';
  }
}

export async function resizeVSCodeWindows(tabBarHeight: number): Promise<void> {
  debugLog('Resizing VS Code windows with tab bar height:', tabBarHeight);
  
  try {
    // Get all VS Code windows via yabai
    const { stdout } = await execAsync('yabai -m query --windows');
    const windows: YabaiWindow[] = JSON.parse(stdout);
    
    const vscodeWindows = windows.filter(window => 
      window.app.includes('Visual Studio Code') || 
      window.app.includes('Code')
    );
    
    debugLog(`Found ${vscodeWindows.length} VS Code windows to resize`);
    
    // Resize each VS Code window to account for tab bar
    for (const window of vscodeWindows) {
      const newY = window.frame.y + tabBarHeight;
      const newHeight = window.frame.h - tabBarHeight;
      
      // Only resize if the window would still have reasonable height
      if (newHeight > 100) {
        const resizeCommand = `yabai -m window ${window.id} --resize abs:${window.frame.w}:${newHeight}`;
        const moveCommand = `yabai -m window ${window.id} --move abs:${window.frame.x}:${newY}`;
        
        debugLog(`Resizing window ${window.id}: ${resizeCommand}`);
        debugLog(`Moving window ${window.id}: ${moveCommand}`);
        
        await execAsync(resizeCommand);
        await execAsync(moveCommand);
      }
    }
    
    debugLog('All VS Code windows resized successfully via yabai');
  } catch (error) {
    debugLog('Error resizing windows via yabai:', error);
    console.error('Error resizing windows via yabai:', error);
  }
}