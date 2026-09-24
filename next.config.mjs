// Publicación en Firebase Hosting: sitio estático (`NEXT_OUTPUT=export`, ver `npm run build:hosting`).
// En desarrollo y en la verificación local se sigue usando el servidor de Next.
const isExport = process.env.NEXT_OUTPUT === 'export'

const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  ...(isExport ? { output: 'export', trailingSlash: true } : {}),
  images: { unoptimized: isExport, remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 800,
        aggregateTimeout: 300,
        ignored: ['**/node_modules', '**/.git'],
      }
    }
    return config
  },
}

export default nextConfig
