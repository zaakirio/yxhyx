import { cn, formatPercentage, getProgressColor } from '@/lib/utils';

interface ProgressBarProps {
	progress: number;
	showLabel?: boolean;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
	animated?: boolean;
}

const sizeStyles = {
	sm: 'h-1.5',
	md: 'h-2.5',
	lg: 'h-4',
};

export function ProgressBar({
	progress,
	showLabel = false,
	size = 'md',
	className,
	animated = true,
}: ProgressBarProps) {
	const clampedProgress = Math.max(0, Math.min(1, progress));

	return (
		<div className={cn('flex items-center gap-3', className)}>
			<div
				className={cn(
					'flex-1 bg-background-lighter rounded-full overflow-hidden',
					sizeStyles[size]
				)}
			>
				<div
					className={cn(
						'h-full rounded-full transition-all duration-500',
						getProgressColor(clampedProgress),
						animated && 'progress-animated'
					)}
					style={{ width: `${clampedProgress * 100}%` }}
				/>
			</div>
			{showLabel && (
				<span className="text-sm font-medium text-foreground-muted min-w-[3rem] text-right">
					{formatPercentage(clampedProgress)}
				</span>
			)}
		</div>
	);
}
