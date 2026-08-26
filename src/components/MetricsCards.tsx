import React from 'react';
import { MediaMetrics } from '../types';
import { Newspaper, TrendingUp, ShieldAlert, Radio, BookmarkCheck, BarChart3 } from 'lucide-react';

interface MetricsCardsProps {
  metrics: MediaMetrics;
  bookmarkedCount: number;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, bookmarkedCount }) => {
  const { totalArticles, sentimentBreakdown, topSources, categoryBreakdown } = metrics;

  // Calculate dominant category
  const sortedCategories = Object.entries(categoryBreakdown).sort((a, b) => (b[1] as number) - (a[1] as number));
  const topCategoryName = sortedCategories.length > 0 ? sortedCategories[0][0] : 'غير محدد';
  const topCategoryCount = sortedCategories.length > 0 ? sortedCategories[0][1] : 0;

  // Calculate sentiment percentage
  const posCount = sentimentBreakdown.positive || 0;
  const neuCount = sentimentBreakdown.neutral || 0;
  const negCount = sentimentBreakdown.negative || 0;
  const totalSent = posCount + neuCount + negCount || 1;

  const posPct = totalArticles > 0 ? Math.round((posCount / totalSent) * 100) : 0;
  const negPct = totalArticles > 0 ? Math.round((negCount / totalSent) * 100) : 0;

  const topSource = topSources.length > 0 ? topSources[0].source : 'لا توجد بيانات أخبار حالياً';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      
      {/* Dominant Topic Card */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">المجال الأكثر تغطية</p>
          <h3 className="text-lg font-bold text-slate-800">{topCategoryName}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            حجم التغطية: <span className="text-slate-800 font-mono font-bold">{topCategoryCount}</span> خبر
          </p>
        </div>
        <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
          <BarChart3 className="w-5 h-5" />
        </div>
      </div>

      {/* Top Active Source Card */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-1">المصدر الأكثر نشاطاً</p>
          <h3 className="text-base font-bold text-slate-800 truncate max-w-[150px]">{topSource}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
            <BookmarkCheck className="w-3.5 h-3.5 text-slate-600" />
            <span>محفوظات الأرشيف: {bookmarkedCount}</span>
          </p>
        </div>
        <div className="w-10 h-10 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
          <Radio className="w-5 h-5" />
        </div>
      </div>

    </div>
  );
};
