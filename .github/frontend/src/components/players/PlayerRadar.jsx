import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip
} from 'recharts';
import { TECHNICAL_ATTRS } from '../../utils/constants';

export default function PlayerRadar({ attributes = {}, color = '#f5c518', size = 300 }) {
  const data = TECHNICAL_ATTRS.map(({ key, label }) => ({
    subject: label,
    A: attributes[key] ?? 5,
    fullMark: 10
  }));

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="rgba(255,255,255,0.1)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#8b9ab8', fontSize: 12, fontWeight: 600 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 10]}
          tick={{ fill: '#4a5a75', fontSize: 10 }}
          tickCount={6}
        />
        <Radar
          dataKey="A"
          stroke={color}
          fill={color}
          fillOpacity={0.18}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: '#141820',
            border: '1px solid #2a3347',
            borderRadius: 8,
            color: '#f0f4ff',
            fontSize: 13
          }}
          formatter={(val, name, props) => [`${val}/10`, props.payload.subject]}
          labelFormatter={() => ''}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
