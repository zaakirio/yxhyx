import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatCard } from '@/components/ui/StatCard';
import {
	getCheckinStats,
	getCostData,
	getGoalStats,
	getRatingStats,
	isInitialized,
	loadIdentity,
} from '@/lib/data';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import {
	Calendar,
	CheckCircle,
	Clock,
	DollarSign,
	Sparkles,
	Star,
	Target,
	TrendingUp,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
	const initialized = await isInitialized();

	if (!initialized) {
		return (
			<div className="min-h-[80vh] flex items-center justify-center">
				<EmptyState
					icon={Sparkles}
					title="Welcome to Yxhyx Dashboard"
					description="Yxhyx hasn't been initialized yet. Run 'yxhyx init' in your terminal to get started."
					action={{
						label: 'View Documentation',
						href: 'https://github.com/yourusername/yxhyx',
					}}
				/>
			</div>
		);
	}

	const [identity, checkinStats, ratingStats, costData, goalStats] = await Promise.all([
		loadIdentity(),
		getCheckinStats(),
		getRatingStats(7),
		getCostData(),
		getGoalStats(),
	]);

	const activeGoals = identity
		? [...identity.goals.short_term, ...identity.goals.medium_term, ...identity.goals.long_term]
				.filter((g) => g.progress < 1)
				.slice(0, 5)
		: [];

	const activeProjects = identity?.projects.filter((p) => p.status === 'active').slice(0, 3) || [];

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-foreground">
					Welcome back, {identity?.about.name || 'User'}
				</h1>
				<p className="text-foreground-muted mt-2">Here's your personal dashboard overview</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					title="Active Goals"
					value={goalStats.total - goalStats.completed}
					subtitle={`${goalStats.completed} completed`}
					icon={Target}
					variant="blue"
				/>
				<StatCard
					title="Check-in Streak"
					value={`${checkinStats.morningStreak}d`}
					subtitle="Morning streak"
					icon={Calendar}
					variant="purple"
				/>
				<StatCard
					title="Avg Rating"
					value={ratingStats.average > 0 ? ratingStats.average.toFixed(1) : '-'}
					subtitle={`${ratingStats.total} ratings this week`}
					icon={Star}
					variant="green"
				/>
				<StatCard
					title="Monthly Cost"
					value={formatCurrency(costData.monthlyTotal)}
					subtitle={`Projected: ${formatCurrency(costData.projected)}`}
					icon={DollarSign}
					variant="orange"
				/>
			</div>

			{/* Main Content Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Goals Progress */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Active Goals</CardTitle>
						<a href="/goals" className="text-sm text-primary hover:underline">
							View all
						</a>
					</CardHeader>
					<CardContent>
						{activeGoals.length > 0 ? (
							<div className="space-y-4">
								{activeGoals.map((goal) => (
									<div key={goal.id} className="p-4 rounded-xl bg-background-light/50">
										<div className="flex items-start justify-between mb-3">
											<div>
												<h4 className="font-medium text-foreground">{goal.title}</h4>
												{goal.description && (
													<p className="text-sm text-foreground-muted mt-1 line-clamp-1">
														{goal.description}
													</p>
												)}
											</div>
											{goal.deadline && (
												<Badge variant="info" size="sm">
													{new Date(goal.deadline).toLocaleDateString('en-US', {
														month: 'short',
														day: 'numeric',
													})}
												</Badge>
											)}
										</div>
										<ProgressBar progress={goal.progress} showLabel size="sm" />
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8">
								<p className="text-foreground-muted">No active goals yet</p>
								<p className="text-sm text-foreground-dimmed mt-1">
									Add goals using 'yxhyx identity add-goal'
								</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Recent Activity */}
				<Card>
					<CardHeader>
						<CardTitle>Recent Check-ins</CardTitle>
					</CardHeader>
					<CardContent>
						{checkinStats.lastWeekCheckins.length > 0 ? (
							<div className="space-y-3">
								{checkinStats.lastWeekCheckins
									.slice(-5)
									.reverse()
									.map((checkin, idx) => (
										<div
											key={idx}
											className="flex items-center gap-3 p-3 rounded-xl bg-background-light/50"
										>
											<div
												className={`w-2 h-2 rounded-full ${
													checkin.type === 'morning'
														? 'bg-accent-yellow'
														: checkin.type === 'evening'
															? 'bg-primary'
															: 'bg-accent-cyan'
												}`}
											/>
											<div className="flex-1">
												<p className="text-sm font-medium text-foreground capitalize">
													{checkin.type} Check-in
												</p>
												<p className="text-xs text-foreground-muted">
													{formatRelativeTime(checkin.timestamp)}
												</p>
											</div>
											{checkin.quick && (
												<Badge variant="default" size="sm">
													Quick
												</Badge>
											)}
										</div>
									))}
							</div>
						) : (
							<div className="text-center py-8">
								<p className="text-foreground-muted">No check-ins yet</p>
								<p className="text-sm text-foreground-dimmed mt-1">
									Start with 'yxhyx checkin morning'
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Projects & Quick Stats */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Active Projects */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Active Projects</CardTitle>
						<a href="/identity" className="text-sm text-primary hover:underline">
							Manage
						</a>
					</CardHeader>
					<CardContent>
						{activeProjects.length > 0 ? (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{activeProjects.map((project) => (
									<div
										key={project.id}
										className="p-4 rounded-xl bg-background-light/50 border border-border/50"
									>
										<div className="flex items-start justify-between mb-2">
											<h4 className="font-medium text-foreground">{project.name}</h4>
											<Badge
												variant={project.status === 'active' ? 'success' : 'warning'}
												size="sm"
											>
												{project.status}
											</Badge>
										</div>
										<p className="text-sm text-foreground-muted line-clamp-2">
											{project.description}
										</p>
										{project.next_actions.length > 0 && (
											<div className="mt-3 pt-3 border-t border-border/50">
												<p className="text-xs text-foreground-dimmed mb-1">Next action:</p>
												<p className="text-sm text-foreground">{project.next_actions[0]}</p>
											</div>
										)}
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-8">
								<p className="text-foreground-muted">No active projects</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Quick Stats */}
				<Card>
					<CardHeader>
						<CardTitle>This Week</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between p-3 rounded-xl bg-background-light/50">
							<div className="flex items-center gap-3">
								<CheckCircle className="w-5 h-5 text-accent-green" />
								<span className="text-sm text-foreground">Check-ins</span>
							</div>
							<span className="text-lg font-semibold text-foreground">
								{checkinStats.lastWeekCheckins.length}
							</span>
						</div>
						<div className="flex items-center justify-between p-3 rounded-xl bg-background-light/50">
							<div className="flex items-center gap-3">
								<Star className="w-5 h-5 text-accent-yellow" />
								<span className="text-sm text-foreground">Ratings</span>
							</div>
							<span className="text-lg font-semibold text-foreground">{ratingStats.total}</span>
						</div>
						<div className="flex items-center justify-between p-3 rounded-xl bg-background-light/50">
							<div className="flex items-center gap-3">
								<TrendingUp className="w-5 h-5 text-accent-cyan" />
								<span className="text-sm text-foreground">Goals Progress</span>
							</div>
							<span className="text-lg font-semibold text-foreground">
								{Math.round(goalStats.byTerm.short.avgProgress * 100)}%
							</span>
						</div>
						<div className="flex items-center justify-between p-3 rounded-xl bg-background-light/50">
							<div className="flex items-center gap-3">
								<Clock className="w-5 h-5 text-accent-orange" />
								<span className="text-sm text-foreground">Last Updated</span>
							</div>
							<span className="text-sm text-foreground-muted">
								{identity?.last_updated ? formatRelativeTime(identity.last_updated) : '-'}
							</span>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
