import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'master/index': 'src/master/index.ts',
    'tenant/index': 'src/tenant/index.ts',
  },
  format: ['cjs'],
  dts: false,
  splitting: false,
  sourcemap: false,
  clean: true,
  // External workspace packages - prisma is loaded dynamically at runtime
  external: [
    '@oms/tenant-db-manager',
  ],
});
