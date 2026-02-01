import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { getAllLearnings, getRatingStats, getRecentRatings, isInitialized } from '@/lib/data';
import { formatDate, formatRelativeTime, getRatingBgColor, getRatingColor } from '@/lib/utils';
import {
	AlertCircle,
	BarChart3,
	Brain,
	CheckCircle2,
	Sparkles,
	Star,
	ThumbsDown,
	ThumbsUp,
	TrendingDown,
	TrendingUp,
} from 'lucide-react';
import { RatingChart } from './RatingChart';

export const dynamic = 'force-dynamic';

export default async function LearningsPage() {
	const initialized = await isInitialized();

	if (!initialized) {
		return (
			<div className="min-h-[80vh] flex items-center justify-center">
				<EmptyState
					icon={Sparkles}
					title="Learnings Not Available"
					description="Yxhyx hasn't been initialized yet. Run 'yxhyx init' in your terminal to get started."
				/>
			</div>
		);
	}

	const [stats, learnings, recentRatings] = await Promise.all([
		getRatingStats(30),
		getAllLearnings(),
		getRecentRatings(30),
	]);

	const successes = learnings.filter((l) => l.type === 'success');
	const failures = learnings.filter((l) => l.type === 'failure');

	const hasData = stats.total > 0 || learnings.length > 0;

	// Distribution data for chart
	const distributionData = Object.entries(stats.distribution)
		.map(([rating, count]) => ({
			rating: Number.parseInt(rating),
			count,
		}))
		.sort((a, b) => a.rating - b.rating);

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-foreground">Learnings & Ratings</h1>
				<p className="text-foreground-muted mt-2">
					Track your interaction quality and extracted learnings
				</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					title="Total Ratings"
					value={stats.total}
					subtitle="Last 30 days"
					icon={Star}
					variant="blue"
				/>
				<StatCard
					title="Average Rating"
					value={stats.average > 0 ? stats.average.toFixed(1) : '-'}
					subtitle={`Min: ${stats.min || '-'} | Max: ${stats.max || '-'}`}
					icon={BarChart3}
					variant={stats.average >= 7 ? 'green' : stats.average >= 5 ? 'orange' : 'red'}
				/>
				<StatCard
					title="Success Patterns"
					value={successes.length}
					subtitle="Positive learnings"
					icon={ThumbsUp}
					variant="green"
				/>
				<StatCard
					title="Failure Patterns"
					value={failures.length}
					subtitle="Areas to improve"
					icon={ThumbsDown}
					variant="red"
				/>
			</div>

			{!hasData ? (
				<EmptyState
					icon={Brain}
					title="No Ratings Yet"
					description="Rate your interactions to start capturing learnings. Use yxhyx with a rating like '8 - great response' to rate."
				/>
			) : (
				<>
					{/* Rating Distribution */}
					{stats.total > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<BarChart3 className="w-5 h-5 text-primary" />
									Rating Distribution
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
									{/* Bar representation */}
									<div className="space-y-3">
										{[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => {
											const count = stats.distribution[rating] || 0;
											const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
											return (
												<div key={rating} className="flex items-center gap-3">
													<span className="text-sm text-foreground-muted w-6 text-right">
														{rating}
													</span>
													<div className="flex-1 h-6 bg-background-lighter rounded-full overflow-hidden">
														<div
															className={`h-full rounded-full transition-all duration-500 ${
																rating >= 8
																	? 'bg-accent-green'
																	: rating >= 6
																		? 'bg-accent-yellow'
																		: rating >= 4
																			? 'bg-accent-orange'
																			: 'bg-accent-red'
															}`}
															style={{ width: `${percentage}%` }}
														/>
													</div>
													<span className="text-sm text-foreground w-8">{count}</span>
												</div>
											);
										})}
									</div>

									{/* Chart */}
									<RatingChart data={stats.trend} />
								</div>
							</CardContent>
						</Card>
					)}

					{/* Recent Ratings */}
					{recentRatings.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Star className="w-5 h-5 text-accent-yellow" />
									Recent Ratings
								</CardTitle>
								<Badge variant="default">{recentRatings.length} in 30 days</Badge>
							</CardHeader>
							<CardContent>
								<div className="space-y-3 max-h-[400px] overflow-y-auto">
									{recentRatings
										.slice()
										.reverse()
										.slice(0, 20)
										.map((rating, idx) => (
											<div
												key={idx}
												className="flex items-center gap-4 p-4 rounded-xl bg-background-light/50 border border-border/50"
											>
												<div
													className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${getRatingBgColor(rating.rating)} ${getRatingColor(rating.rating)}`}
												>
													{rating.rating}
												</div>
												<div className="flex-1">
													{rating.comment ? (
														<p className="text-foreground">{rating.comment}</p>
													) : (
														<p className="text-foreground-muted italic">No comment</p>
													)}
													<div className="flex items-center gap-3 mt-1">
														<Badge
															variant={rating.source === 'explicit' ? 'info' : 'default'}
															size="sm"
														>
															{rating.source}
														</Badge>
														<span className="text-xs text-foreground-dimmed">
															{formatRelativeTime(rating.timestamp)}
														</span>
													</div>
												</div>
												{rating.rating >= 8 ? (
													<TrendingUp className="w-5 h-5 text-accent-green" />
												) : rating.rating <= 5 ? (
													<TrendingDown className="w-5 h-5 text-accent-red" />
												) : null}
											</div>
										))}
								</div>
							</CardContent>
						</Card>
					)}

					{/* Learnings Grid */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Success Patterns */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<CheckCircle2 className="w-5 h-5 text-accent-green" />
									Success Patterns
								</CardTitle>
								<Badge variant="success">{successes.length}</Badge>
							</CardHeader>
							<CardContent>
								{successes.length > 0 ? (
									<div className="space-y-3 max-h-[400px] overflow-y-auto">
										{successes.slice(0, 10).map((learning, idx) => (
											<div
												key={idx}
												className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20"
											>
												<p className="text-foreground font-medium">{learning.lesson}</p>
												{learning.situation && (
													<p className="text-sm text-foreground-muted mt-2">
														Context: {learning.situation}
													</p>
												)}
												<div className="flex items-center gap-2 mt-3">
													{learning.tags.map((tag, tagIdx) => (
														<Badge key={tagIdx} variant="success" size="sm">
															{tag}
														</Badge>
													))}
												</div>
												<p className="text-xs text-foreground-dimmed mt-2">
													{formatDate(learning.timestamp)}
												</p>
											</div>
										))}
									</div>
								) : (
									<p className="text-foreground-muted text-center py-8">
										No success patterns captured yet. Rate interactions 8+ to capture what works.
									</p>
								)}
							</CardContent>
						</Card>

						{/* Failure Patterns */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<AlertCircle className="w-5 h-5 text-accent-red" />
									Improvement Areas
								</CardTitle>
								<Badge variant="error">{failures.length}</Badge>
							</CardHeader>
							<CardContent>
								{failures.length > 0 ? (
									<div className="space-y-3 max-h-[400px] overflow-y-auto">
										{failures.slice(0, 10).map((learning, idx) => (
											<div
												key={idx}
												className="p-4 rounded-xl bg-accent-red/10 border border-accent-red/20"
											>
												<p className="text-foreground font-medium">{learning.lesson}</p>
												{learning.what_went_wrong && (
													<p className="text-sm text-foreground-muted mt-2">
														Issue: {learning.what_went_wrong}
													</p>
												)}
												{learning.action_items.length > 0 && (
													<div className="mt-3">
														<p className="text-xs text-foreground-dimmed mb-1">Action items:</p>
														<ul className="text-sm text-foreground space-y-1">
															{learning.action_items.map((item, itemIdx) => (
																<li key={itemIdx}>• {item}</li>
															))}
														</ul>
													</div>
												)}
												<div className="flex items-center gap-2 mt-3">
													{learning.tags.map((tag, tagIdx) => (
														<Badge key={tagIdx} variant="error" size="sm">
															{tag}
														</Badge>
													))}
												</div>
												<p className="text-xs text-foreground-dimmed mt-2">
													{formatDate(learning.timestamp)}
												</p>
											</div>
										))}
									</div>
								) : (
									<p className="text-foreground-muted text-center py-8">
										No failure patterns captured yet. Rate interactions 5 or below to capture areas
										for improvement.
									</p>
								)}
							</CardContent>
						</Card>
					</div>
				</>
			)}

			{/* Help Section */}
			<div className="glass-panel rounded-xl p-4 flex items-center gap-4">
				<div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
					<Star className="w-5 h-5 text-primary" />
				</div>
				<div className="flex-1">
					<p className="text-sm text-foreground">Rate interactions to capture learnings:</p>
					<div className="flex flex-wrap gap-2 mt-2">
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx "8 - great response"
						</code>
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx "4 - needs improvement"
						</code>
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx memory learnings
						</code>
					</div>
				</div>
			</div>
		</div>
	);
}
