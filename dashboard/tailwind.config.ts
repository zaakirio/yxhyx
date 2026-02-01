import type { Config } from 'tailwindcss';

const config: Config = {
	content: [
		'./pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./components/**/*.{js,ts,jsx,tsx,mdx}',
		'./app/**/*.{js,ts,jsx,tsx,mdx}',
	],
	theme: {
		extend: {
			colors: {
				// Tokyo Night inspired color palette
				background: {
					DEFAULT: '#1a1b26',
					light: '#24283b',
					lighter: '#414868',
				},
				foreground: {
					DEFAULT: '#c0caf5',
					muted: '#565f89',
					dimmed: '#414868',
				},
				primary: {
					DEFAULT: '#7aa2f7',
					hover: '#89b4fa',
					muted: '#3d59a1',
				},
				accent: {
					purple: '#bb9af7',
					cyan: '#7dcfff',
					green: '#9ece6a',
					orange: '#ff9e64',
					red: '#f7768e',
					yellow: '#e0af68',
					pink: '#ff007c',
				},
				border: {
					DEFAULT: '#414868',
					light: '#565f89',
				},
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono', 'Menlo', 'monospace'],
			},
			animation: {
				'fade-in': 'fadeIn 0.3s ease-out',
				'slide-up': 'slideUp 0.3s ease-out',
				'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' },
				},
				slideUp: {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
			},
		},
	},
	plugins: [],
};

export default config;
