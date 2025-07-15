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
│   │   └── persistence.ts # Tab order storage
│   ├── renderer/       # React UI (browser environment)
│   │   ├── App.tsx     # Main component
│   │   ├── components/ # UI components
│   │   └── hooks/      # React hooks
│   ├── shared/         # Shared types and constants
│   └── preload.ts      # Secure IPC bridge
├── dist/              # Built files (webpack output)
├── package.json       # Dependencies and scripts
├── tsconfig.*.json    # TypeScript configs (main/renderer)
└── webpack.config.js  # Build configuration
```

## Development Setup

Follow the installation instructions in the [README](README.md).

### Development Scripts

- `npm run build` - Webpack build (development)
- `npm run build:prod` - Production build
- `npm start` - Run Electron app
- `npm run dev` - Build and run
- `npm run compile` - TypeScript compilation check

## Core Implementation Details

### Window Discovery

- Uses yabai JSON API to find VS Code windows every 1 second
- Generates stable hash-based window IDs from workspace paths + PID
- Tracks all VS Code instances with rich metadata (space, display, focus state)
- Maintains window ID mapping for reliable operations

### Tab Management

- React components render tabs based on discovered windows
- Drag-and-drop reordering with HTML5 API
- Stable tab order maintained across window switches and closures
- Tab order automatically persisted to `userData/tab-order.json`
- No automatic reordering on tab switches or window focus changes
- **Tab Click Behavior**: Clicking tabs now triggers window resizing when auto-resize settings are enabled
- **Window Positioning**: VS Code windows are automatically repositioned and resized on every tab click (respects auto-resize settings)

### Auto-Hide Behavior

- Polls frontmost app every 250ms via yabai window focus detection for improved responsiveness
- Shows tab bar only when VS Code is active (when `autoHide` setting is enabled)
- Automatically shows tab bar when `autoHide` setting is disabled
- Hides when switching to other applications
- Windows remain visible (no minimizing) for fast tab switching
- Enhanced error handling with retry logic for failed yabai queries
- Improved app name matching for various VS Code process names

### IPC Communication

- Main process handles yabai operations and file persistence
- Renderer process handles UI and user interactions
- Preload script provides secure IPC bridge
- **Real-time Settings**: `SETTINGS_CHANGED` event broadcasts setting updates across the app for immediate application
- **Settings Synchronization**: All components automatically update when settings change via IPC notifications

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
# Window discovery pattern
yabai -m query --windows | jq '.[] | select(.app | contains("Code"))'

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

### Test Coverage

- Minimum 80% code coverage for functions, lines, and statements
- 70% branch coverage for conditional logic
- Critical paths (window management, persistence) have 100% coverage

### Manual Testing Checklist

- Manual testing with multiple VS Code workspaces
- Check auto-hide behavior by switching apps (verify improved responsiveness)
- Test auto-hide setting toggle (disabled should always show tab bar)
- Test settings changes apply immediately without restart
- Test drag-and-drop reordering
- Verify tab order stability during window switches
- Test window resizing on tab clicks (when auto-resize is enabled)
- Test full-screen window resizing
- Verify persistence across app restarts

## Styling

### Tailwind CSS v4

- Uses CSS custom properties instead of traditional Tailwind classes
- CSS variables defined in `:root` for VS Code theme colors
- Inline styles for dynamic states (hover, active)

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

## Development Workflow

### Making Changes

1. Edit source files in `src/`
2. Run `npm run build` to compile
3. Run `npm start` to test
4. Check console for errors

### Adding Features

1. Update types in `src/shared/types.ts`
2. Add IPC channels in `src/shared/ipc-channels.ts`
3. Implement in main process (`src/main/`)
4. Update UI in renderer process (`src/renderer/`)
5. Write tests for new functionality
6. Test with multiple VS Code windows

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

### Platform Requirements

- **macOS only**: yabai is macOS-specific
- **yabai required**: Must be installed and running
- **Accessibility permissions**: Required for window control
- **VS Code**: Must be installed and running

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

## Best Practices

1. **Always build before testing**: Run `npm run build` after changes
2. **Check TypeScript compilation**: Use `npm run compile` to verify types
3. **Run tests for changes**: Use `npm test` to ensure functionality works
4. **Test with real VS Code windows**: Open multiple workspaces for testing
5. **Respect the architecture**: Keep main/renderer separation clear
6. **Update types first**: When adding features, update shared types
7. **Follow existing patterns**: Use established IPC channels and hooks
8. **Consider yabai requirements**: Ensure yabai service is running
9. **Test window operations**: Verify yabai commands work as expected
10. **Maintain tab order stability**: Don't reorder on focus changes
11. **Maintain security**: Keep contextIsolation enabled in preload
12. **Write tests for new features**: Add unit, integration, and E2E tests as appropriate

## Contributing

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes with tests
4. Ensure all tests pass: `npm test`
5. Check TypeScript compilation: `npm run compile`
6. Test manually with multiple VS Code windows
7. Commit with conventional commits: `git commit -m "feat: add new feature"`
8. Push and create a Pull Request

### Code Review Guidelines

- Ensure changes maintain type safety
- Verify yabai integration still works
- Check that tab order remains stable
- Test auto-hide behavior
- Validate window management operations

## Future Enhancements

### Planned Features (Low Priority)

- UI polish and animations
- Settings UI for configuration options
- Multi-monitor optimization
- Custom themes and styling options

### Potential Improvements

- Performance optimizations for many windows
- Enhanced yabai configuration options
- Keyboard shortcuts for tab switching
- Better window state persistence
