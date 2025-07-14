// Mock modules BEFORE importing
jest.mock('electron');
jest.mock('fs/promises');
jest.mock('path');

import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';

const mockApp = jest.mocked(app);
const mockFs = jest.mocked(fs);
const mockPath = jest.mocked(path);

// Setup mocks before importing the module under test
const mockUserDataPath = '/tmp/test-userData';
const mockTabOrderFile = '/tmp/test-userData/tab-order.json';

mockApp.getPath.mockReturnValue(mockUserDataPath);
mockPath.join.mockReturnValue(mockTabOrderFile);

// Now import the module under test
import { loadTabOrder, saveTabOrder } from '../../../src/main/persistence';

describe('Persistence Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Re-setup mocks for each test
    mockApp.getPath.mockReturnValue(mockUserDataPath);
    mockPath.join.mockReturnValue(mockTabOrderFile);
  });

  describe('loadTabOrder', () => {
    it('should load tab order from file successfully', async () => {
      const mockTabOrder = ['window1', 'window2', 'window3'];
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockTabOrder));

      const result = await loadTabOrder();

      expect(mockFs.readFile).toHaveBeenCalledWith(mockTabOrderFile, 'utf-8');
      expect(result).toEqual(mockTabOrder);
    });

    it('should return empty array when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      const result = await loadTabOrder();

      expect(result).toEqual([]);
    });

    it('should return empty array when file contains invalid JSON', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      const result = await loadTabOrder();

      expect(result).toEqual([]);
    });

    it('should return empty array when file read fails', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const result = await loadTabOrder();

      expect(result).toEqual([]);
    });

    it('should handle empty file', async () => {
      mockFs.readFile.mockResolvedValue('');

      const result = await loadTabOrder();

      expect(result).toEqual([]);
    });

    it('should handle file with null content', async () => {
      mockFs.readFile.mockResolvedValue('null');

      const result = await loadTabOrder();

      expect(result).toEqual([]);
    });

    it('should handle file with non-array JSON', async () => {
      mockFs.readFile.mockResolvedValue('{"not": "array"}');

      const result = await loadTabOrder();

      expect(result).toEqual([]);
    });
  });

  describe('saveTabOrder', () => {
    it('should save tab order to file successfully', async () => {
      const windowIds = ['window1', 'window2', 'window3'];
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await saveTabOrder(windowIds);

      expect(mockFs.mkdir).toHaveBeenCalledWith(mockUserDataPath, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        mockTabOrderFile,
        JSON.stringify(windowIds, null, 2)
      );
    });

    it('should handle empty array', async () => {
      const windowIds: string[] = [];
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await saveTabOrder(windowIds);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        mockTabOrderFile,
        JSON.stringify([], null, 2)
      );
    });

    it('should handle single window ID', async () => {
      const windowIds = ['single-window'];
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await saveTabOrder(windowIds);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        mockTabOrderFile,
        JSON.stringify(['single-window'], null, 2)
      );
    });

    it('should create directory if it does not exist', async () => {
      const windowIds = ['window1'];
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await saveTabOrder(windowIds);

      expect(mockFs.mkdir).toHaveBeenCalledWith(mockUserDataPath, { recursive: true });
    });

    it('should handle mkdir error gracefully and still throw', async () => {
      const windowIds = ['window1'];
      const mkdirError = new Error('Permission denied');
      mockFs.mkdir.mockRejectedValue(mkdirError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(saveTabOrder(windowIds)).rejects.toThrow('Permission denied');

      expect(consoleSpy).toHaveBeenCalledWith('Error saving tab order:', mkdirError);
      
      consoleSpy.mockRestore();
    });

    it('should handle writeFile error', async () => {
      const windowIds = ['window1'];
      mockFs.mkdir.mockResolvedValue(undefined);
      const writeError = new Error('Disk full');
      mockFs.writeFile.mockRejectedValue(writeError);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(saveTabOrder(windowIds)).rejects.toThrow('Disk full');

      expect(consoleSpy).toHaveBeenCalledWith('Error saving tab order:', writeError);
      
      consoleSpy.mockRestore();
    });

    it('should save complex window IDs correctly', async () => {
      const windowIds = [
        'hash-abc123',
        'hash-def456',
        'hash-ghi789-with-longer-name'
      ];
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await saveTabOrder(windowIds);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        mockTabOrderFile,
        JSON.stringify(windowIds, null, 2)
      );
    });

    it('should handle very large arrays', async () => {
      const windowIds = Array.from({ length: 1000 }, (_, i) => `window-${i}`);
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await saveTabOrder(windowIds);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        mockTabOrderFile,
        JSON.stringify(windowIds, null, 2)
      );
    });

    it('should handle special characters in window IDs', async () => {
      const windowIds = [
        'window-with-dash',
        'window_with_underscore',
        'window.with.dots',
        'window@with@symbols'
      ];
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await saveTabOrder(windowIds);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        mockTabOrderFile,
        JSON.stringify(windowIds, null, 2)
      );
    });
  });

  describe('Integration scenarios', () => {
    it('should handle save and load cycle correctly', async () => {
      const originalOrder = ['window1', 'window2', 'window3'];
      
      // Save
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      await saveTabOrder(originalOrder);

      // Load
      mockFs.readFile.mockResolvedValue(JSON.stringify(originalOrder, null, 2));
      const loadedOrder = await loadTabOrder();

      expect(loadedOrder).toEqual(originalOrder);
    });

    it('should handle overwriting existing file', async () => {
      const firstOrder = ['window1', 'window2'];
      const secondOrder = ['window3', 'window4', 'window5'];

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Save first order
      await saveTabOrder(firstOrder);
      
      // Save second order (overwrite)
      await saveTabOrder(secondOrder);

      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
      expect(mockFs.writeFile).toHaveBeenLastCalledWith(
        mockTabOrderFile,
        JSON.stringify(secondOrder, null, 2)
      );
    });
  });
});