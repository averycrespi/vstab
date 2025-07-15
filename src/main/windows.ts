import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { VSCodeWindow } from '@shared/types';
import { debugLog } from '@shared/debug';
import { loadSettings } from './settings';

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
  
  // Don't actually hide/minimize windows - just log the action
  // Windows will stay visible and can be switched between via the tab bar
  debugLog('Window hide requested but not minimizing - keeping windows visible for tab switching');
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
    // Load settings to check if resizing is enabled
    const settings = await loadSettings();
    
    // If neither vertical nor horizontal resize is enabled, skip resizing
    if (!settings.autoResizeVertical && !settings.autoResizeHorizontal) {
      debugLog('Window resizing disabled in settings');
      return;
    }
    
    // Get all VS Code windows via yabai
    const { stdout } = await execAsync('yabai -m query --windows');
    const windows: YabaiWindow[] = JSON.parse(stdout);
    
    const vscodeWindows = windows.filter(window => 
      window.app.includes('Visual Studio Code') || 
      window.app.includes('Code')
    );
    
    debugLog(`Found ${vscodeWindows.length} VS Code windows to resize`);
    
    // Get display bounds to ensure proper positioning
    const { stdout: displaysOutput } = await execAsync('yabai -m query --displays');
    const displays = JSON.parse(displaysOutput);
    
    // Resize each VS Code window to account for tab bar
    for (const window of vscodeWindows) {
      // Find the display this window is on
      const display = displays.find((d: any) => d.index === window.display);
      if (!display) continue;
      
      // Calculate new position and size
      // VS Code windows should start below the tab bar with extra buffer to avoid overlap
      const BUFFER_PIXELS = 10; // Additional buffer to ensure no overlap
      const totalOffset = tabBarHeight + BUFFER_PIXELS;
      
      // Calculate dimensions based on settings
      const newY = settings.autoResizeVertical ? display.frame.y + totalOffset : window.frame.y;
      const newHeight = settings.autoResizeVertical ? display.frame.h - totalOffset : window.frame.h;
      const newX = settings.autoResizeHorizontal ? display.frame.x : window.frame.x;
      const newWidth = settings.autoResizeHorizontal ? display.frame.w : window.frame.w;
      
      try {
        // Use grid positioning for more reliable results
        debugLog(`Setting window ${window.id} grid position and size`);
        
        // Only move/resize if the respective setting is enabled
        if (settings.autoResizeHorizontal || settings.autoResizeVertical) {
          // First, move the window to the correct position
          await execAsync(`yabai -m window ${window.id} --move abs:${newX}:${newY}`);
          
          // Then resize to correct dimensions
          await execAsync(`yabai -m window ${window.id} --resize abs:${newWidth}:${newHeight}`);
          
          debugLog(`Window ${window.id} positioned at (${newX}, ${newY}) with size ${newWidth}x${newHeight}`);
        }
      } catch (windowError) {
        debugLog(`Error resizing individual window ${window.id}:`, windowError);
        
        // Fallback: try using grid system
        try {
          debugLog(`Trying grid fallback for window ${window.id}`);
          if (settings.autoResizeVertical && settings.autoResizeHorizontal) {
            await execAsync(`yabai -m window ${window.id} --grid 1:1:0:0:1:1`);
          }
          await execAsync(`yabai -m window ${window.id} --move abs:${newX}:${newY}`);
          await execAsync(`yabai -m window ${window.id} --resize abs:${newWidth}:${newHeight}`);
        } catch (gridError) {
          debugLog(`Grid fallback also failed for window ${window.id}:`, gridError);
        }
      }
    }
    
    debugLog('VS Code window resize process completed');
  } catch (error) {
    debugLog('Error resizing windows via yabai:', error);
    console.error('Error resizing windows via yabai:', error);
  }
}