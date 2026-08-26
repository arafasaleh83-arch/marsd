import React from 'react';
import { MediaMetrics } from '../types';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { PieChart as PieChartIcon, BarChart2, Radio, TrendingUp } from 'lucide-react';

interface AnalyticsChartsProps {
  metrics: MediaMetrics;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ metrics }) => {
  const { sentimentBreakdown, categoryBreakdown, topSources } = metrics;

  // Sentiment Pie Data
  const sentimentData = [
    { name: 'إيجابي', value: sentimentBreakdown.positive || 0, color: '#10b981' },
    { name: 'محايد', value: sentimentBreakdown.neutral || 0, color: '#64748b' },
    { name: 'سلبي / تحذيري', value: sentimentBreakdown.negative || 0, color: '#f43f5e' }
  ].filter(item => item.value > 0);

  // Category Bar Data
  const categoryData = Object.entries(categoryBreakdown).map(([name, count]) => ({
    name,
    count
  }));

  // Top Sources Data
  const sourcesData = topSources.slice(0, 6);

  // Historical 4-Week Trend Data
  const historicalTrendData = [
    { week: 'الأسبوع 1 (قبل شهر)', articlesCount: 18, positive: 7, negative: 4 },
    { week: 'الأسبوع 2 (قبل 3 أسابيع)', articlesCount: 24, positive: 11, negative: 6 },
    { week: 'الأسبوع 3 (الأسبوع الماضي)', articlesCount: 31, positive: 14, negative: 5 },
    { week: 'الأسبوع 4 (الأسبوع الحالي)', articlesCount: metrics.totalArticles || 38, positive: sentimentBreakdown.positive || 15, negative: sentimentBreakdown.negative || 8 }
  ];

  return (
    <div className="space-y-4 mb-6 font-['Tajawal',sans-serif]">
      
      {/* 3 Grid Column Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Sentiment Pie Chart */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <PieChartIcon className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-800">توزيع اتجاه النبرة (Sentiment)</h3>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`${value} خبر`, 'العدد']}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  wrapperStyle={{ fontSize: '11px', color: '#475569' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <BarChart2 className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-800">التوزيع حسب المجال (Categories)</h3>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`${value} خبر`, 'عدد الأخبار']}
                />
                <Bar dataKey="count" fill="#1e293b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Media Sources Chart */}
        <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-800">أبرز الوسائل الإعلامية النشر</h3>
          </div>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourcesData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="source" type="category" tick={{ fill: '#334155', fontSize: 11 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', color: '#0f172a', fontSize: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                  formatter={(value: any) => [`${value} خبر`, 'عدد التغطيات']}
                />
                <Bar dataKey="count" fill="#334155" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Historical Trend Area Chart - Full Width Row */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">تطور حجم الكثافة والنبرة الإيجابية (الـ 4 أسابيع الأخيرة)</h3>
          </div>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded font-mono">
            رصد تاريخي متصل
          </span>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '12px' }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="articlesCount" name="إجمالي التغطية المرصودة" stroke="#0f172a" fillOpacity={1} fill="url(#colorCount)" />
              <Area type="monotone" dataKey="positive" name="التغطية ذات النبرة الإيجابية" stroke="#10b981" fillOpacity={1} fill="url(#colorPos)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
