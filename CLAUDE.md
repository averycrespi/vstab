# CLAUDE.md - AI Assistant Context

This file provides context for AI assistants working on the vstab project.

## Project Overview

**vstab** is a macOS workspace tab switcher for VS Code built with Electron, TypeScript, and React. It creates a persistent tab bar at the top of the screen that shows all VS Code workspaces and allows quick switching between them.

## Key Technologies

- **Electron 37.2.1** - Desktop app framework
- **TypeScript** - Main language for type safety
- **React 19** - UI framework for renderer process
- **Tailwind CSS v4** - Styling (using CSS custom properties)
- **Webpack** - Build system
- **AppleScript** - macOS window management
- **Node.js/npm** - Package management

## Project Structure

```
vstab/
├── src/
│   ├── main/           # Electron main process (Node.js)
│   │   ├── index.ts    # App entry point
│   │   ├── windows.ts  # AppleScript window discovery
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
- Uses AppleScript to find VS Code windows every 1 second
- Parses window titles to extract workspace paths
- Tracks window IDs for focusing/hiding

### Tab Management
- React components render tabs based on discovered windows
- Drag-and-drop reordering with HTML5 API
- Tab order persisted to `userData/tab-order.json`

### Auto-Hide Behavior
- Polls frontmost app every 500ms
- Shows tab bar only when VS Code is active
- Hides when switching to other applications

### IPC Communication
- Main process handles AppleScript and file operations
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

### AppleScript Integration
```applescript
# Window discovery pattern
tell application "System Events"
    set vscodeProcesses to every process whose name contains "Code"
    # Extract window details...
end tell
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
- AppleScript errors logged to console
- Graceful degradation when VS Code not found
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
- Verify persistence across app restarts

## Common Issues & Solutions

### Build Errors
- **Tailwind CSS errors**: Use CSS custom properties, not Tailwind classes
- **TypeScript errors**: Check imports, ensure types are exported
- **Webpack errors**: Verify loader configuration

### Runtime Issues
- **No tab bar**: Check VS Code is running and focused
- **AppleScript errors**: Verify Accessibility permissions
- **IPC errors**: Check channel names match between main/renderer

### Platform Requirements
- **macOS only**: AppleScript is macOS-specific
- **Accessibility permissions**: Required for window control
- **VS Code**: Must be installed and running

## Future Enhancements

### Planned Features (Low Priority)
- yabai integration for advanced window management
- UI polish and animations
- Electron Builder packaging
- Settings UI for configuration

### Potential Improvements
- Better error handling and user feedback
- Multi-monitor support optimization
- Performance optimizations for many windows
- Custom themes and styling options

## Dependencies Notes

### Key Dependencies
- `electron` - Desktop app framework
- `react` + `react-dom` - UI framework
- `typescript` - Type safety
- `webpack` + loaders - Build system
- `tailwindcss` + `@tailwindcss/postcss` - Styling

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
7. **Consider macOS specifics**: AppleScript syntax and behaviors
8. **Maintain security**: Keep contextIsolation enabled in preload

This context should help AI assistants understand the project structure, make appropriate changes, and troubleshoot common issues effectively.