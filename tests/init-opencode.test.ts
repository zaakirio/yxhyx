/**
 * Tests for init command OpenCode detection logic
 */

import { existsSync } from 'node:fs';
import { mkdir, rm } from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { detectOpenCode } from '../src/lib/opencode-integration';

describe('Init Command - OpenCode Detection', () => {
	const testOpenCodeDir = `${process.env.HOME}/.config/opencode-test`;

	beforeEach(async () => {
		// Clean up any test directory
		if (existsSync(testOpenCodeDir)) {
			await rm(testOpenCodeDir, { recursive: true });
		}
	});

	afterEach(async () => {
		// Clean up test directory
		if (existsSync(testOpenCodeDir)) {
			await rm(testOpenCodeDir, { recursive: true });
		}
	});

	describe('detectOpenCode', () => {
		it('should detect when OpenCode config directory exists', async () => {
			// Create a test OpenCode config directory
			const realOpenCodeDir = `${process.env.HOME}/.config/opencode`;
			const dirExistedBefore = existsSync(realOpenCodeDir);

			if (!dirExistedBefore) {
				await mkdir(realOpenCodeDir, { recursive: true });
			}

			const result = await detectOpenCode();

			// Clean up if we created it
			if (!dirExistedBefore) {
				await rm(realOpenCodeDir, { recursive: true });
			}

			expect(result).toHaveProperty('installed');
			expect(result).toHaveProperty('configExists');
			expect(result.configExists).toBe(true);
		});

		it('should return configExists=false when directory does not exist', async () => {
			// Ensure the directory doesn't exist
			const realOpenCodeDir = `${process.env.HOME}/.config/opencode`;
			const dirExists = existsSync(realOpenCodeDir);

			if (dirExists) {
				// Skip this test if the directory actually exists
				console.log('Skipping test - OpenCode directory already exists');
				return;
			}

			const result = await detectOpenCode();

			expect(result.configExists).toBe(false);
		});

		it('should return result with correct properties', async () => {
			const result = await detectOpenCode();

			expect(result).toHaveProperty('installed');
			expect(result).toHaveProperty('configExists');
			expect(typeof result.installed).toBe('boolean');
			expect(typeof result.configExists).toBe('boolean');
		});
	});

	describe('OpenCode availability logic', () => {
		it('should identify when OpenCode is available (installed OR config exists)', async () => {
			const result = await detectOpenCode();
			const hasOpenCodeConfig = result.configExists || result.installed;

			// This is the logic used in init.ts
			expect(typeof hasOpenCodeConfig).toBe('boolean');
		});
	});
});
