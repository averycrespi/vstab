# vstab

A macOS workspace tab switcher for VS Code.

## Features

- **Persistent Tab Bar**: Always-on-top tab bar showing all VS Code workspaces.
- **Smart Auto-Hide**: Only appears when VS Code is active, automatically hides when switching to other apps (configurable).
- **Window Management**: Click tabs to focus windows, with automatic window resizing and positioning, keeps all windows visible for fast switching.
- **Drag-and-Drop**: Reorder tabs by dragging, with automatic tab order persistence.
- **Space-Aware**: Automatically resizes VS Code windows to use full screen below the tab bar.
- **yabai Integration**: Native window management using [yabai](https://github.com/koekeishiya/yabai)'s JSON API for stable, multi-window support.
- **Stable Window IDs**: Hash-based identification for consistent window tracking across restarts.
- **Comprehensive Logging**: Structured JSON logging with configurable levels, file rotation, and retention management.
- **Tray Menu**: Native macOS tray menu to view status, modify settings, and access logs.

## Installation

### Requirements

- macOS (required for yabai)
- Node.js 18+ and npm
- VS Code

### Configure yabai

To install and start yabai:

```sh
brew install koekeishiya/formulae/yabai
yabai --start-service
```

To grant accessibility access:

- Open macOS Settings > Privacy and Security > Accessibility
- Click the "+" icon and add yabai
- Toggle yabai on

For more information, see the [yabai documentation](https://github.com/koekeishiya/yabai?tab=readme-ov-file#requirements-and-caveats).

### Build from Source

```bash
# Clone the repository
git clone https://github.com/averycrespi/vstab.git && cd vstab

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
6. **Tray Menu**: Use the tray menu to check the current version, view the current yabai status, and change settings.

## Settings

Settings can be modified from the tray menu and are persisted to `~/.config/vstab/settings.json`. All settings apply immediately without requiring an application restart.

### Available Settings

**Appearance & Behavior:**

- **Theme**: Choose between Light, Dark, or System theme (default: System)
- **Tab Bar Height**: Customize the height of the tab bar from 25-60px (default: 45px)
- **Top Margin**: Vertical spacing above tab bar (default: 10px)
- **Bottom Margin**: Vertical spacing below tab bar (default: 0px)
- **Auto-Hide**: Toggle whether the tab bar hides when VS Code is not active (default: enabled)

**Window Management:**

- **Auto Resize Vertical**: Control automatic vertical window positioning and resizing (default: enabled)
- **Auto Resize Horizontal**: Control automatic horizontal window positioning and resizing (default: enabled)

**Logging:**

- **Log Level**: Configure verbosity - Error, Warn, Info, or Debug (default: Info)
- **Log Retention**: Number of days to keep log files, 1-30 days (default: 7 days). Must be changed in settings file.
- **Max Log File Size**: Maximum size before rotation, 1-100MB (default: 10MB). Must be changed in settings file.

All log files are stored in `~/.config/vstab/logs/` and can be accessed via the tray menu "Open Logs Folder" option.

## Troubleshooting

### Common Issues

**Tab bar not appearing:**

- Ensure VS Code is running and focused
- Check that yabai service is running: `yabai --start-service`
- Verify yabai can query windows: `yabai -m query --windows`
- If auto-hide is enabled, the tab bar only appears when VS Code is active

**Tab bar not reappearing when switching back to VS Code:**

- Check the auto-hide setting - when disabled, the tab bar should always be visible
- Restart the application if visibility detection seems stuck

**Windows not switching:**

- Grant Accessibility permissions to yabai
- Ensure yabai has window management permissions
- Check Console.app for yabai connection errors

**Build errors:**

- Ensure Node.js 18+ is installed
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

**Application issues:**

- Check log files in `~/.config/vstab/logs/` for detailed error information
- Use the tray menu "Open Logs Folder" option to access logs easily
- Adjust log level to Debug in settings for more detailed troubleshooting information

**Need help?** Check [DEVELOPERS.md](DEVELOPERS.md) for detailed troubleshooting and development information.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Electron](https://electronjs.org/) - Desktop app framework
- [VS Code](https://code.visualstudio.com/) - The editor this enhances
- [yabai](https://github.com/koekeishiya/yabai) - macOS window management system
