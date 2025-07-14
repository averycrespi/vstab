# vstab

A macOS workspace tab switcher for VS Code that provides a persistent tab bar for quick switching between VS Code windows.

![VS Tab Demo](https://via.placeholder.com/800x200/1e1e1e/cccccc?text=VS+Code+Workspace+Tab+Bar)

## Features

- **Persistent Tab Bar**: Always-on-top tab bar showing all VS Code workspaces
- **Smart Auto-Hide**: Only appears when VS Code is active, automatically hides when switching to other apps
- **Window Management**: Click tabs to focus windows, keeps all windows visible for fast switching
- **Drag-and-Drop**: Reorder tabs by dragging, with persistent tab order between sessions
- **Space-Aware**: Automatically resizes VS Code windows to use full screen below the tab bar
- **yabai Integration**: Native window management using yabai's JSON API for stable, multi-window support
- **Stable Window IDs**: Hash-based identification for consistent window tracking across restarts

## Installation

### Prerequisites

- macOS (required for yabai)
- Node.js 18+ and npm
- VS Code
- yabai (`brew install koekeishiya/formulae/yabai`)

### Build from Source

```bash
# Clone the repository
git clone https://github.com/averycrespi/vstab.git
cd vstab

# Install dependencies
npm install

# Install and start yabai
brew install koekeishiya/formulae/yabai
yabai --start-service

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
- **yabai**: Advanced macOS window management
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

## yabai Integration

vstab uses yabai's JSON API for robust window management:

- **Window Discovery**: Query all VS Code windows via `yabai -m query --windows`
- **Stable Identification**: Hash-based window IDs from workspace paths
- **Precise Control**: Direct window focusing, resizing, and positioning
- **Multi-Window Support**: Track multiple VS Code instances simultaneously

### Example yabai Commands

```bash
# Discover VS Code windows
yabai -m query --windows | jq '.[] | select(.app | contains("Code"))'

# Focus a specific window
yabai -m window --focus 12345

# Resize window to full screen below tab bar
yabai -m window 12345 --move abs:0:45
yabai -m window 12345 --resize abs:1920:1035
```

### Requirements

yabai must be installed and running:

1. Install: `brew install koekeishiya/formulae/yabai`
2. Start service: `yabai --start-service`
3. Grant Accessibility permissions when prompted

## Troubleshooting

### Common Issues

**Tab bar not appearing:**
- Ensure VS Code is running and focused
- Check that yabai service is running: `yabai --start-service`
- Verify yabai can query windows: `yabai -m query --windows`

**Windows not switching:**
- Grant Accessibility permissions to yabai and vstab
- Ensure yabai has window management permissions
- Check Console.app for yabai connection errors

**Build errors:**
- Ensure Node.js 18+ is installed
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check TypeScript compilation: `npm run compile`

### Permissions

vstab requires yabai and Accessibility permissions:

1. Install yabai: `brew install koekeishiya/formulae/yabai`
2. Start yabai service: `yabai --start-service`
3. Open System Preferences → Security & Privacy → Privacy
4. Select "Accessibility" from the left sidebar
5. Add yabai and vstab when prompted

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
- [yabai](https://github.com/koekeishiya/yabai) - macOS window management system

---

**Note**: This application is designed specifically for macOS and requires VS Code. It enhances the multi-workspace workflow by providing quick tab-based switching similar to browser tabs.