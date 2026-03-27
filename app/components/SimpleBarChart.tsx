'use client';

interface BarChartProps {
  data: Record<string, number>;
  colors?: string[];
  showPercentage?: boolean;
  total?: number;
}

export default function SimpleBarChart({ 
  data, 
  colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
  showPercentage = true,
  total: propTotal
}: BarChartProps) {
  const entries = Object.entries(data);
  const total = propTotal ?? entries.reduce((sum, [, value]) => sum + value, 0);

  if (total === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        暂无数据
      </div>
    );
  }

  const maxValue = Math.max(...entries.map(([, value]) => value));

  return (
    <div className="space-y-3">
      {entries.map(([label, value], index) => {
        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
        const barWidth = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const color = colors[index % colors.length];

        return (
          <div key={label} className="flex items-center gap-3">
            <div className="w-20 text-xs text-gray-600 truncate" title={label}>
              {label}
            </div>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${barWidth}%`,
                    backgroundColor: color,
                    minWidth: value > 0 ? '4px' : '0'
                  }}
                />
              </div>
              <div className="w-16 text-right">
                <span className="text-sm font-medium text-gray-900">{value}</span>
                {showPercentage && total > 0 && (
                  <span className="text-xs text-gray-500 ml-1">({percentage}%)</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
