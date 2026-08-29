import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import { TECHNICAL_ATTRS } from '../../utils/constants';

const SHORT_LABELS = {
  attack: 'ATQ', serve: 'SAQ', reception: 'REC',
  block: 'BLQ', defense: 'DEF', setting: 'LEV'
};

export default function PlayerRadarMini({ attributes = {}, size = 140 }) {
  const data = TECHNICAL_ATTRS.map(({ key, label }) => ({
    subject: SHORT_LABELS[key] || label,
    A: attributes[key] ?? 5,
    fullMark: 10
  }));

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: '#8b9ab8', fontSize: 10, fontWeight: 600 }}
        />
        <Radar
          dataKey="A"
          stroke="#f5c518"
          fill="#f5c518"
          fillOpacity={0.15}
          strokeWidth={1.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
