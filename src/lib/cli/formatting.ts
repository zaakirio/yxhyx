/**
 * CLI Formatting Utilities
 *
 * ANSI colors, progress bars, tables, and spinners for CLI output.
 */

// ============================================
// ANSI Color Codes
// ============================================

export const colors = {
	reset: '\x1b[0m',
	bold: '\x1b[1m',
	dim: '\x1b[2m',
	italic: '\x1b[3m',
	underline: '\x1b[4m',

	// Foreground colors
	black: '\x1b[30m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',

	// Bright foreground colors
	brightBlack: '\x1b[90m',
	brightRed: '\x1b[91m',
	brightGreen: '\x1b[92m',
	brightYellow: '\x1b[93m',
	brightBlue: '\x1b[94m',
	brightMagenta: '\x1b[95m',
	brightCyan: '\x1b[96m',
	brightWhite: '\x1b[97m',

	// Background colors
	bgBlack: '\x1b[40m',
	bgRed: '\x1b[41m',
	bgGreen: '\x1b[42m',
	bgYellow: '\x1b[43m',
	bgBlue: '\x1b[44m',
	bgMagenta: '\x1b[45m',
	bgCyan: '\x1b[46m',
	bgWhite: '\x1b[47m',
} as const;

// ============================================
// Color Helper Functions
// ============================================

export function colorize(text: string, color: keyof typeof colors): string {
	return `${colors[color]}${text}${colors.reset}`;
}

export function bold(text: string): string {
	return `${colors.bold}${text}${colors.reset}`;
}

export function dim(text: string): string {
	return `${colors.dim}${text}${colors.reset}`;
}

export function success(text: string): string {
	return `${colors.green}${text}${colors.reset}`;
}

export function error(text: string): string {
	return `${colors.red}${text}${colors.reset}`;
}

export function warning(text: string): string {
	return `${colors.yellow}${text}${colors.reset}`;
}

export function info(text: string): string {
	return `${colors.cyan}${text}${colors.reset}`;
}

export function highlight(text: string): string {
	return `${colors.magenta}${text}${colors.reset}`;
}

// ============================================
// Progress Bar
// ============================================

export function progressBar(progress: number, width = 20): string {
	const clampedProgress = Math.max(0, Math.min(1, progress));
	const filled = Math.round(clampedProgress * width);
	const empty = width - filled;
	const bar = `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
	const percent = Math.round(clampedProgress * 100);

	// Color based on progress
	const color =
		clampedProgress >= 0.7 ? colors.green : clampedProgress >= 0.3 ? colors.yellow : colors.red;

	return `${color}${bar}${colors.reset} ${percent}%`;
}

export function progressBarSimple(progress: number, width = 10): string {
	const clampedProgress = Math.max(0, Math.min(1, progress));
	const filled = Math.round(clampedProgress * width);
	const empty = width - filled;
	return `[${'#'.repeat(filled)}${'-'.repeat(empty)}]`;
}

// ============================================
// Table Formatting
// ============================================

export function table(
	headers: string[],
	rows: string[][],
	options: { padding?: number; headerColor?: keyof typeof colors } = {}
): string {
	const padding = options.padding ?? 2;
	const headerColor = options.headerColor ?? 'cyan';

	// Calculate column widths
	const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] || '').length)));

	// Build header
	const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join(' '.repeat(padding));

	const separator = widths.map((w) => '─'.repeat(w)).join('─'.repeat(padding));

	// Build rows
	const bodyRows = rows.map((row) =>
		row.map((cell, i) => (cell || '').padEnd(widths[i])).join(' '.repeat(padding))
	);

	return [colorize(headerRow, headerColor), separator, ...bodyRows].join('\n');
}

// ============================================
// Box Drawing
// ============================================

export function box(content: string, title?: string): string {
	const lines = content.split('\n');
	const maxWidth = Math.max(...lines.map((l) => l.length), title?.length || 0);
	const width = maxWidth + 4;

	const top = title
		? `┌─ ${title} ${'─'.repeat(width - title.length - 4)}┐`
		: `┌${'─'.repeat(width - 2)}┐`;
	const bottom = `└${'─'.repeat(width - 2)}┘`;
	const paddedLines = lines.map((l) => `│ ${l.padEnd(maxWidth)} │`);

	return [top, ...paddedLines, bottom].join('\n');
}

// ============================================
// Spinner
// ============================================

export class Spinner {
	private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
	private current = 0;
	private interval: ReturnType<typeof setInterval> | null = null;
	private message: string;

	constructor(message: string) {
		this.message = message;
	}

	start(): void {
		process.stdout.write('\x1B[?25l'); // Hide cursor
		this.interval = setInterval(() => {
			const frame = this.frames[this.current];
			process.stdout.write(`\r${colors.cyan}${frame}${colors.reset} ${this.message}`);
			this.current = (this.current + 1) % this.frames.length;
		}, 80);
	}

	stop(finalMessage?: string): void {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		process.stdout.write('\r\x1B[K'); // Clear line
		process.stdout.write('\x1B[?25h'); // Show cursor
		if (finalMessage) {
			console.log(finalMessage);
		}
	}

	succeed(message?: string): void {
		this.stop(`${colors.green}✓${colors.reset} ${message || this.message}`);
	}

	fail(message?: string): void {
		this.stop(`${colors.red}✗${colors.reset} ${message || this.message}`);
	}

	update(message: string): void {
		this.message = message;
	}
}

// ============================================
// Status Icons
// ============================================

export const icons = {
	success: '✓',
	error: '✗',
	warning: '⚠',
	info: 'ℹ',
	star: '★',
	bullet: '•',
	arrow: '→',
	check: '✔',
	cross: '✖',
	circle: '○',
	circleFilled: '●',
	square: '□',
	squareFilled: '■',
} as const;

// ============================================
// Formatting Helpers
// ============================================

export function formatCost(cost: number): string {
	return `$${cost.toFixed(4)}`;
}

export function formatDuration(seconds: number): string {
	if (seconds < 1) {
		return `${Math.round(seconds * 1000)}ms`;
	}
	if (seconds < 60) {
		return `${seconds.toFixed(1)}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}m ${Math.round(remainingSeconds)}s`;
}

export function formatDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

export function formatTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
	});
}

export function formatDateTime(date: Date | string): string {
	return `${formatDate(date)} ${formatTime(date)}`;
}

export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 3)}...`;
}

// ============================================
// Additional Formatters for Skills
// ============================================

/**
 * Format a styled box with title and subtitle
 */
export function formatBox(title: string, subtitle?: string): string {
	const line = '═'.repeat(Math.max(title.length + 4, 40));
	let result = `${colors.cyan}${line}${colors.reset}\n`;
	result += `${colors.bold}${colors.cyan}  ${title}${colors.reset}\n`;
	if (subtitle) {
		result += `${colors.dim}  ${subtitle}${colors.reset}\n`;
	}
	result += `${colors.cyan}${line}${colors.reset}`;
	return result;
}

/**
 * Format a table with headers and rows
 */
export function formatTable(headers: string[], rows: string[][]): string {
	return table(headers, rows);
}

/**
 * Format a success message
 */
export function formatSuccess(message: string): string {
	return `${colors.green}✓${colors.reset} ${message}`;
}

/**
 * Format an error message
 */
export function formatError(message: string): string {
	return `${colors.red}✗${colors.reset} ${message}`;
}

/**
 * Format a warning message
 */
export function formatWarning(message: string): string {
	return `${colors.yellow}⚠${colors.reset} ${message}`;
}
