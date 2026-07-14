const disk = require('./disk');
const s3 = require('./s3');

const backends = { disk, s3 };

/**
 * Resolve the active storage backend from STORAGE_BACKEND env.
 * Defaults to "disk" for local dev backwards compatibility.
 * "s3" also serves S3-compatible providers (Cloudflare R2, Backblaze B2,
 * MinIO) — set S3_ENDPOINT accordingly.
 */
const getBackend = () => {
  const name = (process.env.STORAGE_BACKEND || 'disk').toLowerCase();
  const backend = backends[name];
  if (!backend) {
    console.warn(`[storage] unknown backend "${name}", falling back to disk`);
    return backends.disk;
  }
  return backend;
};

module.exports = { getBackend };
