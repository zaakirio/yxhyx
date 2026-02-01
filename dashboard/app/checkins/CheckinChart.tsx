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
					<CartesianGrid strokeDasharray="3 3" stroke="#414868" />
					<XAxis
						dataKey="date"
						tick={{ fill: '#565f89', fontSize: 12 }}
						tickLine={{ stroke: '#414868' }}
						axisLine={{ stroke: '#414868' }}
					/>
					<YAxis
						tick={{ fill: '#565f89', fontSize: 12 }}
						tickLine={{ stroke: '#414868' }}
						axisLine={{ stroke: '#414868' }}
						allowDecimals={false}
					/>
					<Tooltip
						contentStyle={{
							backgroundColor: '#24283b',
							border: '1px solid #414868',
							borderRadius: '12px',
							color: '#c0caf5',
						}}
						labelStyle={{ color: '#c0caf5', fontWeight: 'bold' }}
					/>
					<Legend wrapperStyle={{ paddingTop: '20px' }} />
					<Bar dataKey="morning" name="Morning" fill="#e0af68" radius={[4, 4, 0, 0]} stackId="a" />
					<Bar dataKey="evening" name="Evening" fill="#bb9af7" radius={[4, 4, 0, 0]} stackId="a" />
					<Bar dataKey="weekly" name="Weekly" fill="#7dcfff" radius={[4, 4, 0, 0]} stackId="a" />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}
