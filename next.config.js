/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.102"],
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;