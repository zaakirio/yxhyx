/** @type {import('next').NextConfig} */
const nextConfig = {
	// Allow reading from home directory
	experimental: {
		serverComponentsExternalPackages: ['yaml'],
	},
};

module.exports = nextConfig;
