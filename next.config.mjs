/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure server components can handle noble crypto modules without issues
  serverExternalPackages: ["@noble/ed25519", "@noble/hashes", "@mysten-incubation/memwal"],
};

export default nextConfig;
