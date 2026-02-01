'use client';

import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

// Design system colors
const colors = {
	primary: 'rgb(162, 59, 103)',
	primaryHover: '#d56698',
	grid: 'rgba(255, 255, 255, 0.06)',
	axis: 'rgba(255, 255, 255, 0.1)',
	text: '#6a6a6a',
	tooltipBg: '#1f1f1f',
	tooltipBorder: 'rgba(255, 255, 255, 0.1)',
	tooltipText: '#f0f0f0',
};

interface CostChartProps {
	data: Array<{
		month: string;
		total: number;
	}>;
}

export function CostChart({ data }: CostChartProps) {
	if (data.length === 0) {
		return (
			<div className="h-[300px] flex items-center justify-center text-foreground-muted">
				No trend data available
			</div>
		);
	}

	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
					<defs>
						<linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
							<stop offset="5%" stopColor={colors.primary} stopOpacity={0.3} />
							<stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
					<XAxis
						dataKey="month"
						tick={{ fill: colors.text, fontSize: 12 }}
						tickLine={{ stroke: colors.axis }}
						axisLine={{ stroke: colors.axis }}
					/>
					<YAxis
						tick={{ fill: colors.text, fontSize: 12 }}
						tickLine={{ stroke: colors.axis }}
						axisLine={{ stroke: colors.axis }}
						tickFormatter={(value) => `$${value.toFixed(2)}`}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: colors.tooltipBg,
							border: `1px solid ${colors.tooltipBorder}`,
							borderRadius: '12px',
							color: colors.tooltipText,
						}}
						labelStyle={{ color: colors.tooltipText, fontWeight: 'bold' }}
						formatter={(value: number) => [`$${value.toFixed(4)}`, 'Total']}
					/>
					<Area
						type="monotone"
						dataKey="total"
						stroke={colors.primary}
						strokeWidth={2}
						fillOpacity={1}
						fill="url(#colorTotal)"
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}
