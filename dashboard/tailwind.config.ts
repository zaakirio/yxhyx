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
				// Uchitil-inspired design system - Dark sophisticated palette
				background: {
					DEFAULT: '#131314',
					light: '#1f1f1f',
					lighter: '#2a2a2a',
					elevated: '#1f1f1f',
					card: '#0d0d0d',
				},
				foreground: {
					DEFAULT: '#f0f0f0',
					secondary: '#b0b0b0',
					muted: '#6a6a6a',
					dimmed: '#4a4a4a',
				},
				primary: {
					DEFAULT: 'rgb(162, 59, 103)',
					hover: '#d56698',
					muted: 'rgba(162, 59, 103, 0.3)',
				},
				accent: {
					primary: 'rgb(162, 59, 103)',
					hover: '#d56698',
					blue: '#4f8cff',
					magenta: '#c74fff',
					cyan: '#4ff4c7',
					green: '#4ff4c7',
					orange: '#ff9e64',
					red: '#f7768e',
					yellow: '#e0af68',
				},
				border: {
					DEFAULT: 'rgba(255, 255, 255, 0.06)',
					light: 'rgba(255, 255, 255, 0.1)',
					focus: 'rgba(162, 59, 103, 0.5)',
				},
				// Gray scale (HSL-based for consistency)
				gray: {
					1: 'hsl(0 0% 8.5%)',
					2: 'hsl(0 0% 11%)',
					3: 'hsl(0 0% 13.6%)',
					4: 'hsl(0 0% 15.8%)',
					5: 'hsl(0 0% 17.9%)',
					6: 'hsl(0 0% 20.5%)',
					7: 'hsl(0 0% 24.3%)',
					8: 'hsl(0 0% 31.2%)',
					9: 'hsl(0 0% 43.9%)',
					10: 'hsl(0 0% 49.4%)',
					11: 'hsl(0 0% 62.8%)',
					12: 'hsl(0 0% 93%)',
				},
			},
			fontFamily: {
				sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
				display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono', 'SF Mono', 'Cascadia Code', 'Consolas', 'monospace'],
			},
			spacing: {
				'space-1': '4px',
				'space-2': '8px',
				'space-3': '12px',
				'space-4': '16px',
				'space-5': '20px',
				'space-6': '24px',
				'space-8': '32px',
				'space-10': '40px',
			},
			borderRadius: {
				sm: '4px',
				md: '8px',
				lg: '12px',
				xl: '16px',
				'2xl': '20px',
			},
			boxShadow: {
				sm: '0 1px 2px rgba(0, 0, 0, 0.1)',
				md: '0 4px 16px rgba(0, 0, 0, 0.2)',
				lg: '0 8px 32px rgba(0, 0, 0, 0.3)',
				glow: '0 0 20px rgba(162, 59, 103, 0.3)',
				'glow-hover': '0 0 30px rgba(162, 59, 103, 0.5)',
			},
			animation: {
				'fade-in': 'fadeIn 0.2s var(--ease-snappy)',
				'slide-up': 'slideUp 0.2s var(--ease-snappy)',
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
			transitionTimingFunction: {
				snappy: 'cubic-bezier(0.2, 0, 0, 1)',
			},
		},
	},
	plugins: [],
};

export default config;
