const REQUIRED_IN_PROD = ['JWT_SECRET', 'ADMIN_SIGNUP_CODE', 'MONGODB_URI'];

const DEV_FALLBACKS = {
  JWT_SECRET: 'dev_jwt_secret_change_me',
  ADMIN_SIGNUP_CODE: 'placement_admin_2026',
};

/**
 * Verify required env vars are set. In production, missing vars crash the
 * process. In non-production, missing vars log a loud warning — the app
 * still starts because the codebase falls back to development defaults,
 * but those defaults MUST NOT be reachable in prod.
 *
 * Called at startup from server.js and api/index.js after dotenv.config().
 */
const validateEnv = () => {
  const isProd = process.env.NODE_ENV === 'production';
  const missing = REQUIRED_IN_PROD.filter((k) => !process.env[k]);

  // Also treat the well-known dev fallback values as "unset" — otherwise a
  // deploy that copies .env.example verbatim would pass validation.
  const usingKnownDefault = Object.entries(DEV_FALLBACKS).filter(
    ([k, v]) => process.env[k] === v
  );

  if (isProd && (missing.length > 0 || usingKnownDefault.length > 0)) {
    const problems = [
      ...missing.map((k) => `${k} is not set`),
      ...usingKnownDefault.map(([k]) => `${k} is set to the well-known dev default`),
    ];
    const msg = `Refusing to start in production with insecure env:\n  - ${problems.join('\n  - ')}`;
    throw new Error(msg);
  }

  if (missing.length > 0) {
    console.warn(
      `[env] WARNING: ${missing.join(', ')} not set — using dev fallbacks. Set these before deploying.`
    );
  }
  if (usingKnownDefault.length > 0 && !isProd) {
    console.warn(
      `[env] WARNING: using the well-known dev default for ${usingKnownDefault
        .map(([k]) => k)
        .join(', ')}. Rotate before deploying.`
    );
  }
};

module.exports = { validateEnv };
