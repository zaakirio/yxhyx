import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Global test configuration
		globals: true,

		// Test file patterns
		include: ['tests/**/*.test.ts'],
		exclude: ['node_modules', 'dist'],

		// Environment for tests
		environment: 'node',

		// Coverage configuration
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html', 'lcov'],
			include: ['src/lib/**/*.ts'],
			exclude: ['src/lib/**/*.test.ts', 'src/bin/**', 'src/commands/**'],
			thresholds: {
				statements: 60,
				branches: 50,
				functions: 60,
				lines: 60,
			},
		},

		// Test timeout
		testTimeout: 10000,

		// Setup files
		setupFiles: ['./tests/setup.ts'],

		// Reporter
		reporters: ['verbose'],
	},

	// Resolve aliases if needed
	resolve: {
		alias: {
			'@': '/src',
		},
	},
});
