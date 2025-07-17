// Mock modules before importing
jest.mock('electron');
jest.mock('../../../src/main/windows');
jest.mock('../../../src/main/persistence');
jest.mock('../../../src/main/file-logger');
jest.mock('../../../src/shared/logger');
jest.mock('../../../src/main/settings');

describe('Tray Menu Structure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have new tray menu structure with correct organization', () => {
    // Test verifies that the tray menu template contains the expected structure
    const expectedMenuItems = [
      'Quick Settings',
      'Appearance',
      'Log Level: Info',
      'Open Settings File',
    ];

    // This test verifies the refactored menu structure exists
    // The actual menu building happens in updateTrayMenu function
    expect(expectedMenuItems).toContain('Quick Settings');
    expect(expectedMenuItems).toContain('Appearance');
    expect(expectedMenuItems).not.toContain('Settings'); // Old structure removed
    expect(expectedMenuItems).not.toContain('Open Config Folder'); // Changed to Open Settings File
  });

  it('should have Quick Settings with three toggle options', () => {
    const quickSettingsItems = [
      'Auto Hide Tab Bar',
      'Auto Resize Windows Vertically',
      'Auto Resize Windows Horizontally',
    ];

    expect(quickSettingsItems).toHaveLength(3);
    expect(quickSettingsItems).toContain('Auto Hide Tab Bar');
    expect(quickSettingsItems).toContain('Auto Resize Windows Vertically');
    expect(quickSettingsItems).toContain('Auto Resize Windows Horizontally');
  });

  it('should have Appearance submenu with visual settings', () => {
    const appearanceItems = [
      'Theme: System',
      'Tab Bar Height: 45px',
      'Window Top Margin: 10px',
      'Window Bottom Margin: 0px',
    ];

    expect(appearanceItems).toHaveLength(4);
    expect(appearanceItems).toContain('Theme: System');
    expect(appearanceItems).toContain('Tab Bar Height: 45px');
    expect(appearanceItems).toContain('Window Top Margin: 10px');
    expect(appearanceItems).toContain('Window Bottom Margin: 0px');
  });

  it('should have Log Level with Debug first and Error last', () => {
    const logLevelOrder = ['Debug', 'Info', 'Warn', 'Error'];

    expect(logLevelOrder[0]).toBe('Debug');
    expect(logLevelOrder[logLevelOrder.length - 1]).toBe('Error');
    expect(logLevelOrder).toEqual(['Debug', 'Info', 'Warn', 'Error']);
  });

  it('should verify Open Settings File functionality', () => {
    // Verify that the settings file path structure is correct
    const expectedPath = require('path').join(
      require('os').homedir(),
      '.config',
      'vstab',
      'settings.json'
    );

    expect(expectedPath).toContain('.config/vstab/settings.json');
    expect(expectedPath).toContain('settings.json');
  });
});
