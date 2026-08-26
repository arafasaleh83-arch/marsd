import React, { useState } from 'react';
import { NewsArticle, ArticleCategory, SentimentType, StrategicImportanceType } from '../types';
import { cleanText } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { 
  ExternalLink, 
  Bookmark, 
  BookmarkCheck, 
  Sparkles, 
  Copy, 
  Check, 
  Tag, 
  Clock, 
  ThumbsUp, 
  Minus, 
  AlertTriangle,
  Share2,
  Calendar,
  Globe,
  Flame,
  ShieldAlert,
  Search,
  RefreshCw,
  Radio,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface NewsFeedProps {
  articles: NewsArticle[];
  onToggleBookmark: (id: string) => void;
  onAnalyzeArticle: (article: NewsArticle) => Promise<void>;
  analyzingArticleId: string | null;
  onSearchGoogleNews?: (query: string) => void;
  currentQuery?: string;
  isLoading?: boolean;
  sourceType?: string;
  onRefresh?: () => void;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({
  articles,
  onToggleBookmark,
  onAnalyzeArticle,
  analyzingArticleId,
  onSearchGoogleNews,
  currentQuery = 'ليبيا OR حفتر OR "القيادة العامة"',
  isLoading = false,
  sourceType = 'live_rss',
  onRefresh
}) => {
  const [isGoogleBannerVisible, setIsGoogleBannerVisible] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [selectedSentiment, setSelectedSentiment] = useState<string>('الكل');
  const [selectedImportance, setSelectedImportance] = useState<string>('الكل');
  const [onlyBookmarked, setOnlyBookmarked] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const categories: string[] = ['الكل', 'عسكري وأمني', 'سياسة', 'اقتصاد وطاقة', 'دبلوماسي وتدويل', 'شؤون محلية'];
  const sentiments: { label: string; value: string }[] = [
    { label: 'جميع اتجاهات النبرة', value: 'الكل' },
    { label: 'إيجابي 🟢', value: 'positive' },
    { label: 'محايد ⚪', value: 'neutral' },
    { label: 'سلبي 🔴', value: 'negative' }
  ];

  const importanceOptions: { label: string; value: string }[] = [
    { label: 'جميع مستويات الأهمية', value: 'الكل' },
    { label: 'عالي الأهمية 🚨', value: 'عالي الأهمية' },
    { label: 'متوسط 🔹', value: 'متوسط' },
    { label: 'روتيني ⚪', value: 'روتيني' }
  ];

  // Topic Presets for Google News Monitoring
  const googleNewsPresets = [
    { name: 'الرصد العام لليبيا', query: 'ليبيا OR حفتر OR "القيادة العامة"' },
    { name: 'القيادة العامة والقوات المسلحة', query: '"القيادة العامة للقوات المسلحة" OR "الجيش الوطني الليبي"' },
    { name: 'سيادة الرئيس صدام حفتر والمشير', query: '"صدام حفتر" OR "خليفة حفتر" OR "المشير حفتر"' },
    { name: 'الملف النفطي والميزانية', query: '"النفط الليبي" OR "مؤسسة النفط" OR "الميزانية الليبية"' },
    { name: 'البعثة الأممية والدبلوماسية', query: '"البعثة الأممية" OR "UNSMIL" OR "مجلس الأمن ليبيا"' },
    { name: 'طرابلس والغرب الليبي', query: '"طرابلس" OR "حكومة الدبيبة" OR "المجلس الرئاسي"' },
  ];

  const handleRunGoogleSearch = (q: string) => {
    if (onSearchGoogleNews) {
      onSearchGoogleNews(q);
    }
  };

  // Auto-determine strategic importance if not present
  const getStrategicImportance = (article: NewsArticle): StrategicImportanceType => {
    if (article.strategicImportance) return article.strategicImportance;
    const text = (article.title + ' ' + (article.snippet || '')).toLowerCase();
    if (text.includes('حفتر') || text.includes('القيادة العامة') || text.includes('اشتباك') || text.includes('جيش') || text.includes('نفط') || text.includes('unsmil') || text.includes('عاجل')) {
      return 'عالي الأهمية';
    }
    if (text.includes('سياسة') || text.includes('سفارة') || text.includes('اتفاق') || text.includes('مجلس')) {
      return 'متوسط';
    }
    return 'روتيني';
  };

  // Filter articles
  const filteredArticles = articles.filter(article => {
    if (onlyBookmarked && !article.isBookmarked) return false;
    if (selectedCategory !== 'الكل' && article.category !== selectedCategory) return false;
    if (selectedSentiment !== 'الكل' && article.sentiment !== selectedSentiment) return false;
    const imp = getStrategicImportance(article);
    if (selectedImportance !== 'الكل' && imp !== selectedImportance) return false;
    return true;
  });

  const handleCopyRow = (article: NewsArticle) => {
    const formattedDate = new Date(article.pubDate).toLocaleString('ar-LY');
    const rowText = `${formattedDate}\t${article.title}\t${article.source}\t${article.link}`;
    navigator.clipboard.writeText(rowText);
    setCopiedId(article.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSentimentBadge = (sentiment?: SentimentType) => {
    switch (sentiment) {
      case 'positive':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <ThumbsUp className="w-3 h-3 text-emerald-600" />
            إيجابي
          </span>
        );
      case 'negative':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            سلبي / تحذيري
          </span>
        );
      case 'neutral':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <Minus className="w-3 h-3 text-slate-500" />
            محايد
          </span>
        );
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'عسكري وأمني':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'سياسة':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'اقتصاد وطاقة':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'دبلوماسي وتدويل':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'شؤون محلية':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getImportanceBadge = (importance: StrategicImportanceType) => {
    switch (importance) {
      case 'عالي الأهمية':
      case 'عالي':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-700 bg-red-100 px-2 py-0.5 rounded-full border border-red-300">
            <Flame className="w-3 h-3 text-red-600 animate-pulse" />
            عالي الأهمية
          </span>
        );
      case 'متوسط':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-300">
            <ShieldAlert className="w-3 h-3 text-amber-600" />
            مهم استراتيجياً
          </span>
        );
      case 'اعتيادي':
      case 'روتيني':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
            خبر روتيني
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 font-['Tajawal',sans-serif]">
      {/* GOOGLE NEWS LIVE ENGINE CONNECTOR BANNER */}
      {!isGoogleBannerVisible ? (
        <div className="flex justify-between items-center bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-white shadow-sm">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200">محرك رصد أخبار جوجل (Google News)</span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.2 rounded">حي</span>
          </div>
          <button
            type="button"
            onClick={() => setIsGoogleBannerVisible(true)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer font-bold"
          >
            <span>عرض محاور الرصد الآلي والتحديث</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white shadow-xl space-y-4 relative">
          {/* Close/Hide Button */}
          <button
            type="button"
            onClick={() => setIsGoogleBannerVisible(false)}
            className="absolute top-3 left-3 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold"
            title="إخفاء لوحة التحكم بالرصد"
          >
            <span>إخفاء</span>
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 pl-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-amber-500 to-rose-500 p-0.5 flex items-center justify-center shadow-md">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Globe className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-amber-100">
                    محرك المتابعة الحي بـ أخبار جوجل (Google News Live Engine)
                  </h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400 animate-ping" />
                    ربط حي مباشر
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  رصد وتجميع المقالات الصحفية لحظة بلحظة مباشرة من محرك Google News الموثق
                </p>
              </div>
            </div>

            {/* Sync & Refresh Button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md self-start md:self-auto cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-slate-950 ${isLoading ? 'animate-spin' : ''}`} />
                <span>جلب تحديثات Google News الآن</span>
              </button>
            )}
          </div>

          {/* Preset Topics Row */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-extrabold text-slate-400 block">
              اختر أحد محاور المتابعة والرصد الآلي الفوري عبر أخبار جوجل:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {googleNewsPresets.map((preset) => {
                const isActive = currentQuery === preset.query;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleRunGoogleSearch(preset.query)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-102'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {preset.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-slate-800 text-white font-bold shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Secondary Controls (Sentiment, Importance & Bookmarked) */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Strategic Importance Filter */}
          <select
            value={selectedImportance}
            onChange={(e) => setSelectedImportance(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-800 px-2.5 py-1.5 rounded focus:outline-none focus:border-slate-400 cursor-pointer font-bold"
          >
            {importanceOptions.map((imp) => (
              <option key={imp.value} value={imp.value}>
                {imp.label}
              </option>
            ))}
          </select>

          {/* Sentiment Dropdown */}
          <select
            value={selectedSentiment}
            onChange={(e) => setSelectedSentiment(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-800 px-2.5 py-1.5 rounded focus:outline-none focus:border-slate-400 cursor-pointer"
          >
            {sentiments.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Bookmarked Filter Toggle */}
          <button
            onClick={() => setOnlyBookmarked(!onlyBookmarked)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
              onlyBookmarked
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${onlyBookmarked ? 'fill-white text-white' : ''}`} />
            <span>المحفوظات</span>
          </button>

        </div>

      </div>

      {/* Articles Count info */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>الأخبار الصحفية المرصودة: <strong className="text-slate-800 font-mono font-bold">{filteredArticles.length}</strong> من أصل <strong className="text-slate-800 font-mono">{articles.length}</strong></span>
        <span className="text-[11px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded flex items-center gap-1">
          <Globe className="w-3 h-3 text-slate-500" />
          مصادقة وسائل الإعلام العامة (Google News)
        </span>
      </div>

      {/* Articles List */}
      {filteredArticles.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded p-10 text-center text-slate-500 shadow-sm">
          <p className="text-base font-medium">لا توجد أخبار تطابق معايير التصفية المحددة.</p>
          <p className="text-xs text-slate-400 mt-1">جرب تغيير الأقسام أو الكلمات المفتاحية.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredArticles.map((article) => {
            const isAnalyzing = analyzingArticleId === article.id;
            const isCopied = copiedId === article.id;
            const importance = getStrategicImportance(article);

            return (
              <div
                key={article.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 transition-all shadow-sm hover:shadow group relative"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  
                  {/* Article Main Info */}
                  <div className="flex-1 space-y-2">
                    
                    {/* Header line: Credibility Indicator, Strategic Importance, Source, Date, Category */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      
                      {/* Visual Credibility Badge - General Media */}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                        <Globe className="w-3 h-3 text-slate-500" />
                        مصدر إعلامي عام
                      </span>

                      {/* Strategic Importance Badge */}
                      {getImportanceBadge(importance)}

                      <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {cleanText(article.source)}
                      </span>
                      
                      <span className="text-slate-500 flex items-center gap-1 font-mono text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(article.pubDate).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })} - {new Date(article.pubDate).toLocaleDateString('ar-LY')}
                      </span>

                      {article.category && (
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-medium border ${getCategoryColor(article.category)}`}>
                          {article.category}
                        </span>
                      )}

                      {getSentimentBadge(article.sentiment)}
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-slate-800 group-hover:text-slate-900 transition-colors leading-snug">
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline flex items-start gap-1.5"
                      >
                        <span>{cleanText(article.title)}</span>
                        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 flex-shrink-0 mt-1" />
                      </a>
                    </h2>

                    {/* Snippet / AI Summary with ReactMarkdown rendering fix */}
                    {article.summary ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-800 leading-relaxed space-y-1">
                        <div className="text-slate-900 font-bold mb-1 flex items-center gap-1.5 text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>تحليل وتفكيك الخبر بالذكاء الاصطناعي:</span>
                        </div>
                        <div className="markdown-body text-xs text-slate-800 leading-relaxed font-sans space-y-1">
                          <ReactMarkdown>{cleanText(article.summary)}</ReactMarkdown>
                        </div>
                      </div>
                    ) : article.snippet ? (
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {cleanText(article.snippet)}
                      </p>
                    ) : null}

                    {/* Matched Keywords */}
                    {article.keywordsMatched && article.keywordsMatched.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> الكلمات المطابقة:
                        </span>
                        {article.keywordsMatched.map((kw, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono"
                          >
                            #{kw}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>

                  {/* Actions Column */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 border-t md:border-t-0 border-slate-100 pt-2.5 md:pt-0">
                    
                    {/* Copy row for Google Sheets */}
                    <button
                      onClick={() => handleCopyRow(article)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all"
                      title="نسخ صف الجدول للصقه مباشرة في Google Sheets"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-700 font-bold">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>نسخ لشيت</span>
                        </>
                      )}
                    </button>

                    {/* AI Re-analyze */}
                    <button
                      onClick={() => onAnalyzeArticle(article)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-amber-600' : 'text-amber-600'}`} />
                      <span>{isAnalyzing ? 'جاري التحليل...' : 'تفكيك الخبر'}</span>
                    </button>

                    {/* Bookmark Toggle */}
                    <button
                      onClick={() => onToggleBookmark(article.id)}
                      className={`p-1.5 rounded transition-all border ${
                        article.isBookmarked
                          ? 'bg-slate-800 text-white border-slate-700'
                          : 'bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200'
                      }`}
                      title={article.isBookmarked ? 'إزالة من الأرشيف' : 'حفظ في الأرشيف'}
                    >
                      {article.isBookmarked ? (
                        <BookmarkCheck className="w-4 h-4 fill-white text-white" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>

                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};

