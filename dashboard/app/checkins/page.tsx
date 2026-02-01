import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { getCheckinHistory, getCheckinStats, isInitialized } from '@/lib/data';
import { formatDate, formatRelativeTime, formatTime, groupBy } from '@/lib/utils';
import {
	Calendar,
	CalendarDays,
	CheckCircle,
	Clock,
	Flame,
	Moon,
	Sparkles,
	Sun,
} from 'lucide-react';
import { CheckinChart } from './CheckinChart';

export const dynamic = 'force-dynamic';

export default async function CheckinsPage() {
	const initialized = await isInitialized();

	if (!initialized) {
		return (
			<div className="min-h-[80vh] flex items-center justify-center">
				<EmptyState
					icon={Sparkles}
					title="Check-ins Not Available"
					description="Yxhyx hasn't been initialized yet. Run 'yxhyx init' in your terminal to get started."
				/>
			</div>
		);
	}

	const [stats, history] = await Promise.all([getCheckinStats(), getCheckinHistory(100)]);

	// Group by date for calendar view
	const checkinsByDate = groupBy(history, (c) => c.timestamp.split('T')[0]);

	// Get last 14 days for heatmap
	const last14Days: Array<{ date: string; count: number; types: string[] }> = [];
	for (let i = 13; i >= 0; i--) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		const dateStr = date.toISOString().split('T')[0];
		const dayCheckins = checkinsByDate[dateStr] || [];
		last14Days.push({
			date: dateStr,
			count: dayCheckins.length,
			types: dayCheckins.map((c) => c.type),
		});
	}

	// Prepare chart data
	const chartData = last14Days.map((day) => ({
		date: new Date(day.date).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
		}),
		morning: day.types.filter((t) => t === 'morning').length,
		evening: day.types.filter((t) => t === 'evening').length,
		weekly: day.types.filter((t) => t === 'weekly').length,
	}));

	const hasCheckins = history.length > 0;

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-foreground">Check-ins</h1>
				<p className="text-foreground-muted mt-2">Track your daily accountability check-ins</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					title="Total Check-ins"
					value={stats.totalCheckins}
					subtitle="All time"
					icon={Calendar}
					variant="blue"
				/>
				<StatCard
					title="Morning Streak"
					value={`${stats.morningStreak}d`}
					subtitle="Current streak"
					icon={Sun}
					variant="orange"
				/>
				<StatCard
					title="Evening Streak"
					value={`${stats.eveningStreak}d`}
					subtitle="Current streak"
					icon={Moon}
					variant="purple"
				/>
				<StatCard
					title="Weekly Reviews"
					value={stats.weeklyCount}
					subtitle="Completed"
					icon={CalendarDays}
					variant="cyan"
				/>
			</div>

			{/* Check-in Heatmap */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Flame className="w-5 h-5 text-accent-orange" />
						Last 14 Days
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2 justify-between">
						{last14Days.map((day, idx) => {
							const dayOfWeek = new Date(day.date).toLocaleDateString('en-US', {
								weekday: 'short',
							});
							const dayNum = new Date(day.date).getDate();
							const intensity =
								day.count === 0
									? 'bg-background-lighter'
									: day.count === 1
										? 'bg-accent-green/30'
										: day.count === 2
											? 'bg-accent-green/60'
											: 'bg-accent-green';
							return (
								<div key={idx} className="flex flex-col items-center gap-2">
									<span className="text-xs text-foreground-muted">{dayOfWeek}</span>
									<div
										className={`w-10 h-10 rounded-lg flex items-center justify-center ${intensity}`}
										title={`${day.date}: ${day.count} check-in(s)`}
									>
										<span className="text-xs font-medium text-foreground">{dayNum}</span>
									</div>
									<div className="flex gap-0.5">
										{day.types.includes('morning') && (
											<Sun className="w-3 h-3 text-accent-yellow" />
										)}
										{day.types.includes('evening') && <Moon className="w-3 h-3 text-primary" />}
										{day.types.includes('weekly') && (
											<CalendarDays className="w-3 h-3 text-accent-cyan" />
										)}
									</div>
								</div>
							);
						})}
					</div>
					<div className="flex items-center justify-end gap-4 mt-4 text-xs text-foreground-muted">
						<div className="flex items-center gap-2">
							<Sun className="w-3 h-3 text-accent-yellow" /> Morning
						</div>
						<div className="flex items-center gap-2">
							<Moon className="w-3 h-3 text-primary" /> Evening
						</div>
						<div className="flex items-center gap-2">
							<CalendarDays className="w-3 h-3 text-accent-cyan" /> Weekly
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Chart */}
			{hasCheckins && (
				<Card>
					<CardHeader>
						<CardTitle>Check-in History</CardTitle>
					</CardHeader>
					<CardContent>
						<CheckinChart data={chartData} />
					</CardContent>
				</Card>
			)}

			{/* Recent Check-ins */}
			<Card>
				<CardHeader>
					<CardTitle>Recent Check-ins</CardTitle>
					<Badge variant="default">{history.length} total</Badge>
				</CardHeader>
				<CardContent>
					{hasCheckins ? (
						<div className="space-y-3 max-h-[500px] overflow-y-auto">
							{history
								.slice()
								.reverse()
								.slice(0, 20)
								.map((checkin, idx) => (
									<div
										key={idx}
										className="flex items-start gap-4 p-4 rounded-xl bg-background-light/50 border border-border/50"
									>
										<div
											className={`w-10 h-10 rounded-xl flex items-center justify-center ${
												checkin.type === 'morning'
													? 'bg-accent-yellow/20 text-accent-yellow'
													: checkin.type === 'evening'
														? 'bg-primary/20 text-primary'
														: 'bg-accent-cyan/20 text-accent-cyan'
											}`}
										>
											{checkin.type === 'morning' ? (
												<Sun className="w-5 h-5" />
											) : checkin.type === 'evening' ? (
												<Moon className="w-5 h-5" />
											) : (
												<CalendarDays className="w-5 h-5" />
											)}
										</div>
										<div className="flex-1">
											<div className="flex items-center gap-2 mb-1">
												<h4 className="font-medium text-foreground capitalize">
													{checkin.type} Check-in
												</h4>
												{checkin.quick && (
													<Badge variant="default" size="sm">
														Quick
													</Badge>
												)}
											</div>
											<p className="text-sm text-foreground-muted">
												{formatDate(checkin.timestamp)} at {formatTime(checkin.timestamp)}
											</p>

											{/* Show priorities/accomplishments if available */}
											{checkin.priorities && checkin.priorities.length > 0 && (
												<div className="mt-3">
													<p className="text-xs text-foreground-dimmed mb-1">Priorities:</p>
													<ul className="text-sm text-foreground space-y-1">
														{checkin.priorities.slice(0, 3).map((p, pIdx) => (
															<li key={pIdx} className="flex items-start gap-2">
																<CheckCircle className="w-4 h-4 text-accent-green mt-0.5 shrink-0" />
																{p}
															</li>
														))}
													</ul>
												</div>
											)}
											{checkin.accomplishments && checkin.accomplishments.length > 0 && (
												<div className="mt-3">
													<p className="text-xs text-foreground-dimmed mb-1">Accomplishments:</p>
													<ul className="text-sm text-foreground space-y-1">
														{checkin.accomplishments.slice(0, 3).map((a, aIdx) => (
															<li key={aIdx} className="flex items-start gap-2">
																<CheckCircle className="w-4 h-4 text-accent-green mt-0.5 shrink-0" />
																{a}
															</li>
														))}
													</ul>
												</div>
											)}
											{checkin.learnings && checkin.learnings.length > 0 && (
												<div className="mt-3">
													<p className="text-xs text-foreground-dimmed mb-1">Learnings:</p>
													<ul className="text-sm text-foreground space-y-1">
														{checkin.learnings.slice(0, 3).map((l, lIdx) => (
															<li key={lIdx} className="flex items-start gap-2">
																<Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
																{l}
															</li>
														))}
													</ul>
												</div>
											)}
										</div>
										<span className="text-xs text-foreground-dimmed">
											{formatRelativeTime(checkin.timestamp)}
										</span>
									</div>
								))}
						</div>
					) : (
						<EmptyState
							icon={Calendar}
							title="No Check-ins Yet"
							description="Start your accountability journey with 'yxhyx checkin morning'."
						/>
					)}
				</CardContent>
			</Card>

			{/* Help Section */}
			<div className="glass-panel rounded-xl p-4 flex items-center gap-4">
				<div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
					<Clock className="w-5 h-5 text-primary" />
				</div>
				<div className="flex-1">
					<p className="text-sm text-foreground">Check-in commands:</p>
					<div className="flex flex-wrap gap-2 mt-2">
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx checkin morning
						</code>
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx checkin evening
						</code>
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx checkin weekly
						</code>
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx checkin -q
						</code>
					</div>
				</div>
			</div>
		</div>
	);
}
