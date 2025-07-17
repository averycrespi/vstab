# Developer Guide

This guide contains development-specific information for contributors to vstab.

## Architecture Overview

### Technology Stack

- **Electron 37.2.1** - Desktop app framework
- **TypeScript** - Main language for type safety
- **React 19** - UI framework for renderer process
- **Tailwind CSS v4** - Styling (using CSS custom properties)
- **Webpack** - Build system
- **yabai** - macOS window management via JSON API
- **Node.js/npm** - Package management

### Project Structure

```
vstab/
├── src/
│   ├── main/           # Electron main process (Node.js)
│   │   ├── index.ts    # App entry point
│   │   ├── windows.ts  # yabai window discovery and management
│   │   ├── ipc.ts      # IPC handlers
│   │   ├── persistence.ts # Tab order storage
│   │   ├── file-logger.ts # File-based logging with rotation
│   │   └── logger-init.ts # Logging system initialization
│   ├── renderer/       # React UI (browser environment)
│   │   ├── App.tsx     # Main component
│   │   ├── logger.ts   # Renderer-specific logger configuration
│   │   ├── components/ # UI components
│   │   └── hooks/      # React hooks
│   ├── shared/         # Shared types and constants
│   │   ├── types.ts    # Includes logging settings types
│   │   ├── logger.ts   # Core structured logging system
│   │   └── ipc-channels.ts # Includes logging IPC channels
│   └── preload.ts      # Secure IPC bridge
├── dist/              # Built files (webpack output)
├── package.json       # Dependencies and scripts
├── tsconfig.*.json    # TypeScript configs (main/renderer)
└── webpack.config.js  # Build configuration
```

## Development Setup

Follow the quickstart instructions in the [README](README.md#quickstart).

### Development Scripts

- `npm run build` - Webpack build (development)
- `npm run build:prod` - Production build
- `npm start` - Run Electron app
- `npm run dev` - Build and run
- `npm run compile` - TypeScript compilation check

## Core Implementation Details

### Editor Detection System

vstab supports multiple code editors through a flexible, pattern-based detection system implemented in `src/main/windows.ts`.

#### Architecture

```typescript
interface EditorPattern {
  id: string;
  displayName: string;
  appNamePatterns: string[];
}

interface EditorDetectionConfig {
  editors: EditorPattern[];
}
```

#### Detection Logic

The `isEditorWindow()` function matches yabai window data against configured editor patterns:

```typescript
function isEditorWindow(window: YabaiWindow, settings: AppSettings): boolean {
  return settings.editorDetectionConfig.editors.some(editor =>
    editor.appNamePatterns.some(pattern => window.app.includes(pattern))
  );
}
```

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
- Tab order automatically persisted to `userData/tab-order.json`
- Clicking tabs triggers window resizing when auto-resize settings are enabled

### Logging System

vstab implements a comprehensive structured logging system for production debugging and monitoring.

#### Architecture

- **Core Logger** (`src/shared/logger.ts`): Structured logging with TypeScript interfaces and multiple log levels
- **File Logger** (`src/main/file-logger.ts`): File-based persistence with automatic rotation and cleanup
- **Logger Initialization** (`src/main/logger-init.ts`): Connects file logging to main logger and handles settings updates
- **Renderer Logger** (`src/renderer/logger.ts`): Browser-optimized configuration for UI components

#### Log Levels and Usage

```typescript
import { logger } from '@shared/logger';

// Error: Critical failures, system errors
logger.error('Failed to connect to yabai', 'windows', error);

// Warn: Recoverable issues, validation failures
logger.warn('Invalid settings detected', 'settings', { invalidKeys });

// Info: Application lifecycle, user actions
logger.info('Tab order saved successfully', 'persistence');

// Debug: Detailed traces, IPC messages, timing
logger.debug('Window discovered', 'windows', { windowId, title });
```

#### Log Storage

- **Location**: `~/.config/vstab/logs/`
- **Format**: JSON structured logs (one per line)
- **Rotation**: Daily files with size-based rotation (1-100MB configurable)
- **Retention**: Automatic cleanup (1-30 days configurable)
- **File Naming**: `vstab-YYYY-MM-DD.log` with timestamp suffixes for rotated files

#### Configuration

- **Runtime Control**: Log level and file output controlled via user settings
- **Development**: Renderer process logs to console for debugging
- **Production**: Main process handles all file logging
- **IPC Integration**: Settings sync between main and renderer processes

### IPC Communication

- Main process handles yabai operations and file persistence
- Renderer process handles UI and user interactions
- Preload script provides secure IPC bridge
- Settings changes are broadcast across the app for immediate application
- All components automatically update when settings change via IPC notifications
- Dedicated channels for log file access and management

### Settings Architecture

vstab implements a comprehensive settings management system with type safety, persistence, and real-time updates.

#### Settings Structure

All settings are defined in `src/shared/types.ts` as the `AppSettings` interface:

```typescript
export interface AppSettings {
  theme: Theme; // 'light' | 'dark' | 'system'
  tabBarHeight: number; // 25-60px range
  topMargin: number; // Spacing above tab bar
  bottomMargin: number; // Spacing below tab bar
  autoHide: boolean; // Auto-hide when editors inactive
  editorDetectionConfig: EditorDetectionConfig; // Multi-editor support
  autoResizeVertical: boolean; // Enable vertical window resizing
  autoResizeHorizontal: boolean; // Enable horizontal window resizing
  logLevel: LogLevel; // 'error' | 'warn' | 'info' | 'debug'
  logRetentionDays: number; // 1-30 days
  maxLogFileSizeMB: number; // 1-100MB
}
```

#### Settings Management (`src/main/settings.ts`)

- **Storage Location**: `~/.config/vstab/settings.json`
- **Default Values**: Comprehensive defaults defined in `DEFAULT_SETTINGS` constant
- **Automatic Creation**: Settings file created on first app launch if it doesn't exist
- **Graceful Loading**: Falls back to defaults if file is missing or corrupted
- **Validation**: Settings are validated and merged with defaults to ensure all properties exist

#### Settings UI (Tray Menu)

- **Tray Interface**: Accessible via tray menu with native macOS controls
- **Real-time Updates**: All changes apply immediately without restart
- **Display-only Interface**: Shows current settings values in tray menu

#### IPC Integration

- **Loading**: `SETTINGS_GET` channel retrieves current settings
- **Saving**: `SETTINGS_UPDATE` channel persists changes and broadcasts updates
- **Change Notifications**: `SETTINGS_CHANGED` event notifies all components of updates
- **Type Safety**: All IPC channels use TypeScript interfaces for data validation

#### Settings Features

- **Theme Integration**: Theme changes immediately update CSS custom properties
- **Window Resizing**: Auto-resize settings trigger immediate window repositioning
- **Logging Control**: Log level changes apply to all active loggers
- **Persistence**: All changes automatically saved to disk
- **Error Handling**: Graceful fallback to defaults for invalid settings

## Build System

### TypeScript Configuration

- `tsconfig.json` - Base config
- `tsconfig.main.json` - Main process (Node.js target)
- `tsconfig.renderer.json` - Renderer process (browser target)

### Webpack Setup

- Three separate bundles: main, preload, renderer
- CSS processing with PostCSS and Tailwind
- TypeScript compilation with ts-loader

## yabai Integration

### Window Operations

```bash
# Window discovery pattern (supports multiple editors)
yabai -m query --windows | jq '.[] | select(.app | test("Visual Studio Code|Code|Cursor"; "i"))'

# Window operations
yabai -m window --focus 12345
yabai -m window 12345 --move abs:0:45
yabai -m window 12345 --resize abs:1920:1035
```

### Error Handling

- yabai connection errors logged to console
- Graceful error handling for individual window operations
- Fallback mechanisms for failed yabai commands
- TypeScript strict mode for compile-time safety

## Testing

### Test Structure

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

### Test Commands

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:main` - Run main process tests only
- `npm run test:renderer` - Run renderer process tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:unit` - Run all unit tests
- `npm run test:ci` - Run tests for CI (no watch, with coverage)

### Test Types

**Unit Tests**

- Main process: Window discovery, persistence, IPC handlers
- Renderer process: React components, hooks, UI interactions
- Shared modules: Type definitions and utilities
- Test individual functions and components in isolation

**Integration Tests**

- IPC communication between main and renderer processes
- yabai integration with mocked commands
- File persistence workflows
- Error handling and recovery scenarios

**End-to-End Tests**

- Complete user workflows (tab switching, reordering)
- Application lifecycle (startup, shutdown, restart)
- Auto-hide behavior based on frontmost application
- Window management across different scenarios

### Test Coverage

- Minimum 80% code coverage for functions, lines, and statements
- 70% branch coverage for conditional logic
- Critical paths (window management, persistence) have 100% coverage

## Styling

### Tailwind CSS v4

- Uses CSS custom properties instead of traditional Tailwind classes
- CSS variables defined in `:root` for editor theme colors (VS Code-inspired)
- Inline styles for dynamic states (hover, active)
- **Generic Theming**: CSS variables use `--color-editor-*` prefix for editor-agnostic styling

### Theme Integration

- Matches VS Code's color scheme
- Dark theme by default
- Consistent with VS Code UI patterns

## IPC Architecture

### Channel Definitions

- Defined in `src/shared/ipc-channels.ts`
- Type-safe with TypeScript interfaces
- Handles window management, tab reordering, settings

### Security

- Context isolation enabled in preload script
- Secure IPC bridge pattern
- No direct Node.js access from renderer

## Common Issues & Solutions

### Build Errors

- **Tailwind CSS errors**: Use CSS custom properties, not Tailwind classes
- **TypeScript errors**: Check imports, ensure types are exported
- **Webpack errors**: Verify loader configuration

### Runtime Issues

- **No tab bar**: Check supported editors are running and yabai service is active
- **yabai errors**: Verify yabai installation and Accessibility permissions
- **Window operations fail**: Check yabai can query and control windows
- **IPC errors**: Check channel names match between main/renderer
- **Logging issues**: Check `~/.config/vstab/logs/` directory exists and is writable
- **Application debugging**: Use structured logs for troubleshooting; adjust log level to Debug for detailed information

### Platform Requirements

- **macOS only**: yabai is macOS-specific
- **yabai required**: Must be installed and running
- **Accessibility permissions**: Required for window control
- **Supported Editors**: VS Code, Cursor, or other configured editors must be installed and running

## Code Style Guidelines

### TypeScript

- Use strict mode
- Prefer interfaces over types for object shapes
- Use meaningful names for variables and functions
- Add JSDoc comments for public APIs

### React

- Use functional components with hooks
- Follow existing component patterns
- Keep components focused and single-purpose
- Use TypeScript for all props and state

### File Organization

- Keep main/renderer separation clear
- Group related functionality in modules
- Use barrel exports where appropriate
- Follow existing naming conventions
