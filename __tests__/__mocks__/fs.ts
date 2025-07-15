// Mock file system functionality for testing

interface MockFileSystemEntry {
  type: 'file' | 'directory';
  content?: string | Buffer;
  children?: Map<string, MockFileSystemEntry>;
  stats?: {
    size: number;
    mtime: Date;
    ctime: Date;
    isFile: () => boolean;
    isDirectory: () => boolean;
  };
}

class FileSystemMock {
  private fs = new Map<string, MockFileSystemEntry>();
  private currentWorkingDirectory = '/tmp/test-cwd';

  constructor() {
    this.reset();
  }

  reset() {
    this.fs.clear();
    // Create basic directory structure
    this.ensureDirectory('/tmp');
    this.ensureDirectory('/tmp/test-userData');
    this.ensureDirectory('/tmp/test-temp');
  }

  private normalizePath(path: string): string {
    // Convert relative paths to absolute
    if (!path.startsWith('/')) {
      path = `${this.currentWorkingDirectory}/${path}`;
    }

    // Normalize path (remove ./ and ../ etc)
    const parts = path.split('/').filter(part => part !== '');
    const normalizedParts: string[] = [];

    for (const part of parts) {
      if (part === '.') {
        continue;
      } else if (part === '..') {
        normalizedParts.pop();
      } else {
        normalizedParts.push(part);
      }
    }

    return '/' + normalizedParts.join('/');
  }

  private ensureDirectory(path: string) {
    const normalizedPath = this.normalizePath(path);
    const parts = normalizedPath.split('/').filter(part => part !== '');
    let currentPath = '';

    for (const part of parts) {
      currentPath += '/' + part;
      if (!this.fs.has(currentPath)) {
        this.fs.set(currentPath, {
          type: 'directory',
          children: new Map(),
          stats: {
            size: 0,
            mtime: new Date(),
            ctime: new Date(),
            isFile: () => false,
            isDirectory: () => true,
          },
        });
      }
    }
  }

  private getParentPath(path: string): string {
    const parts = path.split('/');
    parts.pop();
    return parts.join('/') || '/';
  }

  // Mock fs/promises methods
  readFile = jest.fn(
    async (path: string, encoding?: string): Promise<string | Buffer> => {
      const normalizedPath = this.normalizePath(path);
      const entry = this.fs.get(normalizedPath);

      if (!entry) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }

      if (entry.type !== 'file') {
        throw new Error(`EISDIR: illegal operation on a directory, read`);
      }

      if (encoding === 'utf-8' || encoding === 'utf8') {
        return (entry.content as string) || '';
      }

      return (entry.content as Buffer) || Buffer.from('');
    }
  );

  writeFile = jest.fn(
    async (
      path: string,
      data: string | Buffer,
      options?: any
    ): Promise<void> => {
      const normalizedPath = this.normalizePath(path);
      const parentPath = this.getParentPath(normalizedPath);

      // Ensure parent directory exists
      this.ensureDirectory(parentPath);

      this.fs.set(normalizedPath, {
        type: 'file',
        content: data,
        stats: {
          size: typeof data === 'string' ? data.length : data.length,
          mtime: new Date(),
          ctime: new Date(),
          isFile: () => true,
          isDirectory: () => false,
        },
      });
    }
  );

  mkdir = jest.fn(async (path: string, options?: any): Promise<void> => {
    const normalizedPath = this.normalizePath(path);

    if (options?.recursive) {
      this.ensureDirectory(normalizedPath);
    } else {
      const parentPath = this.getParentPath(normalizedPath);
      if (!this.fs.has(parentPath)) {
        throw new Error(`ENOENT: no such file or directory, mkdir '${path}'`);
      }

      this.fs.set(normalizedPath, {
        type: 'directory',
        children: new Map(),
        stats: {
          size: 0,
          mtime: new Date(),
          ctime: new Date(),
          isFile: () => false,
          isDirectory: () => true,
        },
      });
    }
  });

  rmdir = jest.fn(async (path: string, options?: any): Promise<void> => {
    const normalizedPath = this.normalizePath(path);
    const entry = this.fs.get(normalizedPath);

    if (!entry) {
      throw new Error(`ENOENT: no such file or directory, rmdir '${path}'`);
    }

    if (entry.type !== 'directory') {
      throw new Error(`ENOTDIR: not a directory, rmdir '${path}'`);
    }

    this.fs.delete(normalizedPath);
  });

  unlink = jest.fn(async (path: string): Promise<void> => {
    const normalizedPath = this.normalizePath(path);
    const entry = this.fs.get(normalizedPath);

    if (!entry) {
      throw new Error(`ENOENT: no such file or directory, unlink '${path}'`);
    }

    if (entry.type !== 'file') {
      throw new Error(`EPERM: operation not permitted, unlink '${path}'`);
    }

    this.fs.delete(normalizedPath);
  });

  access = jest.fn(async (path: string, mode?: number): Promise<void> => {
    const normalizedPath = this.normalizePath(path);
    if (!this.fs.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, access '${path}'`);
    }
  });

  stat = jest.fn(async (path: string): Promise<any> => {
    const normalizedPath = this.normalizePath(path);
    const entry = this.fs.get(normalizedPath);

    if (!entry) {
      throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }

    return entry.stats;
  });

  readdir = jest.fn(async (path: string): Promise<string[]> => {
    const normalizedPath = this.normalizePath(path);
    const entry = this.fs.get(normalizedPath);

    if (!entry) {
      throw new Error(`ENOENT: no such file or directory, scandir '${path}'`);
    }

    if (entry.type !== 'directory') {
      throw new Error(`ENOTDIR: not a directory, scandir '${path}'`);
    }

    const files: string[] = [];
    for (const [filePath] of this.fs) {
      if (filePath.startsWith(normalizedPath + '/')) {
        const relativePath = filePath.substring(normalizedPath.length + 1);
        if (!relativePath.includes('/')) {
          files.push(relativePath);
        }
      }
    }

    return files;
  });

  // Helper methods for testing
  setFile(path: string, content: string | Buffer) {
    const normalizedPath = this.normalizePath(path);
    const parentPath = this.getParentPath(normalizedPath);
    this.ensureDirectory(parentPath);

    this.fs.set(normalizedPath, {
      type: 'file',
      content,
      stats: {
        size: typeof content === 'string' ? content.length : content.length,
        mtime: new Date(),
        ctime: new Date(),
        isFile: () => true,
        isDirectory: () => false,
      },
    });
  }

  hasFile(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const entry = this.fs.get(normalizedPath);
    return entry?.type === 'file';
  }

  hasDirectory(path: string): boolean {
    const normalizedPath = this.normalizePath(path);
    const entry = this.fs.get(normalizedPath);
    return entry?.type === 'directory';
  }

  getFileContent(path: string): string | Buffer | undefined {
    const normalizedPath = this.normalizePath(path);
    const entry = this.fs.get(normalizedPath);
    return entry?.content;
  }

  listFiles(): string[] {
    return Array.from(this.fs.keys()).filter(path => {
      const entry = this.fs.get(path);
      return entry?.type === 'file';
    });
  }

  setCwd(path: string) {
    this.currentWorkingDirectory = path;
  }

  getCwd(): string {
    return this.currentWorkingDirectory;
  }
}

// Export singleton instance
export const fsMock = new FileSystemMock();

// Export individual methods for Jest mocking
export const {
  readFile,
  writeFile,
  mkdir,
  rmdir,
  unlink,
  access,
  stat,
  readdir,
} = fsMock;
