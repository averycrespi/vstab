# vstab

A macOS workspace tab switcher for VS Code that provides a persistent tab bar for quick switching between VS Code windows.

![VS Tab Demo](https://via.placeholder.com/800x200/1e1e1e/cccccc?text=VS+Code+Workspace+Tab+Bar)

## Features

- **Persistent Tab Bar**: Always-on-top tab bar showing all VS Code workspaces
- **Smart Auto-Hide**: Only appears when VS Code is active, automatically hides when switching to other apps
- **Window Management**: Click tabs to focus windows, automatically hides inactive VS Code windows
- **Drag-and-Drop**: Reorder tabs by dragging, with persistent tab order between sessions
- **Space-Aware**: Automatically resizes VS Code windows to avoid overlap with the tab bar
- **AppleScript Integration**: Native macOS window discovery and control
- **Optional yabai Support**: Enhanced window management for multi-monitor setups

## Installation

### Prerequisites

- macOS (required for AppleScript)
- Node.js 18+ and npm
- VS Code

### Build from Source

```bash
# Clone the repository
git clone https://github.com/averycrespi/vstab.git
cd vstab

# Install dependencies
npm install

# Build the application
npm run build

# Run the application
npm start
```

## Usage

1. **Start vstab**: Run `npm start` to launch the application
2. **Open VS Code**: The tab bar will appear at the top of your screen when VS Code is active
3. **Switch Workspaces**: Click on tabs to switch between VS Code windows
4. **Reorder Tabs**: Drag tabs to reorder them (order is saved automatically)
5. **Auto-Hide**: The tab bar automatically hides when you switch to other applications

### Development Mode

```bash
# Run in development mode with hot reload
npm run dev

# Clean build artifacts
npm clean
```

## Architecture

### Technology Stack

- **Electron**: Cross-platform desktop framework
- **TypeScript**: Type-safe development
- **React**: UI components and state management
- **Tailwind CSS**: Styling and responsive design
- **AppleScript**: macOS window discovery and control
- **Webpack**: Build system and bundling

### Project Structure

```
vstab/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts         # Application entry point
│   │   ├── windows.ts       # VS Code window discovery
│   │   ├── ipc.ts           # IPC message handlers
│   │   └── persistence.ts   # Tab order storage
│   ├── renderer/            # React UI
│   │   ├── App.tsx          # Main application component
│   │   ├── components/      # Reusable components
│   │   ├── hooks/           # Custom React hooks
│   │   └── styles/          # CSS and styling
│   ├── shared/              # Shared types and constants
│   │   ├── types.ts         # TypeScript interfaces
│   │   └── ipc-channels.ts  # IPC channel definitions
│   └── preload.ts           # Secure IPC bridge
├── dist/                    # Built application files
├── package.json             # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── webpack.config.js       # Build configuration
└── tailwind.config.js      # Styling configuration
```

## Configuration

The application uses sensible defaults but can be customized:

- **Tab Bar Height**: 35px (configurable in `src/main/index.ts`)
- **Polling Interval**: 1 second for window discovery
- **Visibility Check**: 500ms for frontmost app detection

## AppleScript Integration

vstab uses AppleScript to:
- Discover running VS Code windows
- Extract workspace information from window titles
- Focus and hide windows
- Resize windows to avoid tab bar overlap

### Example AppleScript Commands

```applescript
-- Discover VS Code windows
tell application "System Events"
    set vscodeProcesses to every process whose name contains "Code"
    -- Process each window...
end tell

-- Focus a specific window
tell application "System Events"
    perform action "AXRaise" of window id "12345"
end tell
```

## Optional: yabai Integration

For advanced window management, vstab can integrate with [yabai](https://github.com/koekeishiya/yabai):

1. Install yabai: `brew install koekeishiya/formulae/yabai`
2. Enable yabai integration in settings
3. Enjoy enhanced multi-monitor support and precise window control

## Troubleshooting

### Common Issues

**Tab bar not appearing:**
- Ensure VS Code is running and focused
- Check that Accessibility permissions are granted to Terminal/iTerm
- Verify AppleScript execution permissions

**Windows not switching:**
- Grant Accessibility permissions to the vstab application
- Ensure VS Code windows are not minimized
- Check Console.app for AppleScript errors

**Build errors:**
- Ensure Node.js 18+ is installed
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check TypeScript compilation: `npm run compile`

### Permissions

vstab requires Accessibility permissions to control VS Code windows:

1. Open System Preferences → Security & Privacy → Privacy
2. Select "Accessibility" from the left sidebar
3. Add Terminal/iTerm (or your terminal application)
4. Add the vstab application when prompted

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with tests
4. Commit with conventional commits: `git commit -m "feat: add new feature"`
5. Push and create a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style (ESLint/Prettier)
- Add JSDoc comments for public APIs
- Test on macOS with multiple VS Code windows
- Update documentation for new features

## License

ISC License - see LICENSE file for details.

## Acknowledgments

- [Electron](https://electronjs.org/) - Desktop app framework
- [VS Code](https://code.visualstudio.com/) - The editor this enhances
- [yabai](https://github.com/koekeishiya/yabai) - Advanced window management
- macOS AppleScript - Native window control APIs

---

**Note**: This application is designed specifically for macOS and requires VS Code. It enhances the multi-workspace workflow by providing quick tab-based switching similar to browser tabs.