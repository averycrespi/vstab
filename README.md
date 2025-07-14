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

### Running the App

```bash
# Start the application
npm start

# Run in development mode
npm run dev
```

## How It Works

vstab integrates with macOS's yabai window manager to provide seamless workspace switching:

- **Window Discovery**: Automatically detects all VS Code windows and workspaces
- **Smart Visibility**: Tab bar appears only when VS Code is active
- **Stable Identification**: Uses workspace paths to maintain consistent tab order
- **Native Integration**: Leverages yabai for precise window management

## Configuration

The application uses sensible defaults:

- **Tab Bar Height**: 35px
- **Polling Interval**: 1 second for window discovery  
- **Auto-Hide**: 500ms for frontmost app detection

For advanced configuration options, see [DEVELOPERS.md](DEVELOPERS.md).

## yabai Setup

vstab requires yabai for window management:

1. **Install yabai**: `brew install koekeishiya/formulae/yabai`
2. **Start service**: `yabai --start-service`
3. **Grant permissions**: Allow Accessibility access when prompted

yabai provides the window control needed for seamless tab switching and automatic window resizing.

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

**Need help?** Check [DEVELOPERS.md](DEVELOPERS.md) for detailed troubleshooting and development information.

## Contributing

We welcome contributions! Please see [DEVELOPERS.md](DEVELOPERS.md) for detailed development guidelines, architecture information, and testing procedures.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with tests
4. Commit with conventional commits: `git commit -m "feat: add new feature"`
5. Push and create a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Electron](https://electronjs.org/) - Desktop app framework
- [VS Code](https://code.visualstudio.com/) - The editor this enhances
- [yabai](https://github.com/koekeishiya/yabai) - macOS window management system

---

**Note**: This application is designed specifically for macOS and requires VS Code. It enhances the multi-workspace workflow by providing quick tab-based switching similar to browser tabs.