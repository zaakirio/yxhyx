'use client';

import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';

// Design system colors
const colors = {
	yellow: '#e0af68',
	primary: 'rgb(162, 59, 103)',
	cyan: '#4ff4c7',
	grid: 'rgba(255, 255, 255, 0.06)',
	axis: 'rgba(255, 255, 255, 0.1)',
	text: '#6a6a6a',
	tooltipBg: '#1f1f1f',
	tooltipBorder: 'rgba(255, 255, 255, 0.1)',
	tooltipText: '#f0f0f0',
};

interface CheckinChartProps {
	data: Array<{
		date: string;
		morning: number;
		evening: number;
		weekly: number;
	}>;
}

export function CheckinChart({ data }: CheckinChartProps) {
	return (
		<div className="h-[300px] w-full">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
					<CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
					<XAxis
						dataKey="date"
						tick={{ fill: colors.text, fontSize: 12 }}
						tickLine={{ stroke: colors.axis }}
						axisLine={{ stroke: colors.axis }}
					/>
					<YAxis
						tick={{ fill: colors.text, fontSize: 12 }}
						tickLine={{ stroke: colors.axis }}
						axisLine={{ stroke: colors.axis }}
						allowDecimals={false}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: colors.tooltipBg,
							border: `1px solid ${colors.tooltipBorder}`,
							borderRadius: '12px',
							color: colors.tooltipText,
						}}
						labelStyle={{ color: colors.tooltipText, fontWeight: 'bold' }}
					/>
					<Legend wrapperStyle={{ paddingTop: '20px' }} />
					<Bar
						dataKey="morning"
						name="Morning"
						fill={colors.yellow}
						radius={[4, 4, 0, 0]}
						stackId="a"
					/>
					<Bar
						dataKey="evening"
						name="Evening"
						fill={colors.primary}
						radius={[4, 4, 0, 0]}
						stackId="a"
					/>
					<Bar
						dataKey="weekly"
						name="Weekly"
						fill={colors.cyan}
						radius={[4, 4, 0, 0]}
						stackId="a"
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
