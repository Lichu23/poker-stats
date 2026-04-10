'use client'

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  date: string
  cumulative: number
}

interface ProfitChartProps {
  data: DataPoint[]
}

export default function ProfitChart({ data }: ProfitChartProps) {
  const isPositive = (data[data.length - 1]?.cumulative ?? 0) >= 0
  const color = isPositive ? '#4ade80' : '#f87171'

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: '#71717a', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={d => d.slice(5)} // show MM-DD
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: '#18181b',
            border: '1px solid #3f3f46',
            borderRadius: '8px',
            fontSize: 12,
            color: '#e4e4e7',
          }}
          formatter={(v) => [`${Number(v) > 0 ? '+' : ''}${Number(v)} BB`, 'Profit']}
          labelStyle={{ color: '#a1a1aa' }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke={color}
          strokeWidth={2}
          fill="url(#profitGrad)"
          dot={false}
          activeDot={{ r: 4, fill: color }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
