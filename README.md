# vstab

> ⚠️ WARNING: This project is under active development, and breaking changes may be released at any time.

A macOS workspace tab switcher for VS Code (and more!).

## Why?

- My current Claude Code workflow uses a different [Git worktree](https://git-scm.com/docs/git-worktree) for each agent.
- VS Code has poor worktree support (even with [extensions](https://github.com/CodeInKlingon/vscode-git-worktree)), so I use a separate workspace for each worktree.
- I wanted a "meta-tab" bar to switch between workspaces as easily as switching between files.

## Features

- **Persistent Tab Bar**: Always-on-top tab bar showing all VS Code workspaces.
- **Smart Auto-Hide**: Only appears when VS Code is active, automatically hides when switching to other apps.
- **Window Management**: Click tabs to focus windows, with automatic window resizing and positioning.
- **Drag-and-Drop**: Reorder tabs by dragging, with automatic tab order persistence.
- **Space-Aware**: Automatically resizes VS Code windows to use full screen below the tab bar.
- **yabai Integration**: Native window management using [yabai](https://github.com/koekeishiya/yabai)'s JSON API for stable, multi-window support.
- **Tray Menu**: Native macOS tray menu to view status, modify settings, and access logs.

## Requirements

- macOS
- Node.js 18+ with npm

## Quickstart

```sh
brew install koekeishiya/formulae/yabai
yabai --start-service

# Grant accessibility access:
# - Open macOS Settings > Privacy and Security > Accessibility
# - Click the "+" icon and add yabai
# - Toggle yabai on

git clone https://github.com/averycrespi/vstab.git
cd vstab
npm run quickstart
```

For more information about accessibility requirements, see the [yabai documentation](https://github.com/koekeishiya/yabai?tab=readme-ov-file#requirements-and-caveats).

## Usage

1. **Start vstab**: Run `npm run quickstart` to launch the application
2. **Open VS Code**: The tab bar will appear at the top of your screen when VS Code is active
3. **Switch Workspaces**: Click on tabs to switch between VS Code windows
4. **Reorder Tabs**: Drag tabs to reorder them
5. **Auto-Hide**: The tab bar automatically hides when you switch to other applications
6. **Tray Menu**: Use the tray menu to check the current version, view the current yabai status, and change settings

## Editor Support

vstab supports multiple code editors through configurable detection patterns:

- **VS Code**: All variants (standard, Insiders, OSS, portable) supported by default
- **Cursor**: AI-powered code editor supported by default
- **Extensible**: Add support for other editors by modifying the `editorDetectionConfig` in settings
- **Pattern Matching**: Each editor can have multiple app name patterns for reliable detection

## Settings

Settings can be modified from the tray menu and are persisted to `~/.config/vstab/settings.json`.
All settings have reasonable defaults, and will apply immediately without requiring an application restart.

### Behaviour

- **Auto-Hide**: Toggle whether the tab bar hides when an editor is not active
- **Auto Resize Editors Vertically**: Toggles automatic vertical editor window resizing
- **Auto Resize Editors Horizontally**: Toggles automatic horizontal editor window resizing

### Appearance

- **Theme**: Choose between light, dark, or system theme
- **Tab Bar Height**: Customize the height of the tab bar
- **Editor Top Margin**: When resizing, customize much margin to leave above editor windows
- **Editor Bottom Margin**: When resizing, customize how much margin to leave below editor windows

### Logging

- **Log Level**: Configure log verbosity: debug, info, warn, or error
- **Log Retention**: Number of days to keep log files; can only be changed in settings file
- **Max Log File Size**: Maximum log file size before rotation; can only be changed in settings file

### Editor Detection (Advanced)

The editor detection configuration can only be changed in the settings file.

It has the following schema:

```json
{
  "editorDetectionConfig": {
    // List of detectable editors
    "editors": [
      {
        // The internal ID; must be unique
        "id": "vscode",
        // The display name
        "displayName": "Visual Studio Code",
        // A list of regex patterns to match the app name
        "appNamePatterns": [
          "Visual Studio Code",
          "Visual Studio Code - Insiders",
          "Code",
          "Code - OSS",
          "VSCode",
          "code"
        ]
      }
    ]
  }
}
```

## Logging

Log files are stored in `~/.config/vstab/logs/` and can be accessed via the tray menu "Open Logs Folder" option.

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
