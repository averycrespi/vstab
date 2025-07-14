# CLAUDE.md - AI Assistant Context

This file provides context for AI assistants working on the vstab project.

## Project Overview

**vstab** is a macOS workspace tab switcher for VS Code built with Electron, TypeScript, React, and yabai. It creates a persistent tab bar at the top of the screen that shows all VS Code workspaces and allows quick switching between them with stable window identification and full-screen management.

## Key Technologies

- **Electron 37.2.1** - Desktop app framework
- **TypeScript** - Main language for type safety
- **React 19** - UI framework for renderer process
- **Tailwind CSS v4** - Styling (using CSS custom properties)
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
yabai -m window 12345 --move abs:0:45
yabai -m window 12345 --resize abs:1920:1035
```

### Styling Approach
- Uses Tailwind CSS v4 with CSS custom properties
- CSS variables defined in `:root` for VS Code theme colors
- Inline styles for dynamic states (hover, active)

### IPC Channels
- Defined in `src/shared/ipc-channels.ts`
- Type-safe with TypeScript interfaces
- Handles window management, tab reordering, settings

### Error Handling
- yabai connection errors logged to console
- Graceful error handling for individual window operations
- Fallback mechanisms for failed yabai commands
- TypeScript strict mode for compile-time safety

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
5. Test with multiple VS Code windows

### Testing
- Manual testing with multiple VS Code workspaces
- Check auto-hide behavior by switching apps
- Test drag-and-drop reordering
- Verify tab order stability during window switches
- Test full-screen window resizing
- Verify persistence across app restarts

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

## Best Practices for AI Assistants

1. **Always build before testing**: Run `npm run build` after changes
2. **Check TypeScript compilation**: Use `npm run compile` to verify types
3. **Test with real VS Code windows**: Open multiple workspaces for testing
4. **Respect the architecture**: Keep main/renderer separation clear
5. **Update types first**: When adding features, update shared types
6. **Follow existing patterns**: Use established IPC channels and hooks
7. **Consider yabai requirements**: Ensure yabai service is running
8. **Test window operations**: Verify yabai commands work as expected
9. **Maintain tab order stability**: Don't reorder on focus changes
10. **Maintain security**: Keep contextIsolation enabled in preload

This context should help AI assistants understand the project structure, make appropriate changes, and troubleshoot common issues effectively.