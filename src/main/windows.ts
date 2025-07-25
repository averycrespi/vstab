import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import { EditorWindow, EditorDetectionConfig } from '@shared/types';
import { logger } from '@shared/logger';
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
  const hash = createHash('md5')
    .update(`${workspacePath}-${pid}`)
    .digest('hex');
  return hash.substring(0, 8); // Use first 8 characters for readability
}

function isEditorWindow(
  window: YabaiWindow,
  editorConfig: EditorDetectionConfig
): boolean {
  return editorConfig.editors.some(editor =>
    editor.appNamePatterns.some(pattern => window.app.includes(pattern))
  );
}

async function isYabaiAvailable(): Promise<boolean> {
  try {
    await execAsync('which yabai');
    return true;
  } catch {
    return false;
  }
}

async function discoverEditorWindowsYabai(): Promise<EditorWindow[]> {
  logger.debug('Starting yabai editor window discovery', 'windows');

  try {
    const settings = await loadSettings();
    const { stdout } = await execAsync('yabai -m query --windows');
    const windows: YabaiWindow[] = JSON.parse(stdout);

    // Filter for supported editor windows
    const editorWindows = windows.filter(window =>
      isEditorWindow(window, settings.editorDetectionConfig)
    );

    logger.debug('Found editor windows via yabai', 'windows', {
      windowCount: editorWindows.length,
      editorConfig: settings.editorDetectionConfig,
    });

    // Track currently active window IDs for cleanup
    const currentWindowIds = new Set<string>();

    const result: EditorWindow[] = editorWindows.map(window => {
      // Extract workspace path from title
      let path = window.title || window.app;
      if (window.title.includes(' — ')) {
        path = window.title.split(' — ')[1] || window.title;
      }

      const stableId = generateStableWindowId(window.title, window.pid);
      currentWindowIds.add(stableId);

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
          height: window.frame.h,
        },
        yabaiMetadata: {
          space: window.space,
          display: window.display,
          pid: window.pid,
          isVisible: window['is-visible'],
          isMinimized: window['is-minimized'],
        },
      };
    });

    // Clean up stale entries from windowIdMap to prevent memory leaks
    const mapSizeBefore = windowIdMap.size;
    const staleIds: string[] = [];

    for (const [stableId] of windowIdMap) {
      if (!currentWindowIds.has(stableId)) {
        staleIds.push(stableId);
      }
    }

    staleIds.forEach(id => windowIdMap.delete(id));

    if (staleIds.length > 0) {
      logger.debug('Cleaned up stale window ID mappings', 'windows', {
        removedCount: staleIds.length,
        mapSizeBefore,
        mapSizeAfter: windowIdMap.size,
      });
    }

    logger.debug('Discovered windows via yabai', 'windows', {
      windows: result,
    });
    return result;
  } catch (error) {
    logger.error('Error executing yabai query', 'windows', error);
    console.error('Error executing yabai query:', error);
    // Clear the map when error occurs to prevent stale data accumulation
    if (windowIdMap.size > 0) {
      logger.debug('Clearing window ID map due to discovery error', 'windows', {
        clearedEntries: windowIdMap.size,
      });
      windowIdMap.clear();
    }
    return [];
  }
}

export async function discoverEditorWindows(): Promise<EditorWindow[]> {
  logger.debug('Starting editor window discovery', 'windows');

  if (!(await isYabaiAvailable())) {
    throw new Error(
      'yabai is required but not available. Please install yabai: brew install koekeishiya/formulae/yabai'
    );
  }

  logger.debug('Using yabai for window discovery', 'windows');
  return await discoverEditorWindowsYabai();
}

export async function focusWindow(windowId: string): Promise<void> {
  logger.info('Focusing window', 'windows', { windowId });

  if (!windowIdMap.has(windowId)) {
    throw new Error(`Window ID ${windowId} not found in current window map`);
  }

  const yabaiWindowId = windowIdMap.get(windowId)!;
  try {
    logger.debug('Focusing window via yabai', 'windows', { yabaiWindowId });
    await execAsync(`yabai -m window --focus ${yabaiWindowId}`);
    logger.info('Window focused successfully via yabai', 'windows');
  } catch (error) {
    logger.error('Error focusing window via yabai', 'windows', error);
    throw new Error(`Failed to focus window ${windowId} via yabai: ${error}`);
  }
}

export async function hideWindow(windowId: string): Promise<void> {
  logger.debug('Hiding window', 'windows', { windowId });

  // Don't actually hide/minimize windows - just log the action
  // Windows will stay visible and can be switched between via the tab bar
  logger.info(
    'Window hide requested but not minimizing - keeping windows visible for tab switching',
    'windows'
  );
}

export async function getFrontmostApp(): Promise<string> {
  try {
    // Get all windows and find the focused one
    const { stdout } = await execAsync('yabai -m query --windows');
    const windows: YabaiWindow[] = JSON.parse(stdout);

    const focusedWindow = windows.find(window => window['has-focus']);
    if (focusedWindow) {
      logger.debug('Frontmost app via yabai', 'windows', {
        app: focusedWindow.app,
      });
      return focusedWindow.app;
    }

    logger.debug('No focused window found via yabai', 'windows');
    return '';
  } catch (error) {
    logger.error('Error getting frontmost app via yabai', 'windows', error);
    console.error('Error getting frontmost app via yabai:', error);
    return '';
  }
}

export async function resizeEditorWindows(tabBarHeight: number): Promise<void> {
  logger.info('Resizing editor windows', 'windows', { tabBarHeight });

  try {
    // Load settings to check if resizing is enabled
    const settings = await loadSettings();

    // If neither vertical nor horizontal resize is enabled, skip resizing
    if (
      !settings.autoResizeEditorsVertically &&
      !settings.autoResizeEditorsHorizontally
    ) {
      logger.info('Window resizing disabled in settings', 'windows');
      return;
    }

    // Get all editor windows via yabai
    const { stdout } = await execAsync('yabai -m query --windows');
    const windows: YabaiWindow[] = JSON.parse(stdout);

    const editorWindows = windows.filter(window =>
      isEditorWindow(window, settings.editorDetectionConfig)
    );

    logger.debug('Found editor windows to resize', 'windows', {
      windowCount: editorWindows.length,
      editorConfig: settings.editorDetectionConfig,
    });

    // Get display bounds to ensure proper positioning
    const { stdout: displaysOutput } = await execAsync(
      'yabai -m query --displays'
    );
    const displays = JSON.parse(displaysOutput);

    // Resize each editor window to account for tab bar
    for (const window of editorWindows) {
      // Find the display this window is on
      const display = displays.find((d: any) => d.index === window.display);
      if (!display) continue;

      // Calculate new position and size
      // Editor windows should start below the tab bar with configurable top margin
      const totalOffset = tabBarHeight + settings.editorTopMargin;

      // Calculate dimensions based on settings
      const newY = settings.autoResizeEditorsVertically
        ? display.frame.y + totalOffset
        : window.frame.y;
      const newHeight = settings.autoResizeEditorsVertically
        ? display.frame.h - totalOffset - settings.editorBottomMargin
        : window.frame.h;
      const newX = settings.autoResizeEditorsHorizontally
        ? display.frame.x
        : window.frame.x;
      const newWidth = settings.autoResizeEditorsHorizontally
        ? display.frame.w
        : window.frame.w;

      try {
        // Use grid positioning for more reliable results
        logger.debug('Setting window grid position and size', 'windows', {
          windowId: window.id,
        });

        // Only move/resize if the respective setting is enabled
        if (
          settings.autoResizeEditorsHorizontally ||
          settings.autoResizeEditorsVertically
        ) {
          // First, move the window to the correct position
          await execAsync(
            `yabai -m window ${window.id} --move abs:${newX}:${newY}`
          );

          // Then resize to correct dimensions
          await execAsync(
            `yabai -m window ${window.id} --resize abs:${newWidth}:${newHeight}`
          );

          logger.info('Window positioned and resized', 'windows', {
            windowId: window.id,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
          });
        }
      } catch (windowError) {
        logger.error('Error resizing individual window', 'windows', {
          windowId: window.id,
          error: windowError,
        });

        // Fallback: try using grid system
        try {
          logger.debug('Trying grid fallback for window', 'windows', {
            windowId: window.id,
          });
          if (
            settings.autoResizeEditorsVertically &&
            settings.autoResizeEditorsHorizontally
          ) {
            await execAsync(`yabai -m window ${window.id} --grid 1:1:0:0:1:1`);
          }
          await execAsync(
            `yabai -m window ${window.id} --move abs:${newX}:${newY}`
          );
          await execAsync(
            `yabai -m window ${window.id} --resize abs:${newWidth}:${newHeight}`
          );
        } catch (gridError) {
          logger.error('Grid fallback also failed for window', 'windows', {
            windowId: window.id,
            error: gridError,
          });
        }
      }
    }

    logger.info('Editor window resize process completed', 'windows');
  } catch (error) {
    logger.error('Error resizing windows via yabai', 'windows', error);
    console.error('Error resizing windows via yabai:', error);
  }
}
