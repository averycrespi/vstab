module.exports = {
  projects: [
    // Main process (Node.js environment)
    {
      displayName: 'main',
      testMatch: ['<rootDir>/__tests__/unit/main/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@main/(.*)$': '<rootDir>/src/main/$1',
        '^@renderer/(.*)$': '<rootDir>/src/renderer/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.main.js'],
      collectCoverageFrom: [
        'src/main/**/*.ts',
        '!src/main/index.ts', // Skip main entry point
      ],
    },

    // Renderer process (JSDOM environment)
    {
      displayName: 'renderer',
      testMatch: ['<rootDir>/__tests__/unit/renderer/**/*.test.{ts,tsx}'],
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@main/(.*)$': '<rootDir>/src/main/$1',
        '^@renderer/(.*)$': '<rootDir>/src/renderer/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.renderer.js'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      collectCoverageFrom: [
        'src/renderer/**/*.{ts,tsx}',
        '!src/renderer/index.tsx', // Skip entry point
        '!src/renderer/**/*.d.ts',
      ],
    },

    // Shared modules (Node.js environment)
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/__tests__/unit/shared/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@main/(.*)$': '<rootDir>/src/main/$1',
        '^@renderer/(.*)$': '<rootDir>/src/renderer/$1',
      },
      collectCoverageFrom: ['src/shared/**/*.ts', '!src/shared/**/*.d.ts'],
    },

    // Integration tests (Node.js environment)
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.ts'],
      preset: 'ts-jest',
      testEnvironment: 'node',
      moduleNameMapper: {
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@main/(.*)$': '<rootDir>/src/main/$1',
        '^@renderer/(.*)$': '<rootDir>/src/renderer/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.integration.js'],
    },
  ],

  // Global coverage settings
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Global test settings
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
};
