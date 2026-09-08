/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [ { protocol: 'https', hostname: 'images.unsplash.com' }, { protocol: 'https', hostname: '**.supabase.co' }, { protocol: 'https', hostname: '**.googleusercontent.com' }, { protocol: 'https', hostname: '**.cloudinary.com' } ],
  }
}

export default nextConfig;
