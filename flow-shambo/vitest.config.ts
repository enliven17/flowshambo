import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Environment for React component testing
    environment: 'jsdom',
    
    // Global test setup
    globals: true,
    
    // Setup files to run before tests
    setupFiles: ['./src/test/setup.ts'],
    
    // Include test files
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
      ],
    },
    
    // Property-based testing configuration
    // fast-check will use these defaults
    testTimeout: 30000, // 30 seconds for property tests
    
    // Reporter configuration
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
