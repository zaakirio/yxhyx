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
					<CartesianGrid strokeDasharray="3 3" stroke="#414868" />
					<XAxis
						dataKey="date"
						tick={{ fill: '#565f89', fontSize: 12 }}
						tickLine={{ stroke: '#414868' }}
						axisLine={{ stroke: '#414868' }}
					/>
					<YAxis
						domain={[0, 10]}
						tick={{ fill: '#565f89', fontSize: 12 }}
						tickLine={{ stroke: '#414868' }}
						axisLine={{ stroke: '#414868' }}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: '#24283b',
							border: '1px solid #414868',
							borderRadius: '12px',
							color: '#c0caf5',
						}}
						labelStyle={{ color: '#c0caf5', fontWeight: 'bold' }}
						formatter={(value: number, name: string) => [
							name === 'average' ? value.toFixed(1) : value,
							name === 'average' ? 'Avg Rating' : 'Count',
						]}
					/>
					<Line
						type="monotone"
						dataKey="average"
						name="Average"
						stroke="#7aa2f7"
						strokeWidth={2}
						dot={{ fill: '#7aa2f7', strokeWidth: 2 }}
						activeDot={{ r: 6, fill: '#7aa2f7' }}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
}
