const fs = require('fs');
const path = require('path');

const getDir = () => {
  const dir = process.env.VERCEL
    ? '/tmp'
    : path.join(__dirname, '..', '..', 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

const put = async (key, buffer) => {
  const filepath = path.join(getDir(), key);
  await fs.promises.writeFile(filepath, buffer);
  return { key };
};

const getBuffer = async (key) => {
  const filepath = path.join(getDir(), key);
  return fs.promises.readFile(filepath);
};

const del = async (key) => {
  const filepath = path.join(getDir(), key);
  try { await fs.promises.unlink(filepath); } catch {
    // File may already be gone (e.g. Vercel /tmp between invocations). Fine.
  }
};

module.exports = { put, getBuffer, delete: del, name: 'disk' };
