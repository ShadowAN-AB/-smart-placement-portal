const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    testTimeout: 20_000,
    hookTimeout: 60_000,
    fileParallelism: false, // shared in-memory DB
  },
});
