'use client';

import { cn } from '@/lib/utils';
import { Brain, Calendar, DollarSign, Home, Settings, Sparkles, Target, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
	{ name: 'Overview', href: '/', icon: Home },
	{ name: 'Identity', href: '/identity', icon: User },
	{ name: 'Goals', href: '/goals', icon: Target },
	{ name: 'Check-ins', href: '/checkins', icon: Calendar },
	{ name: 'Learnings', href: '/learnings', icon: Brain },
	{ name: 'Costs', href: '/costs', icon: DollarSign },
];

export function Sidebar() {
	const pathname = usePathname();

	return (
		<aside className="fixed inset-y-0 left-0 w-64 glass-panel-elevated border-r border-border">
			<div className="flex flex-col h-full">
				{/* Logo */}
				<div className="flex items-center gap-3 px-6 py-6 border-b border-border">
					<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
						<Sparkles className="w-6 h-6 text-white" />
					</div>
					<div>
						<h1 className="text-lg font-bold text-foreground">Yxhyx</h1>
						<p className="text-xs text-foreground-muted">Dashboard</p>
					</div>
				</div>

				{/* Navigation */}
				<nav className="flex-1 px-4 py-6 space-y-1">
					{navigation.map((item) => {
						const isActive = pathname === item.href;
						return (
							<Link
								key={item.name}
								href={item.href}
								className={cn(
									'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
									isActive
										? 'bg-primary/20 text-primary border border-primary/30'
										: 'text-foreground-muted hover:bg-background-lighter hover:text-foreground'
								)}
							>
								<item.icon
									className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-foreground-muted')}
								/>
								{item.name}
							</Link>
						);
					})}
				</nav>

				{/* Footer */}
				<div className="px-4 py-4 border-t border-border">
					<Link
						href="/settings"
						className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-foreground-muted hover:bg-background-lighter hover:text-foreground transition-all duration-200"
					>
						<Settings className="w-5 h-5" />
						Settings
					</Link>
					<div className="mt-4 px-4">
						<p className="text-xs text-foreground-dimmed">v0.1.0</p>
					</div>
				</div>
			</div>
		</aside>
	);
}
