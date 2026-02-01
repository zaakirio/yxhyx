import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface BadgeProps {
	children: ReactNode;
	variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'purple';
	size?: 'sm' | 'md';
	className?: string;
}

const variantStyles = {
	default: 'bg-background-lighter text-foreground-muted border-border',
	success: 'bg-accent-green/20 text-accent-green border-accent-green/30',
	warning: 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30',
	error: 'bg-accent-red/20 text-accent-red border-accent-red/30',
	info: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
	purple: 'bg-accent-purple/20 text-accent-purple border-accent-purple/30',
};

const sizeStyles = {
	sm: 'text-xs px-2 py-0.5',
	md: 'text-sm px-3 py-1',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
	return (
		<span
			className={cn(
				'inline-flex items-center font-medium rounded-full border',
				variantStyles[variant],
				sizeStyles[size],
				className
			)}
		>
			{children}
		</span>
	);
}
