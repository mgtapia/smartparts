const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = { poll: 800, aggregateTimeout: 300, ignored: ['**/node_modules', '**/.git'] }
    }
    return config
  },
}

export default nextConfig
