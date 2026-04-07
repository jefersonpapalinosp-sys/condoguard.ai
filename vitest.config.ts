import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, '.'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**'],
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      include: [
        'src/services/http.ts',
        'src/services/apiStatus.ts',
        'src/services/invoicesService.ts',
        'src/shared/ui/DataSourceBadge.tsx',
        'src/shared/ui/ApiFallbackToast.tsx',
        'src/shared/ui/states/LoadingState.tsx',
        'src/shared/ui/states/ErrorState.tsx',
        'src/shared/ui/states/EmptyState.tsx',
        'src/features/auth/context/AuthContext.tsx',
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        statements: 75,
        branches: 65,
      },
    },
  },
});
