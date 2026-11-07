import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // A lockfile in the home directory would otherwise be treated as the app root.
  outputFileTracingRoot: path.resolve(process.cwd()),
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
