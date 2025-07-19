# CLAUDE.md - AI Assistant Context

This file provides context for AI assistants working on the vstab project.

## Project Overview

**vstab** is a macOS workspace tab switcher for code editors (VS Code, Cursor, and more) built with Electron, TypeScript, React, and yabai. It creates a persistent tab bar at the top of the screen that shows all supported editor workspaces and allows quick switching between them with stable window identification and full-screen management.

## Key Technologies

- **Electron 37.2.1** - Desktop app framework
- **TypeScript** - Main language for type safety
- **React 19** - UI framework for renderer process
- **Tailwind CSS v4** - Styling (using CSS custom properties)
- **Prettier** - Code formatting and style enforcement
- **Webpack** - Build system
- **yabai** - macOS window management via JSON API
- **Node.js/npm** - Package management

## Project Structure

```
vstab/
├── src/
│   ├── main/           # Electron main process (Node.js)
│   │   ├── index.ts    # App entry point and tray menu management
│   │   ├── windows.ts  # yabai window discovery and management
│   │   ├── ipc.ts      # IPC handlers including tray communication
│   │   ├── persistence.ts # Tab order storage with logging
│   │   ├── settings.ts # User settings persistence
│   │   ├── file-logger.ts # File-based logging with rotation
│   │   └── logger-init.ts # Logging system initialization
│   ├── renderer/       # React UI (browser environment)
│   │   ├── App.tsx     # Main component with logging
│   │   ├── index.tsx   # Renderer entry point
│   │   ├── index.html  # HTML template
│   │   ├── logger.ts   # Renderer-specific logger configuration
│   │   ├── types.d.ts  # Renderer type definitions
│   │   ├── components/ # UI components
│   │   │   └── Tab.tsx # Tab component
│   │   ├── hooks/      # React hooks
│   │   │   ├── useTabOrder.ts # Tab order management hook
│   │   │   ├── useTheme.ts # Theme management hook
│   │   │   └── useWindowVisibility.ts # Window visibility hook
│   │   └── styles/     # Styling
│   │       └── index.css # Main stylesheet
│   ├── shared/         # Shared types and constants
│   │   ├── types.ts    # Type definitions including logging settings
│   │   ├── logger.ts   # Core structured logging system
│   │   └── ipc-channels.ts # IPC channel definitions
│   ├── types/          # Global type definitions
│   │   └── jest-dom.d.ts # Jest DOM types
│   └── preload.ts      # Secure IPC bridge with logging methods
├── __tests__/          # Test suites
│   ├── __mocks__/      # Mock implementations
│   │   ├── electron.ts # Electron API mocks
│   │   ├── fs.ts       # File system mocks
│   │   └── yabai.ts    # yabai command mocks
│   ├── unit/           # Unit tests
│   │   ├── main/       # Main process unit tests
│   │   ├── renderer/   # Renderer process unit tests
│   │   └── shared/     # Shared module unit tests
│   ├── integration/    # Integration tests
│   │   ├── ipc-communication.test.ts
│   │   └── yabai-integration.test.ts
│   └── e2e/           # End-to-end tests
│       └── app.e2e.test.ts
├── config/            # Configuration files
│   ├── jest.config.js      # Jest test configuration
│   ├── jest.setup.integration.js
│   ├── jest.setup.main.js
│   ├── jest.setup.renderer.js
│   ├── postcss.config.js   # PostCSS configuration
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   ├── tsconfig.main.json  # TypeScript config for main process
│   ├── tsconfig.renderer.json # TypeScript config for renderer
│   ├── tsconfig.test.json  # TypeScript config for tests
│   └── webpack.config.js   # Webpack build configuration
├── assets/            # Application assets
│   ├── entitlements.plist     # macOS entitlements for signing
│   ├── tray-icon.png          # Main tray icon
│   ├── tray-icon@2x.png       # High-resolution tray icon
│   ├── tray-icon.svg          # Vector tray icon
│   └── tray-icon-template.svg # Template icon for macOS theming
├── coverage/          # Test coverage reports (generated)
├── dist/              # Built files (webpack output)
├── release/           # Built app packages (generated)
├── node_modules/      # Dependencies (generated)
├── jest.config.js     # Jest config wrapper
├── package.json       # Dependencies and scripts
├── package-lock.json  # Dependency lock file
└── tsconfig.json      # Base TypeScript configuration
```

## Core Concepts

### Editor Detection System

vstab supports multiple code editors through a flexible, pattern-based detection system:

#### Supported Editors (Default)

- **Visual Studio Code**: All variants including standard, Insiders, OSS, and portable versions
- **Cursor**: AI-powered code editor based on VS Code
- **Extensible**: Add support for other editors via configuration

#### Detection Configuration

```typescript
editorDetectionConfig: {
  editors: [
    {
      id: 'vscode',
      displayName: 'Visual Studio Code',
      appNamePatterns: [
        'Visual Studio Code',
        'Visual Studio Code - Insiders',
        'Code',
        'Code - OSS',
        'VSCode',
        'code',
      ],
    },
    {
      id: 'cursor',
      displayName: 'Cursor',
      appNamePatterns: ['Cursor'],
    },
  ];
}
```

#### Pattern Matching

- **App Name Detection**: Matches against yabai's reported application names
- **Multiple Patterns**: Each editor can have multiple app name variants
- **Case Sensitive**: Exact string matching for reliable detection
- **Configurable**: Users can modify patterns or add new editors in settings

### Window Discovery

- Uses yabai JSON API to find supported editor windows every 1 second
- Generates stable hash-based window IDs from workspace paths + PID
- Tracks all supported editor instances with rich metadata (space, display, focus state)
- Maintains window ID mapping for reliable operations
- **Multi-Editor Support**: Configurable detection patterns for VS Code, Cursor, and other editors

### Tab Management

- React components render tabs based on discovered windows
- Drag-and-drop reordering with HTML5 API
- Stable tab order maintained across window switches and closures
- Tab order always persisted to `~/.config/vstab/tab_order.json`
- No automatic reordering on tab switches or window focus changes
- Settings are accessible through the tray menu interface
- **Tab Click Behavior**: Clicking tabs now triggers window resizing when auto-resize settings are enabled
- **Window Positioning**: Editor windows are automatically repositioned and resized on every tab click (respects auto-resize settings)

### User Settings

Settings are stored in `~/.config/vstab/settings.json` with automatic creation and apply immediately without restart.

#### Current Settings Structure

**Appearance & Behavior:**

- **theme**: 'light' | 'dark' | 'system' - default: `'system'`
- **tabBarHeight**: number (25-60px) - default: `45`
- **autoHide**: boolean - Show tab bar only when supported editors are active - default: `true`

**Editor Positioning:**

- **editorTopMargin**: number (0-30px) - Space above repositioned editors - default: `10`
- **editorBottomMargin**: number (0-30px) - Space below repositioned editors - default: `0`

**Editor Management:**

- **autoResizeEditorsVertically**: boolean - Toggle vertical editor resizing - default: `true`
- **autoResizeEditorsHorizontally**: boolean - Toggle horizontal editor resizing - default: `true`

**Editor Detection:**

- **editorDetectionConfig**: Configuration for supported editors with pattern matching
  - **editors**: Array of editor patterns with `id`, `displayName`, and `appNamePatterns`
  - **Default Support**: VS Code (all variants) and Cursor enabled by default
  - **Extensible**: Add support for additional editors via configuration

**Logging Configuration:**

- **logLevel**: 'error' | 'warn' | 'info' | 'debug' - default: `'info'`
- **logRetentionDays**: number (1-30) - Number of days to keep log files - default: `7`
- **maxLogFileSizeMB**: number (1-100) - Maximum log file size before rotation - default: `10`

#### Settings Management

- Settings UI accessible via tray menu
- Real-time settings updates with immediate effect
- IPC-based settings synchronization between main and renderer processes
- Automatic settings file creation with sensible defaults on first run
- Settings validation and fallback to defaults for invalid values

### Auto-Hide Behavior

- Polls frontmost app every 250ms via yabai window focus detection for improved responsiveness
- Shows tab bar only when supported editors are active (when `autoHide` setting is enabled)
- Automatically shows tab bar when `autoHide` setting is disabled
- Hides when switching to other applications
- Windows remain visible (no minimizing) for fast tab switching
- Enhanced error handling with retry logic for failed yabai queries
- **Pattern-Based Detection**: Uses configurable patterns to detect supported editors

### Tray Menu System

- **Tray Icon**: Always-visible macOS menu bar tray icon with native context menu
- **Click Behavior**: Configurable left-click action - toggle window visibility or show context menu
- **Status Display**: Shows real-time yabai status and current settings values
- **Menu Structure**: Organized into logical groups - Appearance for visual options, Behaviour for common toggles, and top-level Log Level access
- **Settings Integration**: Direct access to all settings with improved organization and hierarchy
- **Asset Management**: Uses template icons for proper macOS dark/light mode integration

#### Tray Menu Layout

```
vstab v1.0.0                           # Clickable header (opens GitHub)
yabai: ✅ Running                      # Status indicator (clickable but no action)
─────────────────────────────────────
Appearance ▶                          # Visual and layout settings
├── Theme: System ▶                   # Theme submenu
│   ├── ○ Light                       # Radio button
│   ├── ○ Dark                        # Radio button
│   └── ● System                      # Current selection
├── Tab Bar Height: 45px ▶            # Height submenu
│   ├── ○ 25px                        # Radio button options
│   ├── ○ 30px
│   ├── ○ 35px
│   ├── ○ 40px
│   ├── ● 45px                        # Current selection
│   ├── ○ 50px
│   ├── ○ 55px
│   └── ○ 60px
├── Editor Top Margin: 10px ▶         # Margin submenu
│   ├── ○ 0px                         # Radio button options
│   ├── ○ 5px
│   ├── ● 10px                        # Current selection
│   ├── ○ 15px
│   ├── ○ 20px
│   ├── ○ 25px
│   └── ○ 30px
└── Editor Bottom Margin: 0px ▶       # Bottom margin submenu
    └── (Similar radio button structure)
─────────────────────────────────────
Behaviour ▶                           # Editor behavior settings
├── ☑ Auto Hide Tab Bar               # Checkbox toggle
├── ☑ Auto Resize Editors Vertically  # Checkbox toggle
└── ☑ Auto Resize Editors Horizontally # Checkbox toggle
─────────────────────────────────────
Log Level: Info ▶                     # Top-level log level submenu
├── ● Debug                           # Radio button (first position)
├── ○ Info                            # Radio button
├── ○ Warn                            # Radio button
└── ○ Error                           # Radio button (last position)
─────────────────────────────────────
Open Logs Folder                      # Opens log directory in Finder
Open Settings File                    # Opens settings.json file directly
─────────────────────────────────────
Quit vstab                            # Terminate app
```

### IPC Communication

- Main process handles yabai operations and file persistence
- Renderer process handles UI and user interactions
- Preload script provides secure IPC bridge

### Logging System

vstab implements a comprehensive structured logging system with file rotation, configurable levels, and both console and file output.

#### Architecture

- **Core Logger** (`src/shared/logger.ts`): Structured logging with TypeScript interfaces
- **File Logger** (`src/main/file-logger.ts`): File-based persistence with automatic rotation
- **Logger Initialization** (`src/main/logger-init.ts`): Connects file logging to main logger
- **Renderer Logger** (`src/renderer/logger.ts`): Browser-optimized configuration

#### Log Levels

- **Error**: Critical failures, system errors, unrecoverable issues
- **Warn**: Recoverable issues, missing resources, validation failures
- **Info**: Application lifecycle events, user actions, important state changes
- **Debug**: Detailed operation traces, IPC messages, timing information

#### Log Storage

- **Location**: `~/.config/vstab/logs/`
- **Format**: JSON structured logs for easy parsing and analysis
- **Rotation**: Daily rotation when files exceed size limit (configurable 1-100MB)
- **Retention**: Automatic cleanup after configurable days (1-30 days)
- **File Naming**: `vstab-YYYY-MM-DD.log` with timestamp suffixes for rotated files

#### Log Entry Structure

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Window focused successfully",
  "context": "windows",
  "data": {
    "windowId": "abc123",
    "title": "my-project — /Users/user/projects/my-project"
  },
  "source": {
    "file": "windows.ts",
    "function": "focusWindow",
    "line": 95
  }
}
```

#### Usage Examples

```typescript
// Import logger in any file
import { logger } from '@shared/logger';

// Basic logging with context
logger.info('Application started', 'main');
logger.error('Failed to connect to yabai', 'windows', error);

// Structured data logging
logger.debug('Window discovered', 'windows', {
  windowId: window.id,
  title: window.title,
  isActive: window.isActive,
});

// File-specific context helps with debugging
logger.warn('Invalid settings detected', 'settings', {
  invalidKeys: ['unknownOption'],
  defaults: DEFAULT_SETTINGS,
});
```

#### Configuration

- **Runtime Configuration**: Log level and file output controlled via user settings
- **Development Mode**: Renderer process logs to console for debugging
- **Production Mode**: Main process handles all file logging
- **IPC Integration**: Logging settings sync between main and renderer processes

#### Troubleshooting with Logs

1. **Application Issues**: Check `info` level logs for lifecycle events
2. **yabai Problems**: Look for `error` level logs in `windows` context
3. **Settings Issues**: Check `settings` context for validation errors
4. **Performance Analysis**: Use `debug` level for detailed timing information
5. **User Actions**: Track user interactions via `info` level logs in `renderer` context

## Build System

### Scripts

**Development & Build:**

- `npm run build` - Webpack build (development)
- `npm run build:prod` - Production build
- `npm start` - Run Electron app
- `npm run dev` - Build and run
- `npm run compile` - TypeScript compilation check
- `npm run clean` - Remove dist directory

**Distribution:**

- `npm run pack` - Build and package app without installer
- `npm run dist` - Build and create installer packages
- `npm run dist:mac` - Build macOS-specific distribution
- `npm run quickstart` - Install dependencies, build prod, and start

**Testing & Quality:**

- `npm test` - Run all tests
- `npm run test:*` - Various test commands (see Testing section)
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check formatting without changing files

### TypeScript Configuration

- `tsconfig.json` - Base configuration in project root
- `config/tsconfig.main.json` - Main process (Node.js target)
- `config/tsconfig.renderer.json` - Renderer process (browser target)
- `config/tsconfig.test.json` - Test environment configuration

### Webpack Setup

- Configuration located at `config/webpack.config.js`
- Three separate bundles: main, preload, renderer
- CSS processing with PostCSS and Tailwind
- TypeScript compilation with ts-loader
- Production and development build modes

## Key Implementation Details

### yabai Integration

```bash
# Window discovery pattern (supports multiple editors)
yabai -m query --windows | jq '.[] | select(.app | test("Visual Studio Code|Code|Cursor"; "i"))'

# Window operations
yabai -m window --focus 12345
yabai -m window 12345 --move abs:0:55  # Adjusted for configurable tab bar height
yabai -m window 12345 --resize abs:1920:1025
```

### Tray Menu Implementation

#### Menu Creation and Lifecycle

- **Tray Icon Creation**: `createTrayIcon()` in `src/main/index.ts:38-63`
- **Menu Updates**: `updateTrayMenu()` in `src/main/index.ts:291-550`
- **Always Created**: Tray icon is always created when the app starts
- **Icon Assets**: Uses `assets/tray-icon.png` with template variants for macOS theming
- **Tooltip**: Shows "vstab - VS Code Tab Switcher" on hover

#### Menu Structure Implementation

```typescript
// Header section with app info and status
{ label: 'vstab v1.0.0', click: () => openGitHub() }
{ label: 'yabai: ✅ Running', enabled: false }

// Settings submenu (display-only with TODOs for interaction)
{
  label: 'Settings',
  submenu: [
    { label: 'Theme: System' },           // TODO: Cycle themes
    { label: 'Tab Bar Height: 45px' },    // TODO: Adjust height
    { label: 'Auto Hide: On' },           // TODO: Toggle setting
    { label: 'Tray Click: Toggle Window' } // TODO: Cycle action
  ]
}

// Action items
{ label: 'Quit vstab', click: () => app.quit() }
```

#### Event Handling Patterns

- **Left-click Behavior**: Always shows context menu when clicking tray icon
- **Status Updates**: Menu rebuilds on settings changes via IPC events
- **yabai Status**: Real-time detection with ✅/❌ indicators

#### IPC Integration

- **Menu Updates**: `TRAY_UPDATE_MENU` channel triggers menu refresh
- **Process Events**: Internal `tray-update-menu` event for cross-process communication

#### Interactive Features

- **Full Settings Interactivity**: All settings are fully interactive with checkboxes, radio buttons, and immediate effect
- **Theme Selection**: Theme submenu provides radio button selection between Light, Dark, and System themes
- **Height Adjustment**: Tab bar height submenu offers radio button selection from 25px to 60px with instant window resizing
- **Toggle Settings**: Boolean settings (auto-hide, auto-resize) use interactive checkboxes for instant toggling
- **Editor Margin Controls**: Interactive radio button submenus for precise top margin adjustment (0-30px)
- **Log Level Controls**: Comprehensive log level submenu with radio button selection for runtime log adjustment

### Code Formatting

- **Prettier** configured for consistent code style across the project
- Uses default configuration with automatic formatting enforcement
- Automatic formatting on file write via Claude Code hooks
- Manual formatting available via `npm run format` command
- Format checking for CI/CD via `npm run format:check`

### Styling Approach

- Uses Tailwind CSS v4 with CSS custom properties
- CSS variables defined in `:root` for editor theme colors (VS Code-inspired)
- **Theme System**: Light and dark themes with system preference detection
- Dynamic theme switching via `data-theme` attribute on document root
- Inline styles for dynamic states (hover, active)

### IPC Channels

- Defined in `src/shared/ipc-channels.ts`
- Type-safe with TypeScript interfaces
- Handles window management, tab reordering, user settings, and tray communication
- **Settings IPC**: `SETTINGS_GET`, `SETTINGS_UPDATE`, and `SETTINGS_CHANGED` for configuration management
- **Real-time Settings**: `SETTINGS_CHANGED` event broadcasts setting updates across the app for immediate application
- **Tray IPC**: `TRAY_UPDATE_MENU` for tray menu operations

### Settings Architecture

- **Storage Location**: `~/.config/vstab/settings.json` (XDG Base Directory compliant)
- **Default Creation**: Settings file auto-created on first app launch with sensible defaults
- **Settings Types**: All settings defined in `src/shared/types.ts` with TypeScript interfaces
- **IPC Communication**: Settings loaded/saved via `SETTINGS_GET` and `SETTINGS_UPDATE` channels
- **Real-time Updates**: Settings changes apply immediately without restart required
- **Settings Change Broadcasting**: `SETTINGS_CHANGED` IPC event notifies all components when settings are updated
- **Reactive Components**: App components automatically update when settings change via IPC notifications
- **Theme Integration**: Theme setting controls CSS variables via `data-theme` attribute
- **Window Resize Integration**: Auto-resize settings control yabai window positioning behavior
- **Tray Integration**: Tray icon is always visible when app is running

### Error Handling

- yabai connection errors logged to console
- Graceful error handling for individual window operations
- Fallback mechanisms for failed yabai commands
- Settings file creation/read errors handled gracefully with defaults
- TypeScript strict mode for compile-time safety
- **Auto-hide Error Recovery**: Retry logic for failed yabai queries with fallback to visible state
- **Visibility Polling Resilience**: Enhanced error handling in visibility detection with automatic recovery

## Development Workflow

### Making Changes

1. Edit source files in `src/` (files auto-format on write via hooks)
2. Run `npm run build` to compile
3. Run `npm start` to test
4. Check console for errors
5. Run `npm run format:check` to verify code formatting

### Adding Features

1. Update types in `src/shared/types.ts`
2. Add IPC channels in `src/shared/ipc-channels.ts`
3. Implement in main process (`src/main/`)
4. Update UI in renderer process (`src/renderer/`)
5. Write tests for new functionality
6. Test with multiple editor windows (VS Code, Cursor, etc.)

### Testing

#### Test Structure

```
__tests__/
├── unit/
│   ├── main/           # Main process unit tests
│   ├── renderer/       # Renderer process unit tests
│   └── shared/         # Shared module unit tests
├── integration/        # Integration tests
├── e2e/               # End-to-end tests
└── __mocks__/         # Mock implementations
```

#### Test Commands

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:main` - Run main process tests only
- `npm run test:renderer` - Run renderer process tests only
- `npm run test:shared` - Run shared module tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:unit` - Run all unit tests (main, renderer, shared)
- `npm run test:ci` - Run tests for CI (no watch, with coverage)

#### Test Types

**Unit Tests**

- **Main process**: Window discovery, persistence, IPC handlers, settings management
- **Renderer process**: React components, hooks, UI interactions, theme management
- **Shared modules**: Type definitions, logger functionality, and utility functions
- Test individual functions and components in isolation with mocked dependencies

**Integration Tests**

- IPC communication between main and renderer processes
- yabai integration with mocked commands and window operations
- File persistence workflows and settings synchronization
- Error handling and recovery scenarios across process boundaries

**End-to-End Tests**

- Complete user workflows (tab switching, reordering) - included in integration test suite
- Application lifecycle (startup, shutdown, restart)
- Auto-hide behavior based on frontmost application detection
- Window management across different editor scenarios

#### Test Coverage

- Minimum 80% code coverage for functions, lines, and statements
- 70% branch coverage for conditional logic
- Critical paths (window management, persistence) have 100% coverage

#### Manual Testing Checklist

- Manual testing with multiple editor workspaces (VS Code, Cursor, etc.)
- Check auto-hide behavior by switching apps
- Test drag-and-drop reordering
- Verify tab order stability during window switches
- Test full-screen window resizing
- Verify persistence across app restarts

#### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:main
npm run test:renderer
npm run test:shared
npm run test:integration

# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:coverage

# Run in watch mode during development
npm run test:watch

# Run for CI (no watch, with coverage)
npm run test:ci
```

## Common Issues & Solutions

### Build Errors

- **Tailwind CSS errors**: Use CSS custom properties, not Tailwind classes
- **TypeScript errors**: Check imports, ensure types are exported
- **Webpack errors**: Verify loader configuration

### Runtime Issues

- **No tab bar**: Check supported editors are running and yabai service is active
- **Tab bar not reappearing**: Check `autoHide` setting - when disabled, tab bar should always be visible
- **yabai errors**: Verify yabai installation and Accessibility permissions
- **Window operations fail**: Check yabai can query and control windows
- **IPC errors**: Check channel names match between main/renderer
- **Settings not persisting**: Check `~/.config/vstab/` directory permissions
- **Settings not applying immediately**: Settings now apply in real-time without restart - check browser console for IPC errors
- **Theme not applying**: Verify settings are loaded and theme hook is working
- **Editor resizing issues**: Check `autoResizeEditorsVertically` and `autoResizeEditorsHorizontally` settings - resizing now happens on every tab click
- **Tray icon not appearing**: Check icon assets exist in `assets/` directory
- **Tray menu not updating**: Verify settings changes trigger `TRAY_UPDATE_MENU` IPC calls
- **Logging issues**: Check `~/.config/vstab/logs/` directory exists and is writable
- **Log files not rotating**: Verify `maxLogFileSizeMB` and `logRetentionDays` settings are valid
- **Missing logs**: Check `logLevel` is appropriate (logging to file is always enabled)
- **Log directory access**: Use "Open Logs Folder" in tray menu or settings UI to access log files

### Platform Requirements

- **macOS only**: yabai is macOS-specific
- **yabai required**: Must be installed and running
- **Accessibility permissions**: Required for window control
- **Supported Editors**: VS Code, Cursor, or other configured editors must be installed and running

## Future Enhancements

### Planned Features (Low Priority)

- UI polish and animations
- Multi-monitor optimization
- Keyboard shortcuts for tab switching
- Advanced theme customization

### Potential Improvements

- Performance optimizations for many windows
- Enhanced yabai configuration options
- Better window state persistence
- Export/import settings functionality

## Dependencies Notes

### Key Dependencies

- `electron` (37.2.1) - Desktop app framework
- `react` (19.1.0) + `react-dom` (19.1.0) - UI framework
- `typescript` (5.8.3) - Type safety
- `webpack` (5.100.1) + loaders - Build system
- `tailwindcss` (4.1.11) + `@tailwindcss/postcss` (4.1.11) - Styling with CSS custom properties
- `postcss` (8.5.6) + `autoprefixer` (10.4.21) - CSS processing
- `yabai` - External macOS window management dependency

### Dev Dependencies

- `@types/*` - TypeScript definitions for Node.js, React, Jest
- `ts-loader` (9.5.2) - TypeScript webpack loader
- `css-loader` (7.1.2), `style-loader` (4.0.0), `postcss-loader` (8.1.1) - CSS processing pipeline
- `html-webpack-plugin` (5.6.3) - HTML template generation
- `prettier` (3.6.2) - Code formatting and style enforcement
- `jest` (29.7.0) + testing libraries - Test framework with coverage reporting
- `electron-builder` (26.0.12) - Application packaging and distribution
- `@testing-library/react` (15.0.7) - React component testing utilities

## Best Practices for AI Assistants

1. **Always build before testing**: Run `npm run build` after changes
2. **Check TypeScript compilation**: Use `npm run compile` to verify types
3. **Verify code formatting**: Use `npm run format:check` to ensure consistent style
4. **Run tests for changes**: Use `npm test` to ensure functionality works
5. **Test with real editor windows**: Open multiple workspaces in supported editors for testing
6. **Respect the architecture**: Keep main/renderer separation clear
7. **Update types first**: When adding features, update shared types
8. **Follow existing patterns**: Use established IPC channels and hooks
9. **Consider yabai requirements**: Ensure yabai service is running
10. **Test window operations**: Verify yabai commands work as expected
11. **Maintain tab order stability**: Don't reorder on focus changes
12. **Maintain security**: Keep contextIsolation enabled in preload
13. **Use structured logging**: Import logger from `@shared/logger` and use appropriate levels with context
14. **Write tests for new features**: Add unit, integration, and E2E tests as appropriate
15. **Test settings functionality**: Verify settings persistence, theme switching, window resizing, and logging configuration
16. **Update tests for changes**: When modifying components, update corresponding test mocks and expectations
17. **Monitor logs during development**: Use appropriate log levels and check `~/.config/vstab/logs/` for issues
18. **ALWAYS UPDATE DOCUMENTATION**: After implementing features or making significant changes, update documentation (CLAUDE.md, README.md, DEVELOPERS.md, etc.) to reflect the new functionality, architecture changes, file structure updates, and any new best practices or troubleshooting steps

This context should help AI assistants understand the project structure, make appropriate changes, and troubleshoot common issues effectively.
