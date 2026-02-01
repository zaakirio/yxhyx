import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { getCostData, isInitialized } from '@/lib/data';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, Calculator, DollarSign, PieChart, Sparkles, TrendingUp } from 'lucide-react';
import { CostChart } from './CostChart';

export const dynamic = 'force-dynamic';

// Model display names and colors
const modelInfo: Record<string, { name: string; color: string }> = {
	'kimi-k2.5': { name: 'Kimi K2.5', color: 'bg-accent-green' },
	openrouter: { name: 'OpenRouter', color: 'bg-accent-cyan' },
	claude: { name: 'Claude', color: 'bg-primary' },
	'claude-sonnet': { name: 'Claude Sonnet', color: 'bg-primary' },
	'gpt-4': { name: 'GPT-4', color: 'bg-accent-blue' },
	default: { name: 'Other', color: 'bg-foreground-muted' },
};

function getModelInfo(model: string) {
	return modelInfo[model.toLowerCase()] || modelInfo.default;
}

export default async function CostsPage() {
	const initialized = await isInitialized();

	if (!initialized) {
		return (
			<div className="min-h-[80vh] flex items-center justify-center">
				<EmptyState
					icon={Sparkles}
					title="Cost Tracking Not Available"
					description="Yxhyx hasn't been initialized yet. Run 'yxhyx init' in your terminal to get started."
				/>
			</div>
		);
	}

	const costData = await getCostData();

	const hasData = costData.monthlyTotal > 0 || costData.history.length > 0;
	const breakdownEntries = Object.entries(costData.breakdown);
	const totalBreakdown = breakdownEntries.reduce((sum, [_, cost]) => sum + cost, 0);

	// Prepare chart data
	const chartData = costData.history.map((h) => ({
		month: new Date(h.month + '-01').toLocaleDateString('en-US', {
			month: 'short',
			year: '2-digit',
		}),
		total: h.total,
	}));

	return (
		<div className="space-y-8 animate-fade-in">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold text-foreground">Cost Tracking</h1>
				<p className="text-foreground-muted mt-2">Monitor your AI API usage costs</p>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatCard
					title="Current Month"
					value={formatCurrency(costData.monthlyTotal)}
					subtitle={new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
					icon={DollarSign}
					variant="blue"
				/>
				<StatCard
					title="Projected"
					value={formatCurrency(costData.projected)}
					subtitle="End of month"
					icon={TrendingUp}
					variant="orange"
				/>
				<StatCard
					title="Daily Average"
					value={formatCurrency(costData.monthlyTotal / new Date().getDate())}
					subtitle="This month"
					icon={Calculator}
					variant="cyan"
				/>
				<StatCard
					title="Models Used"
					value={breakdownEntries.length}
					subtitle="Different providers"
					icon={PieChart}
					variant="purple"
				/>
			</div>

			{!hasData ? (
				<EmptyState
					icon={DollarSign}
					title="No Cost Data Yet"
					description="Start using Yxhyx to see your API costs tracked here. Each AI interaction is automatically tracked."
				/>
			) : (
				<>
					{/* Cost Breakdown */}
					{breakdownEntries.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<PieChart className="w-5 h-5 text-primary" />
									Cost Breakdown by Model
								</CardTitle>
								<Badge variant="default">
									{new Date().toLocaleDateString('en-US', { month: 'long' })}
								</Badge>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
									{/* Bar breakdown */}
									<div className="space-y-4">
										{breakdownEntries
											.sort(([, a], [, b]) => b - a)
											.map(([model, cost]) => {
												const info = getModelInfo(model);
												const percentage = totalBreakdown > 0 ? (cost / totalBreakdown) * 100 : 0;
												return (
													<div key={model}>
														<div className="flex items-center justify-between mb-2">
															<div className="flex items-center gap-2">
																<div className={`w-3 h-3 rounded-full ${info.color}`} />
																<span className="text-sm font-medium text-foreground">
																	{info.name}
																</span>
															</div>
															<div className="text-right">
																<span className="text-sm font-bold text-foreground">
																	{formatCurrency(cost)}
																</span>
																<span className="text-xs text-foreground-muted ml-2">
																	({percentage.toFixed(1)}%)
																</span>
															</div>
														</div>
														<div className="h-3 bg-background-lighter rounded-full overflow-hidden">
															<div
																className={`h-full rounded-full transition-all duration-500 ${info.color}`}
																style={{ width: `${percentage}%` }}
															/>
														</div>
													</div>
												);
											})}
									</div>

									{/* Pie chart representation */}
									<div className="flex items-center justify-center">
										<div className="relative w-48 h-48">
											<svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
												{(() => {
													let currentAngle = 0;
													return breakdownEntries
														.sort(([, a], [, b]) => b - a)
														.map(([model, cost], idx) => {
															const info = getModelInfo(model);
															const percentage =
																totalBreakdown > 0 ? (cost / totalBreakdown) * 100 : 0;
															const angle = (percentage / 100) * 360;
															const largeArc = angle > 180 ? 1 : 0;
															const startX = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
															const startY = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
															const endX =
																50 + 40 * Math.cos(((currentAngle + angle) * Math.PI) / 180);
															const endY =
																50 + 40 * Math.sin(((currentAngle + angle) * Math.PI) / 180);

															const pathD = `M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`;
															currentAngle += angle;

															const colors: Record<string, string> = {
																'bg-accent-green': '#4ff4c7',
																'bg-accent-cyan': '#4ff4c7',
																'bg-accent-blue': '#4f8cff',
																'bg-primary': 'rgb(162, 59, 103)',
																'bg-foreground-muted': '#6a6a6a',
															};

															return (
																<path
																	key={model}
																	d={pathD}
																	fill={colors[info.color] || '#565f89'}
																	className="transition-all duration-300 hover:opacity-80"
																/>
															);
														});
												})()}
											</svg>
											<div className="absolute inset-0 flex flex-col items-center justify-center">
												<span className="text-2xl font-bold text-foreground">
													{formatCurrency(totalBreakdown)}
												</span>
												<span className="text-xs text-foreground-muted">Total</span>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					)}

					{/* Monthly Trend */}
					{chartData.length > 1 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<BarChart3 className="w-5 h-5 text-primary" />
									Monthly Trend
								</CardTitle>
							</CardHeader>
							<CardContent>
								<CostChart data={chartData} />
							</CardContent>
						</Card>
					)}

					{/* History Table */}
					{costData.history.length > 0 && (
						<Card>
							<CardHeader>
								<CardTitle>Cost History</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="overflow-x-auto">
									<table className="w-full">
										<thead>
											<tr className="border-b border-border">
												<th className="text-left py-3 px-4 text-sm font-medium text-foreground-muted">
													Month
												</th>
												<th className="text-right py-3 px-4 text-sm font-medium text-foreground-muted">
													Total
												</th>
												{Object.keys(costData.breakdown).map((model) => (
													<th
														key={model}
														className="text-right py-3 px-4 text-sm font-medium text-foreground-muted"
													>
														{getModelInfo(model).name}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{costData.history
												.slice()
												.reverse()
												.map((month) => (
													<tr
														key={month.month}
														className="border-b border-border/50 hover:bg-background-light/50"
													>
														<td className="py-3 px-4 text-sm text-foreground">
															{new Date(month.month + '-01').toLocaleDateString('en-US', {
																month: 'long',
																year: 'numeric',
															})}
														</td>
														<td className="py-3 px-4 text-sm text-right font-medium text-foreground">
															{formatCurrency(month.total)}
														</td>
														{Object.keys(costData.breakdown).map((model) => (
															<td
																key={model}
																className="py-3 px-4 text-sm text-right text-foreground-muted"
															>
																{month.breakdown[model]
																	? formatCurrency(month.breakdown[model])
																	: '-'}
															</td>
														))}
													</tr>
												))}
										</tbody>
									</table>
								</div>
							</CardContent>
						</Card>
					)}
				</>
			)}

			{/* Info Section */}
			<div className="glass-panel rounded-xl p-4 flex items-center gap-4">
				<div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
					<DollarSign className="w-5 h-5 text-primary" />
				</div>
				<div className="flex-1">
					<p className="text-sm text-foreground">View detailed cost information:</p>
					<div className="flex flex-wrap gap-2 mt-2">
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx cost
						</code>
						<code className="px-2 py-1 rounded bg-background-lighter text-accent-cyan font-mono text-xs">
							yxhyx cost -d
						</code>
					</div>
				</div>
			</div>
		</div>
	);
}
