'use client';

import {
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

// Design system colors
const colors = {
	primary: 'rgb(162, 59, 103)',
	grid: 'rgba(255, 255, 255, 0.06)',
	axis: 'rgba(255, 255, 255, 0.1)',
	text: '#6a6a6a',
	tooltipBg: '#1f1f1f',
	tooltipBorder: 'rgba(255, 255, 255, 0.1)',
	tooltipText: '#f0f0f0',
};

interface RatingChartProps {
	data: Array<{
		date: string;
		average: number;
		count: number;
	}>;
}

export function RatingChart({ data }: RatingChartProps) {
	if (data.length === 0) {
		return (
			<div className="h-[250px] flex items-center justify-center text-foreground-muted">
				No trend data available
			</div>
		);
	}

	const formattedData = data.map((d) => ({
		...d,
		date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
	}));

	return (
		<div className="h-[250px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<LineChart data={formattedData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
					<XAxis
						dataKey="date"
						tick={{ fill: colors.text, fontSize: 12 }}
						tickLine={{ stroke: colors.axis }}
						axisLine={{ stroke: colors.axis }}
					/>
					<YAxis
						domain={[0, 10]}
						tick={{ fill: colors.text, fontSize: 12 }}
						tickLine={{ stroke: colors.axis }}
						axisLine={{ stroke: colors.axis }}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: colors.tooltipBg,
							border: `1px solid ${colors.tooltipBorder}`,
							borderRadius: '12px',
							color: colors.tooltipText,
						}}
						labelStyle={{ color: colors.tooltipText, fontWeight: 'bold' }}
						formatter={(value: number, name: string) => [
							name === 'average' ? value.toFixed(1) : value,
							name === 'average' ? 'Avg Rating' : 'Count',
						]}
					/>
					<Line
						type="monotone"
						dataKey="average"
						name="Average"
						stroke={colors.primary}
						strokeWidth={2}
						dot={{ fill: colors.primary, strokeWidth: 2 }}
						activeDot={{ r: 6, fill: colors.primary }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
