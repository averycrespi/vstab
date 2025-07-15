// Mock yabai functionality for testing

export interface MockYabaiWindow {
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

export interface MockYabaiDisplay {
  index: number;
  frame: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  'has-focus': boolean;
}

class YabaiMock {
  private windows: MockYabaiWindow[] = [];
  private displays: MockYabaiDisplay[] = [
    {
      index: 1,
      frame: { x: 0, y: 0, w: 1920, h: 1080 },
      'has-focus': true,
    },
  ];
  private isAvailable = true;
  private commandHistory: string[] = [];

  // Set up default VS Code windows
  constructor() {
    this.resetToDefaults();
  }

  resetToDefaults() {
    this.windows = [
      {
        id: 1001,
        pid: 12345,
        app: 'Visual Studio Code',
        title: 'main.ts — vstab',
        frame: { x: 0, y: 45, w: 1920, h: 1035 },
        space: 1,
        display: 1,
        'has-focus': true,
        'is-visible': true,
        'is-minimized': false,
      },
      {
        id: 1002,
        pid: 12346,
        app: 'Visual Studio Code',
        title: 'App.tsx — my-project',
        frame: { x: 0, y: 45, w: 1920, h: 1035 },
        space: 1,
        display: 1,
        'has-focus': false,
        'is-visible': true,
        'is-minimized': false,
      },
    ];
    this.commandHistory = [];
  }

  setWindows(windows: MockYabaiWindow[]) {
    this.windows = [...windows];
  }

  setDisplays(displays: MockYabaiDisplay[]) {
    this.displays = [...displays];
  }

  setAvailable(available: boolean) {
    this.isAvailable = available;
  }

  getCommandHistory() {
    return [...this.commandHistory];
  }

  clearCommandHistory() {
    this.commandHistory = [];
  }

  // Mock yabai command execution
  executeCommand(command: string): { stdout: string; stderr: string } {
    this.commandHistory.push(command);

    if (!this.isAvailable && command !== 'which yabai') {
      throw new Error('yabai: command not found');
    }

    if (command === 'which yabai') {
      if (this.isAvailable) {
        return { stdout: '/usr/local/bin/yabai', stderr: '' };
      } else {
        throw new Error('yabai: command not found');
      }
    }

    if (command.includes('query --windows')) {
      return { stdout: JSON.stringify(this.windows), stderr: '' };
    }

    if (command.includes('query --displays')) {
      return { stdout: JSON.stringify(this.displays), stderr: '' };
    }

    if (command.includes('window --focus')) {
      const match = command.match(/window --focus (\d+)/);
      if (match) {
        const windowId = parseInt(match[1]);
        const window = this.windows.find(w => w.id === windowId);
        if (window) {
          // Update focus state
          this.windows.forEach(w => (w['has-focus'] = false));
          window['has-focus'] = true;
          return { stdout: '', stderr: '' };
        } else {
          throw new Error(`Window ${windowId} not found`);
        }
      }
    }

    if (command.includes('window') && command.includes('--move')) {
      const match = command.match(/window (\d+) --move abs:(\d+):(\d+)/);
      if (match) {
        const windowId = parseInt(match[1]);
        const x = parseInt(match[2]);
        const y = parseInt(match[3]);
        const window = this.windows.find(w => w.id === windowId);
        if (window) {
          window.frame.x = x;
          window.frame.y = y;
          return { stdout: '', stderr: '' };
        }
      }
    }

    if (command.includes('window') && command.includes('--resize')) {
      const match = command.match(/window (\d+) --resize abs:(\d+):(\d+)/);
      if (match) {
        const windowId = parseInt(match[1]);
        const w = parseInt(match[2]);
        const h = parseInt(match[3]);
        const window = this.windows.find(win => win.id === windowId);
        if (window) {
          window.frame.w = w;
          window.frame.h = h;
          return { stdout: '', stderr: '' };
        }
      }
    }

    // Default successful response for unhandled commands
    return { stdout: '', stderr: '' };
  }

  // Add a new window
  addWindow(window: MockYabaiWindow) {
    this.windows.push(window);
  }

  // Remove a window
  removeWindow(windowId: number) {
    this.windows = this.windows.filter(w => w.id !== windowId);
  }

  // Update window focus
  focusWindow(windowId: number) {
    this.windows.forEach(w => (w['has-focus'] = false));
    const window = this.windows.find(w => w.id === windowId);
    if (window) {
      window['has-focus'] = true;
    }
  }

  // Get focused window
  getFocusedWindow(): MockYabaiWindow | undefined {
    return this.windows.find(w => w['has-focus']);
  }

  // Get VS Code windows
  getVSCodeWindows(): MockYabaiWindow[] {
    return this.windows.filter(
      w => w.app.includes('Visual Studio Code') || w.app.includes('Code')
    );
  }
}

// Export singleton instance
export const yabaiMock = new YabaiMock();

// Export for type safety
export type { MockYabaiWindow, MockYabaiDisplay };
