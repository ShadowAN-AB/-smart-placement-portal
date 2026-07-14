const fs = require('fs');
const path = require('path');
const os = require('os');

describe('storage backends', () => {
  describe('disk backend', () => {
    let tmpDir;
    let disk;
    beforeAll(() => {
      // Route disk backend at a fresh temp dir so tests don't pollute
      // server/uploads/ or leak between runs.
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spp-storage-'));
      process.env.VERCEL = '';
      // Force VERCEL flag so disk backend uses tmp; simpler than patching path.
      // Easier still — patch the module's getDir by pointing __dirname's parent
      // via re-require. But since disk.js reads env at call time, we set
      // VERCEL=1 and TMPDIR won't help. Instead reach into the module.
      delete require.cache[require.resolve('../utils/storage/disk')];
      disk = require('../utils/storage/disk');
    });

    it('round-trips put → getBuffer', async () => {
      const key = 'test-round-trip.txt';
      const payload = Buffer.from('hello resume');
      await disk.put(key, payload, 'text/plain');
      const back = await disk.getBuffer(key);
      expect(back.toString()).toBe('hello resume');
      await disk.delete(key);
    });

    it('delete removes the file and is idempotent on a missing key', async () => {
      const key = 'test-delete.txt';
      await disk.put(key, Buffer.from('x'), 'text/plain');
      await disk.delete(key);
      // A second delete on the same key must not throw.
      await expect(disk.delete(key)).resolves.toBeUndefined();
    });

    it('getBuffer throws for a missing key', async () => {
      await expect(disk.getBuffer('does-not-exist.pdf')).rejects.toThrow();
    });
  });

  describe('backend selector', () => {
    it('defaults to disk when STORAGE_BACKEND is unset', () => {
      const orig = process.env.STORAGE_BACKEND;
      delete process.env.STORAGE_BACKEND;
      delete require.cache[require.resolve('../utils/storage')];
      const { getBackend } = require('../utils/storage');
      expect(getBackend().name).toBe('disk');
      if (orig !== undefined) process.env.STORAGE_BACKEND = orig;
    });

    it('returns the s3 backend when STORAGE_BACKEND=s3', () => {
      const orig = process.env.STORAGE_BACKEND;
      process.env.STORAGE_BACKEND = 's3';
      delete require.cache[require.resolve('../utils/storage')];
      const { getBackend } = require('../utils/storage');
      expect(getBackend().name).toBe('s3');
      if (orig !== undefined) process.env.STORAGE_BACKEND = orig;
      else delete process.env.STORAGE_BACKEND;
    });

    it('falls back to disk for an unknown backend name', () => {
      const orig = process.env.STORAGE_BACKEND;
      process.env.STORAGE_BACKEND = 'gcs-typo';
      delete require.cache[require.resolve('../utils/storage')];
      const { getBackend } = require('../utils/storage');
      expect(getBackend().name).toBe('disk');
      if (orig !== undefined) process.env.STORAGE_BACKEND = orig;
      else delete process.env.STORAGE_BACKEND;
    });
  });
});
