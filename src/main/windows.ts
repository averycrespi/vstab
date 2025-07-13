import { exec } from 'child_process';
import { promisify } from 'util';
import { VSCodeWindow } from '@shared/types';

const execAsync = promisify(exec);

export async function discoverVSCodeWindows(): Promise<VSCodeWindow[]> {
  const script = `
    tell application "System Events"
      set vscodeWindows to {}
      set vscodeProcesses to every process whose bundle identifier is "com.microsoft.VSCode"
      
      repeat with proc in vscodeProcesses
        set procName to name of proc
        set windowList to windows of proc
        
        repeat with win in windowList
          try
            set winTitle to name of win
            set winPosition to position of win
            set winSize to size of win
            set winId to id of win as string
            
            -- Format as delimited string for easier parsing
            set windowInfo to winId & "|" & winTitle & "|" & procName & "|" & (item 1 of winPosition) & "|" & (item 2 of winPosition) & "|" & (item 1 of winSize) & "|" & (item 2 of winSize)
            set end of vscodeWindows to windowInfo
          end try
        end repeat
      end repeat
      
      set AppleScript's text item delimiters to linefeed
      set windowsText to vscodeWindows as string
      set AppleScript's text item delimiters to ""
      
      return windowsText
    end tell
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    return parseAppleScriptOutput(stdout);
  } catch (error) {
    console.error('Error executing AppleScript:', error);
    return [];
  }
}

function parseAppleScriptOutput(output: string): VSCodeWindow[] {
  // Parse the delimited format: id|title|processName|x|y|width|height
  const windows: VSCodeWindow[] = [];
  
  if (!output.trim()) {
    return windows;
  }
  
  const lines = output.trim().split('\n');
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split('|');
    if (parts.length >= 7) {
      const [id, title, , x, y, width, height] = parts;
      
      // Bundle identifier already filters for VS Code processes, no need for additional filtering
      
      // Extract workspace path from title
      // VS Code patterns: "filename - folder - Visual Studio Code" or just "folder - Visual Studio Code"
      let path = title;
      const vscodeMatch = title.match(/^(.*?) - Visual Studio Code$/);
      if (vscodeMatch) {
        const titlePart = vscodeMatch[1];
        // If it has " - " in it, take the last part as the workspace
        const dashIndex = titlePart.lastIndexOf(' - ');
        path = dashIndex !== -1 ? titlePart.substring(dashIndex + 3) : titlePart;
      }
      
      windows.push({
        id,
        title,
        path,
        isActive: false, // Will be determined separately
        position: {
          x: parseInt(x) || 0,
          y: parseInt(y) || 0,
          width: parseInt(width) || 1200,
          height: parseInt(height) || 800
        }
      });
    }
  }
  
  return windows;
}

export async function focusWindow(windowId: string): Promise<void> {
  const script = `
    tell application "System Events"
      set vscodeProcesses to every process whose bundle identifier is "com.microsoft.VSCode"
      
      repeat with proc in vscodeProcesses
        set windowList to windows of proc
        repeat with win in windowList
          if id of win as string is "${windowId}" then
            set frontmost of proc to true
            perform action "AXRaise" of win
            return
          end if
        end repeat
      end repeat
    end tell
  `;

  try {
    await execAsync(`osascript -e '${script}'`);
  } catch (error) {
    console.error('Error focusing window:', error);
  }
}

export async function hideWindow(windowId: string): Promise<void> {
  const script = `
    tell application "System Events"
      set vscodeProcesses to every process whose bundle identifier is "com.microsoft.VSCode"
      
      repeat with proc in vscodeProcesses
        set windowList to windows of proc
        repeat with win in windowList
          if id of win as string is "${windowId}" then
            set visible of win to false
            return
          end if
        end repeat
      end repeat
    end tell
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
  const script = `
    tell application "System Events"
      set vscodeProcesses to every process whose bundle identifier is "com.microsoft.VSCode"
      
      repeat with proc in vscodeProcesses
        set windowList to windows of proc
        repeat with win in windowList
          set winPosition to position of win
          set winSize to size of win
          
          -- Move window down by tab bar height if at top
          if item 2 of winPosition < ${tabBarHeight} then
            set position of win to {item 1 of winPosition, ${tabBarHeight}}
            set size of win to {item 1 of winSize, (item 2 of winSize) - ${tabBarHeight}}
          end if
        end repeat
      end repeat
    end tell
  `;

  try {
    await execAsync(`osascript -e '${script}'`);
  } catch (error) {
    console.error('Error resizing windows:', error);
  }
}