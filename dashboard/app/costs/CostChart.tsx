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
							<stop offset="5%" stopColor="#7aa2f7" stopOpacity={0.3} />
							<stop offset="95%" stopColor="#7aa2f7" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="#414868" />
					<XAxis
						dataKey="month"
						tick={{ fill: '#565f89', fontSize: 12 }}
						tickLine={{ stroke: '#414868' }}
						axisLine={{ stroke: '#414868' }}
					/>
					<YAxis
						tick={{ fill: '#565f89', fontSize: 12 }}
						tickLine={{ stroke: '#414868' }}
						axisLine={{ stroke: '#414868' }}
						tickFormatter={(value) => `$${value.toFixed(2)}`}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: '#24283b',
							border: '1px solid #414868',
							borderRadius: '12px',
							color: '#c0caf5',
						}}
						labelStyle={{ color: '#c0caf5', fontWeight: 'bold' }}
						formatter={(value: number) => [`$${value.toFixed(4)}`, 'Total']}
					/>
					<Area
						type="monotone"
						dataKey="total"
						stroke="#7aa2f7"
						strokeWidth={2}
						fillOpacity={1}
						fill="url(#colorTotal)"
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
}
