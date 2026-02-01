import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
	icon: LucideIcon;
	title: string;
	description: string;
	action?: {
		label: string;
		href?: string;
		onClick?: () => void;
	};
	className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
	return (
		<div
			className={cn('flex flex-col items-center justify-center py-16 px-8 text-center', className)}
		>
			<div className="w-16 h-16 rounded-2xl bg-background-lighter flex items-center justify-center mb-6">
				<Icon className="w-8 h-8 text-foreground-muted" />
			</div>
			<h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
			<p className="text-sm text-foreground-muted max-w-md mb-6">{description}</p>
			{action &&
				(action.href ? (
					<a
						href={action.href}
						className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
					>
						{action.label}
					</a>
				) : (
					<button
						onClick={action.onClick}
						className="px-6 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
					>
						{action.label}
					</button>
				))}
		</div>
	);
}
