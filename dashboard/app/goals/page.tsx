import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatCard } from '@/components/ui/StatCard';
import { getGoalStats, isInitialized, loadIdentity } from '@/lib/data';
import type { Goal } from '@/lib/data';
import { formatDate, formatPercentage } from '@/lib/utils';
import { ArrowRight, CheckCircle2, Circle, Clock, Sparkles, Target } from 'lucide-react';

export const dynamic = 'force-dynamic';

function GoalCard({ goal, term }: { goal: Goal; term: string }) {
	const isCompleted = goal.progress >= 1;
	const termColors = {
		short: 'border-l-accent-orange',
		medium: 'border-l-accent-cyan',
		long: 'border-l-accent-purple',
	};

	return (
		<div
			className={`p-5 rounded-xl bg-background-light/50 border border-border/50 border-l-4 ${
				termColors[term as keyof typeof termColors]
			}`}
		>
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-start gap-3">
					{isCompleted ? (
						<CheckCircle2 className="w-5 h-5 text-accent-green mt-0.5" />
					) : (
						<Circle className="w-5 h-5 text-foreground-muted mt-0.5" />
					)}
					<div>
						<h4
							className={`font-medium ${isCompleted ? 'text-foreground-muted line-through' : 'text-foreground'}`}
						>
							{goal.title}
						</h4>
						{goal.description && (
							<p className="text-sm text-foreground-muted mt-1">{goal.description}</p>
						)}
					</div>
				</div>
				{goal.deadline && (
					<Badge variant={isCompleted ? 'success' : 'info'} size="sm">
						<Clock className="w-3 h-3 mr-1" />
						{new Date(goal.deadline).toLocaleDateString('en-US', {
							month: 'short',
							day: 'numeric',
						})}
					</Badge>
				)}
			</div>

			<div className="mt-4">
				<ProgressBar progress={goal.progress} showLabel size="md" />
			</div>

			{goal.related_projects.length > 0 && (
				<div className="mt-4 pt-4 border-t border-border/50">
					<p className="text-xs text-foreground-dimmed mb-2">Related Projects:</p>
					<div className="flex flex-wrap gap-1">
						{goal.related_projects.map((projectId, idx) => (
							<Badge key={idx} variant="default" size="sm">
								{projectId}
							</Badge>
						))}
					</div>
				</div>
			)}

			{goal.created && (
				<p className="text-xs text-foreground-dimmed mt-3">Created: {formatDate(goal.created)}</p>
			)}
		</div>
	);
}

export default async function GoalsPage() {
	const initialized = await isInitialized();

	if (!initialized) {
		return (
			<div className="min-h-[80vh] flex items-center justify-center">
				<EmptyState
					icon={Sparkles}
					title="Goals Not Available"
					description="Yxhyx hasn't been initialized yet. Run 'yxhyx init' in your terminal to get started."
				/>
			</div>
		);
	}

	const [identity, stats] = await Promise.all([loadIdentity(), getGoalStats()]);

	if (!identity) {
		return (
			<div className="min-h-[80vh] flex items-center justify-center">
				<EmptyState
					icon={Target}
					title="Could Not Load Goals"
					description="There was an error loading your identity file."
				/>
			</div>
		);
	}

	const allGoals = [
		...identity.goals.short_term.map((g) => ({ ...g, term: 'short' })),
		...identity.goals.medium_term.map((g) => ({ ...g, term: 'medium' })),
		...identity.goals.long_term.map((g) => ({ ...g, term: 'long' })),
	];

	const hasGoals = allGoals.length > 0;

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-foreground">Goals</h1>
				<p className="text-foreground-muted mt-2">
					Track progress towards your short, medium, and long-term goals
				</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					title="Total Goals"
					value={stats.total}
					subtitle={`${stats.inProgress} in progress`}
					icon={Target}
					variant="blue"
				/>
				<StatCard
					title="Completed"
					value={stats.completed}
					subtitle={
						stats.total > 0
							? `${Math.round((stats.completed / stats.total) * 100)}% completion rate`
							: 'No goals yet'
					}
					icon={CheckCircle2}
					variant="green"
				/>
				<StatCard
					title="Short-term Progress"
					value={formatPercentage(stats.byTerm.short.avgProgress)}
					subtitle={`${stats.byTerm.short.total} goals`}
					icon={ArrowRight}
					variant="orange"
				/>
				<StatCard
					title="Long-term Progress"
					value={formatPercentage(stats.byTerm.long.avgProgress)}
					subtitle={`${stats.byTerm.long.total} goals`}
					icon={Clock}
					variant="purple"
				/>
			</div>

			{!hasGoals ? (
				<EmptyState
					icon={Target}
					title="No Goals Yet"
					description="Start by adding some goals to track your progress. Use 'yxhyx identity add-goal' to create your first goal."
				/>
			) : (
				<div className="space-y-8">
					{/* Short Term */}
					{identity.goals.short_term.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="w-3 h-3 rounded-full bg-accent-orange" />
									<CardTitle>Short-term Goals</CardTitle>
								</div>
								<Badge variant="warning">
									{identity.goals.short_term.filter((g) => g.progress < 1).length} active
								</Badge>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
									{identity.goals.short_term.map((goal) => (
										<GoalCard key={goal.id} goal={goal} term="short" />
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Medium Term */}
					{identity.goals.medium_term.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="w-3 h-3 rounded-full bg-accent-cyan" />
									<CardTitle>Medium-term Goals</CardTitle>
								</div>
								<Badge variant="info">
									{identity.goals.medium_term.filter((g) => g.progress < 1).length} active
								</Badge>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
									{identity.goals.medium_term.map((goal) => (
										<GoalCard key={goal.id} goal={goal} term="medium" />
									))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Long Term */}
					{identity.goals.long_term.length > 0 && (
						<Card>
							<CardHeader>
								<div className="flex items-center gap-3">
									<div className="w-3 h-3 rounded-full bg-accent-purple" />
									<CardTitle>Long-term Goals</CardTitle>
								</div>
								<Badge variant="purple">
									{identity.goals.long_term.filter((g) => g.progress < 1).length} active
								</Badge>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
									{identity.goals.long_term.map((goal) => (
										<GoalCard key={goal.id} goal={goal} term="long" />
									))}
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			)}

			{/* Help Section */}
			<div className="glass-panel rounded-xl p-4 flex items-center gap-4">
				<div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
					<Target className="w-5 h-5 text-primary" />
				</div>
				<div className="flex-1">
					<p className="text-sm text-foreground">Use CLI commands to manage goals:</p>
					<div className="flex flex-wrap gap-2 mt-2">
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx identity add-goal "Goal title" -t short
						</code>
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx identity progress goal-id 50
						</code>
					</div>
				</div>
			</div>
		</div>
	);
}
