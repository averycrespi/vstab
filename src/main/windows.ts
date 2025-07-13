import { exec } from 'child_process';
import { promisify } from 'util';
import { VSCodeWindow } from '@shared/types';

const execAsync = promisify(exec);

export async function discoverVSCodeWindows(): Promise<VSCodeWindow[]> {
  const script = `
    tell application "System Events"
      set vscodeWindows to {}
      set vscodeProcesses to every process whose name contains "Code"
      
      repeat with proc in vscodeProcesses
        set procName to name of proc
        set windowList to windows of proc
        
        repeat with win in windowList
          set winTitle to name of win
          set winPosition to position of win
          set winSize to size of win
          set winId to id of win as string
          
          set windowInfo to {id:winId, title:winTitle, processName:procName, x:item 1 of winPosition, y:item 2 of winPosition, width:item 1 of winSize, height:item 2 of winSize}
          set end of vscodeWindows to windowInfo
        end repeat
      end repeat
      
      return vscodeWindows
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
  // Parse the AppleScript record format
  // Example: {id:"12345", title:"project-name", processName:"Code", x:100, y:100, width:1200, height:800}
  const windows: VSCodeWindow[] = [];
  
  // Split by window records
  const windowMatches = output.matchAll(/\{id:"([^"]+)", title:"([^"]+)", processName:"([^"]+)", x:(\d+), y:(\d+), width:(\d+), height:(\d+)\}/g);
  
  for (const match of windowMatches) {
    const [_, id, title, _processName, x, y, width, height] = match;
    
    // Extract workspace path from title (VS Code usually shows "filename - folder - Visual Studio Code")
    const pathMatch = title.match(/^.*? - (.*?) - Visual Studio Code$/);
    const path = pathMatch ? pathMatch[1] : title;
    
    windows.push({
      id,
      title,
      path,
      isActive: false, // Will be determined separately
      position: {
        x: parseInt(x),
        y: parseInt(y),
        width: parseInt(width),
        height: parseInt(height)
      }
    });
  }
  
  return windows;
}

export async function focusWindow(windowId: string): Promise<void> {
  const script = `
    tell application "System Events"
      set vscodeProcesses to every process whose name contains "Code"
      
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
      set vscodeProcesses to every process whose name contains "Code"
      
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
      set vscodeProcesses to every process whose name contains "Code"
      
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