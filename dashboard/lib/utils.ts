import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Format a date as relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
	const now = new Date();
	const then = typeof date === 'string' ? new Date(date) : date;
	const diffMs = now.getTime() - then.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays > 7) {
		return then.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
	} else if (diffDays > 0) {
		return `${diffDays}d ago`;
	} else if (diffHours > 0) {
		return `${diffHours}h ago`;
	} else if (diffMins > 0) {
		return `${diffMins}m ago`;
	} else {
		return 'just now';
	}
}

/**
 * Format a date as a readable string
 */
export function formatDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

/**
 * Format a time as a readable string
 */
export function formatTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleTimeString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
	});
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 4,
		maximumFractionDigits: 4,
	}).format(amount);
}

/**
 * Format a number as a percentage
 */
export function formatPercentage(value: number): string {
	return `${Math.round(value * 100)}%`;
}

/**
 * Get a color for a rating value
 */
export function getRatingColor(rating: number): string {
	if (rating >= 8) return 'text-accent-green';
	if (rating >= 6) return 'text-accent-yellow';
	if (rating >= 4) return 'text-accent-orange';
	return 'text-accent-red';
}

/**
 * Get a background color for a rating value
 */
export function getRatingBgColor(rating: number): string {
	if (rating >= 8) return 'bg-accent-green/20';
	if (rating >= 6) return 'bg-accent-yellow/20';
	if (rating >= 4) return 'bg-accent-orange/20';
	return 'bg-accent-red/20';
}

/**
 * Get a color for progress value
 */
export function getProgressColor(progress: number): string {
	if (progress >= 0.75) return 'bg-accent-green';
	if (progress >= 0.5) return 'bg-accent-cyan';
	if (progress >= 0.25) return 'bg-accent-yellow';
	return 'bg-accent-orange';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Group array items by a key
 */
export function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
	return array.reduce(
		(acc, item) => {
			const key = keyFn(item);
			if (!acc[key]) acc[key] = [];
			acc[key].push(item);
			return acc;
		},
		{} as Record<string, T[]>
	);
}

/**
 * Calculate streak from a list of dates
 */
export function calculateStreak(dates: string[]): number {
	if (dates.length === 0) return 0;

	const sortedDates = [...dates].sort().reverse();
	const today = new Date().toISOString().split('T')[0];
	let streak = 0;

	for (let i = 0; i < 30; i++) {
		const checkDate = new Date();
		checkDate.setDate(checkDate.getDate() - i);
		const dateStr = checkDate.toISOString().split('T')[0];

		if (sortedDates.includes(dateStr)) {
			streak++;
		} else if (i > 0) {
			break;
		}
	}

	return streak;
}
