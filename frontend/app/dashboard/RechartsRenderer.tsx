import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface RechartsRendererProps {
  jsonString: string;
  theme: 'light' | 'dark';
}

export default function RechartsRenderer({ jsonString, theme }: RechartsRendererProps) {
  const parsedData = useMemo(() => {
    try {
      let cleaned = jsonString.trim();
      cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
      const data = JSON.parse(cleaned);
      return data;
    } catch (e) {
      console.warn('Failed to parse Recharts JSON:', e);
      return null;
    }
  }, [jsonString]);

  if (!parsedData || !parsedData.data || !Array.isArray(parsedData.data) || parsedData.data.length === 0) {
    return (
      <div style={{ padding: '1rem', border: '1px dashed #ccc', borderRadius: '8px', color: '#666', fontSize: '13px' }}>
        <em>(Graph data unavailable)</em>
      </div>
    );
  }

  const { type, title, data } = parsedData;
  const isDark = theme === 'dark';
  const textColor = isDark ? '#cbd5e1' : '#334155';
  const gridColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const strokeColor = isDark ? '#38bdf8' : '#2563eb';

  const ChartComponent = type === 'bar' ? BarChart : LineChart;

  return (
    <div style={{ width: '100%', margin: '2rem 0', padding: '1rem', background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#f8fafc', borderRadius: '12px', border: '1px solid ' + gridColor }}>
      {title && <h4 style={{ textAlign: 'center', margin: '0 0 1rem 0', color: textColor }}>{title}</h4>}
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" stroke={textColor} tick={{ fill: textColor }} />
            <YAxis stroke={textColor} tick={{ fill: textColor }} />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : '#fff',
                borderColor: gridColor,
                color: textColor,
                borderRadius: '8px'
              }}
            />
            {type === 'bar' ? (
              <Bar dataKey="y" fill={strokeColor} radius={[4, 4, 0, 0]} />
            ) : (
              <Line type="monotone" dataKey="y" stroke={strokeColor} strokeWidth={3} dot={{ fill: strokeColor, r: 4 }} />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
