import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
	title: string;
	value: string | number;
	subtitle?: string;
	icon: LucideIcon;
	trend?: {
		value: number;
		label: string;
	};
	variant?: 'primary' | 'blue' | 'purple' | 'green' | 'orange' | 'cyan' | 'red' | 'yellow';
}

const variantStyles = {
	primary: {
		gradient: 'stat-gradient-primary',
		icon: 'text-primary bg-primary/20',
		trend: 'text-primary',
	},
	blue: {
		gradient: 'stat-gradient-blue',
		icon: 'text-accent-blue bg-accent-blue/20',
		trend: 'text-accent-blue',
	},
	purple: {
		gradient: 'stat-gradient-primary',
		icon: 'text-primary bg-primary/20',
		trend: 'text-primary',
	},
	green: {
		gradient: 'stat-gradient-green',
		icon: 'text-accent-green bg-accent-green/20',
		trend: 'text-accent-green',
	},
	orange: {
		gradient: 'stat-gradient-orange',
		icon: 'text-accent-orange bg-accent-orange/20',
		trend: 'text-accent-orange',
	},
	cyan: {
		gradient: 'stat-gradient-cyan',
		icon: 'text-accent-cyan bg-accent-cyan/20',
		trend: 'text-accent-cyan',
	},
	red: {
		gradient: 'stat-gradient-red',
		icon: 'text-accent-red bg-accent-red/20',
		trend: 'text-accent-red',
	},
	yellow: {
		gradient: 'stat-gradient-yellow',
		icon: 'text-accent-yellow bg-accent-yellow/20',
		trend: 'text-accent-yellow',
	},
};

export function StatCard({
	title,
	value,
	subtitle,
	icon: Icon,
	trend,
	variant = 'blue',
}: StatCardProps) {
	const styles = variantStyles[variant];

	return (
		<div className={cn('glass-panel rounded-2xl p-6 card-hover', styles.gradient)}>
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm text-foreground-muted font-medium">{title}</p>
					<p className="text-3xl font-bold text-foreground mt-2">{value}</p>
					{subtitle && <p className="text-sm text-foreground-muted mt-1">{subtitle}</p>}
					{trend && (
						<div className={cn('flex items-center gap-1 mt-2', styles.trend)}>
							<span className="text-sm font-medium">
								{trend.value > 0 ? '+' : ''}
								{trend.value}%
							</span>
							<span className="text-xs text-foreground-muted">{trend.label}</span>
						</div>
					)}
				</div>
				<div className={cn('p-3 rounded-xl', styles.icon)}>
					<Icon className="w-6 h-6" />
				</div>
			</div>
		</div>
	);
}
