import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler (experimental)
  reactCompiler: true,
  
  // External packages for server components (updated from experimental)
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Output settings for Vercel
  output: 'standalone',
  
  // Disable powered by header
  poweredByHeader: false,
  
  // Compression
  compress: true,
};

export default nextConfig;
