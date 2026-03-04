import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: false, // Disabled for Docker builds - types are handled at dev time
  splitting: false,
  sourcemap: false,
  clean: true,
  // External workspace packages - prisma is loaded dynamically at runtime
  external: [
    '@oms/database',
    'lru-cache',
  ],
});
