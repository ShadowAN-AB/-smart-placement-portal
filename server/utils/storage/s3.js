const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

let cachedClient = null;

const getClient = () => {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: process.env.S3_REGION || 'auto',
    // Set S3_ENDPOINT for Cloudflare R2, Backblaze B2, MinIO, etc.
    // Omit for real AWS S3 (SDK builds the endpoint from region).
    endpoint: process.env.S3_ENDPOINT || undefined,
    credentials: process.env.S3_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        }
      : undefined, // Fall back to AWS default credential chain if unset.
    forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE).toLowerCase() === 'true',
  });
  return cachedClient;
};

const bucket = () => {
  const b = process.env.S3_BUCKET;
  if (!b) throw new Error('S3_BUCKET is not set');
  return b;
};

const put = async (key, buffer, contentType) => {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return { key };
};

const getBuffer = async (key) => {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key })
  );
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
};

const del = async (key) => {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (error) {
    console.error('[storage:s3] delete failed:', error.message);
  }
};

module.exports = { put, getBuffer, delete: del, name: 's3' };
