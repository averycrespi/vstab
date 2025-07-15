# CLAUDE.md - AI Assistant Context

This file provides context for AI assistants working on the vstab project.

## Project Overview

**vstab** is a macOS workspace tab switcher for VS Code built with Electron, TypeScript, React, and yabai. It creates a persistent tab bar at the top of the screen that shows all VS Code workspaces and allows quick switching between them with stable window identification and full-screen management.

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
│   │   ├── index.ts    # App entry point
│   │   ├── windows.ts  # yabai window discovery and management
│   │   ├── ipc.ts      # IPC handlers
│   │   ├── persistence.ts # Tab order storage
│   │   └── settings.ts # User settings persistence
│   ├── renderer/       # React UI (browser environment)
│   │   ├── App.tsx     # Main component
│   │   ├── components/ # UI components (Tab, Settings)
│   │   └── hooks/      # React hooks (useTabOrder, useTheme, useWindowVisibility)
│   ├── shared/         # Shared types and constants
│   └── preload.ts      # Secure IPC bridge
├── dist/              # Built files (webpack output)
├── package.json       # Dependencies and scripts
├── tsconfig.*.json    # TypeScript configs (main/renderer)
└── webpack.config.js  # Build configuration
```

## Core Concepts

### Window Discovery
- Uses yabai JSON API to find VS Code windows every 1 second
- Generates stable hash-based window IDs from workspace paths + PID
- Tracks all VS Code instances with rich metadata (space, display, focus state)
- Maintains window ID mapping for reliable operations

### Tab Management
- React components render tabs based on discovered windows
- Drag-and-drop reordering with HTML5 API
- Stable tab order maintained across window switches and closures
- Tab order persisted to `userData/tab-order.json`
- No automatic reordering on tab switches or window focus changes
- Settings button provides access to configuration modal

### User Settings
- Settings stored in `~/.config/vstab/settings.json` with automatic creation
- **Theme Support**: Light, Dark, or System (follows macOS preference) - default: `system`
- **Tab Bar Height**: Configurable height from 25-60px - default: `45px`
- **Auto Resize Vertical**: Toggle vertical window resizing - default: `true`
- **Auto Resize Horizontal**: Toggle horizontal window resizing - default: `true`
- **Auto Hide**: Show tab bar only when VS Code is active - default: `true`
- **Persist Tab Order**: Maintain tab order across sessions - default: `true`
- **Debug Logging**: Enable/disable debug output - default: `false`
- Settings UI accessible via gear icon in tab bar
- Real-time settings updates with immediate effect

### Auto-Hide Behavior
- Polls frontmost app every 500ms via yabai window focus detection
- Shows tab bar only when VS Code is active
- Hides when switching to other applications
- Windows remain visible (no minimizing) for fast tab switching

### IPC Communication
- Main process handles yabai operations and file persistence
- Renderer process handles UI and user interactions
- Preload script provides secure IPC bridge

## Build System

### Scripts
- `npm run build` - Webpack build (development)
- `npm run build:prod` - Production build
- `npm start` - Run Electron app
- `npm run dev` - Build and run
- `npm run compile` - TypeScript compilation check
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check formatting without changing files

### TypeScript Configuration
- `tsconfig.json` - Base config
- `tsconfig.main.json` - Main process (Node.js target)
- `tsconfig.renderer.json` - Renderer process (browser target)

### Webpack Setup
- Three separate bundles: main, preload, renderer
- CSS processing with PostCSS and Tailwind
- TypeScript compilation with ts-loader

## Key Implementation Details

### yabai Integration
```bash
# Window discovery pattern
yabai -m query --windows | jq '.[] | select(.app | contains("Code"))'

# Window operations
yabai -m window --focus 12345
yabai -m window 12345 --move abs:0:55  # Adjusted for configurable tab bar height
yabai -m window 12345 --resize abs:1920:1025
```

### Code Formatting
- **Prettier** configured for consistent code style across the project
- Configuration in `.prettierrc.json` with settings for semicolons, quotes, spacing
- Automatic formatting on file write via Claude Code hooks
- Manual formatting available via `npm run format` command
- Format checking for CI/CD via `npm run format:check`

### Styling Approach
- Uses Tailwind CSS v4 with CSS custom properties
- CSS variables defined in `:root` for VS Code theme colors
- **Theme System**: Light and dark themes with system preference detection
- Dynamic theme switching via `data-theme` attribute on document root
- Inline styles for dynamic states (hover, active)

### IPC Channels
- Defined in `src/shared/ipc-channels.ts`
- Type-safe with TypeScript interfaces
- Handles window management, tab reordering, and user settings
- **Settings IPC**: `SETTINGS_GET` and `SETTINGS_UPDATE` for configuration management

### Settings Architecture
- **Storage Location**: `~/.config/vstab/settings.json` (XDG Base Directory compliant)
- **Default Creation**: Settings file auto-created on first app launch with sensible defaults
- **Settings Types**: All settings defined in `src/shared/types.ts` with TypeScript interfaces
- **IPC Communication**: Settings loaded/saved via `SETTINGS_GET` and `SETTINGS_UPDATE` channels
- **Real-time Updates**: Settings changes apply immediately without restart required
- **Theme Integration**: Theme setting controls CSS variables via `data-theme` attribute
- **Window Resize Integration**: Auto-resize settings control yabai window positioning behavior

### Error Handling
- yabai connection errors logged to console
- Graceful error handling for individual window operations
- Fallback mechanisms for failed yabai commands
- Settings file creation/read errors handled gracefully with defaults
- TypeScript strict mode for compile-time safety

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
6. Test with multiple VS Code windows

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
- `npm run test:integration` - Run integration tests only
- `npm run test:unit` - Run all unit tests
- `npm run test:ci` - Run tests for CI (no watch, with coverage)

#### Test Types

**Unit Tests (40+ tests)**
- Main process: Window discovery, persistence, IPC handlers
- Renderer process: React components, hooks, UI interactions
- Shared modules: Type definitions and utilities
- Test individual functions and components in isolation

**Integration Tests (15+ tests)**
- IPC communication between main and renderer processes
- yabai integration with mocked commands
- File persistence workflows
- Error handling and recovery scenarios

**End-to-End Tests (5+ tests)**
- Complete user workflows (tab switching, reordering)
- Application lifecycle (startup, shutdown, restart)
- Auto-hide behavior based on frontmost application
- Window management across different scenarios

#### Test Coverage
- Minimum 80% code coverage for functions, lines, and statements
- 70% branch coverage for conditional logic
- Critical paths (window management, persistence) have 100% coverage

#### Manual Testing Checklist
- Manual testing with multiple VS Code workspaces
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
npm run test:integration

# Run with coverage
npm run test:coverage

# Run in watch mode during development
npm run test:watch
```

## Common Issues & Solutions

### Build Errors
- **Tailwind CSS errors**: Use CSS custom properties, not Tailwind classes
- **TypeScript errors**: Check imports, ensure types are exported
- **Webpack errors**: Verify loader configuration

### Runtime Issues
- **No tab bar**: Check VS Code is running and yabai service is active
- **yabai errors**: Verify yabai installation and Accessibility permissions
- **Window operations fail**: Check yabai can query and control windows
- **IPC errors**: Check channel names match between main/renderer
- **Settings not persisting**: Check `~/.config/vstab/` directory permissions
- **Theme not applying**: Verify settings are loaded and theme hook is working

### Platform Requirements
- **macOS only**: yabai is macOS-specific
- **yabai required**: Must be installed and running
- **Accessibility permissions**: Required for window control
- **VS Code**: Must be installed and running

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
- `electron` - Desktop app framework
- `react` + `react-dom` - UI framework
- `typescript` - Type safety
- `webpack` + loaders - Build system
- `tailwindcss` + `@tailwindcss/postcss` - Styling
- `yabai` - External dependency for window management

### Dev Dependencies
- `@types/*` - TypeScript definitions
- `ts-loader` - TypeScript webpack loader
- `css-loader`, `style-loader`, `postcss-loader` - CSS processing
- `html-webpack-plugin` - HTML generation
- `prettier` - Code formatting and style enforcement
- `jest` + testing libraries - Test framework and utilities

## Best Practices for AI Assistants

1. **Always build before testing**: Run `npm run build` after changes
2. **Check TypeScript compilation**: Use `npm run compile` to verify types
3. **Verify code formatting**: Use `npm run format:check` to ensure consistent style
4. **Run tests for changes**: Use `npm test` to ensure functionality works
4. **Test with real VS Code windows**: Open multiple workspaces for testing
5. **Respect the architecture**: Keep main/renderer separation clear
6. **Update types first**: When adding features, update shared types
7. **Follow existing patterns**: Use established IPC channels and hooks
8. **Consider yabai requirements**: Ensure yabai service is running
9. **Test window operations**: Verify yabai commands work as expected
10. **Maintain tab order stability**: Don't reorder on focus changes
11. **Maintain security**: Keep contextIsolation enabled in preload
12. **Write tests for new features**: Add unit, integration, and E2E tests as appropriate
13. **Test settings functionality**: Verify settings persistence, theme switching, and window resizing
14. **Update tests for changes**: When modifying components, update corresponding test mocks and expectations
15. **ALWAYS UPDATE DOCUMENTATION**: After implementing features or making significant changes, update documentation (CLAUDE.md, README.md, DEVELOPERS.md, etc.) to reflect the new functionality, architecture changes, file structure updates, and any new best practices or troubleshooting steps

This context should help AI assistants understand the project structure, make appropriate changes, and troubleshoot common issues effectively.