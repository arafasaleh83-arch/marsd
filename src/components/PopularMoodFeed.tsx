import React, { useState, useEffect, useMemo } from 'react';
import { PopularMoodPost, StreetToneType, StreetImportanceType, PotentialViralityType, PublicTensionLevelType } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Users2, 
  AlertTriangle, 
  Flame, 
  TrendingUp, 
  Clock, 
  ExternalLink, 
  Bookmark, 
  Plus, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Share2, 
  HelpCircle,
  Shield,
  Activity,
  Zap,
  Tag,
  Calendar,
  Layers,
  RefreshCw,
  FileText,
  Copy,
  Check,
  Send,
  MessageSquare,
  Building2,
  AlertCircle
} from 'lucide-react';

interface PopularMoodFeedProps {
  posts: PopularMoodPost[];
  onToggleBookmark: (id: string) => void;
  onAnalyzePost: (post: PopularMoodPost) => void;
  onAddPost: () => void;
  onDeletePost: (id: string) => void;
  onPublishPost: (id: string) => void;
  onOpenBulkImport?: () => void;
  onRefreshStreetPulse?: () => Promise<void>;
  isAnalyzingId?: string | null;
  isRefreshing?: boolean;
}

export const PopularMoodFeed: React.FC<PopularMoodFeedProps> = ({
  posts,
  onToggleBookmark,
  onAnalyzePost,
  onAddPost,
  onDeletePost,
  onPublishPost,
  onOpenBulkImport,
  onRefreshStreetPulse,
  isAnalyzingId,
  isRefreshing
}) => {
  const { role } = useAuth();
  const isEditor = role === 'editor';

  const [activeTab, setActiveTab] = useState<'published' | 'pending_review'>('published');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedToneFilter, setSelectedToneFilter] = useState<string>('all');
  const [selectedImportanceFilter, setSelectedImportanceFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // 3-Line Executive Street Report State
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [streetReport, setStreetReport] = useState<{
    line1: string;
    line2: string;
    line3: string;
  }>({
    line1: '1. **النبرة العامة السائدة ومستوى الاحتقان:** يسود الشارع مزيج من الترقب المشوب بالاحتقان الاقتصادي (نحو 65% نبرة معارضة وتحريضية مقابل 35% نبرة داعمة ومحايدة)، مع تركيز عالي على أزمة السيولة في المصارف وسعر صرف الدينار.',
    line2: '2. **أبرز التوجهات والقضايا المحركة للرأي العام:** تتمحور النقاشات الميدانية حول إجراءات مصرف ليبيا المركزي، الترتيبات الأمنية في المنطقة الغربية، ومشاريع الإعمار والاستقرار الأمني في المنطقة الشرقية والجنوب.',
    line3: '3. **الخلاصة والمآل التقديري:** يُوصى بتكثيف الرصد الاستباقي لدعوات التحشيد في الساحل الغربي، مع تعزيز الخطاب الإعلامي التوعوي الإيجابي حول استقرار الإمدادات والمشاريع الخدمية لامتصاص التوتر.'
  });

  // All posts are considered active and published immediately without review
  const publishedPosts = posts;
  const pendingPosts: PopularMoodPost[] = [];

  // Compute tone for a post if not explicitly stored
  const resolvePostTone = (post: PopularMoodPost): StreetToneType => {
    if (post.tone) return post.tone;
    const content = (post.content + ' ' + (post.summary || '')).toLowerCase();
    if (/تحريض|فتنة|تأجيج|استفزاز|تهديد|إغلاق الطريق|اقتحام/i.test(content) || post.publicTensionLevel === 'احتقان شديد') {
      return 'تحريضي';
    }
    if (/إشادة|دعم|ارتياح|تأييد|نجاح|استقرار|إعمار/i.test(content) || post.publicTensionLevel === 'إيجابي') {
      return 'داعم';
    }
    if (/تذمر|احتقان|أزمة|غلاء|تأخر|انقطاع|سخط|طوابير/i.test(content) || post.publicTensionLevel === 'توتر مرتفع') {
      return 'معارض';
    }
    return 'محايد';
  };

  // Compute importance for a post if not explicitly stored
  const resolvePostImportance = (post: PopularMoodPost): StreetImportanceType => {
    if (post.importance) return post.importance;
    const content = (post.content + ' ' + (post.summary || '')).toLowerCase();
    if (post.potentialVirality === 'واسع الانتشار جداً' || /إغلاق|نفط|مصرف مركزي|طوارئ|قوات مسلحة|اشتباك/i.test(content)) {
      return 'مرتفع';
    }
    if (post.potentialVirality === 'واسع الانتشار' || /وقود|أسعار|مرتبات|بلدية/i.test(content)) {
      return 'متوسط';
    }
    return 'عادي';
  };

  // Compute entities mentioned for a post if not explicitly stored
  const resolvePostEntities = (post: PopularMoodPost): string[] => {
    if (post.mentionedEntities && post.mentionedEntities.length > 0) return post.mentionedEntities;
    if (post.tags && post.tags.length > 0) return post.tags;
    const content = post.content || '';
    const entities: string[] = [];
    if (/حفتر|القيادة العامة|القوات المسلحة/i.test(content)) entities.push('القيادة العامة للقوات المسلحة');
    if (/المصرف المركزي|المركزي|الكبير/i.test(content)) entities.push('مصرف ليبيا المركزي');
    if (/حكومة|الدبيبة|حماد/i.test(content)) entities.push('الحكومة');
    if (/المجلس الرئاسي|المنفي/i.test(content)) entities.push('المجلس الرئاسي');
    if (/الداخلية|الشرطة|مديرية أمن/i.test(content)) entities.push('الأجهزة الأمنية والشرطية');
    if (/النفط|الوقود|سوناطراك|مليتة/i.test(content)) entities.push('المؤسسة الوطنية للنفط');
    if (entities.length === 0) entities.push('الشأن العام الليبي');
    return entities;
  };

  // Filter posts based on user search and filters
  const currentTabPosts = activeTab === 'pending_review' ? pendingPosts : publishedPosts;
  const filteredPosts = useMemo(() => {
    return currentTabPosts.filter(p => {
      const tone = resolvePostTone(p);
      const importance = resolvePostImportance(p);
      const entities = resolvePostEntities(p);
      const publisher = p.publisher || p.accountName || '';

      const matchesSearch = 
        publisher.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.executiveSummary && p.executiveSummary.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.title && p.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        entities.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesTone = selectedToneFilter === 'all' || tone === selectedToneFilter;
      const matchesImportance = selectedImportanceFilter === 'all' || importance === selectedImportanceFilter;

      return matchesSearch && matchesTone && matchesImportance;
    });
  }, [currentTabPosts, searchTerm, selectedToneFilter, selectedImportanceFilter]);

  // Format date helper
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('ar-LY', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  // Copy card handler
  const handleCopyCard = (post: PopularMoodPost) => {
    const publisher = post.publisher || post.accountName;
    const tone = resolvePostTone(post);
    const importance = resolvePostImportance(post);
    const entities = resolvePostEntities(post);
    const summary = post.executiveSummary || post.summary || post.content;

    const textToCopy = `📌 [رصد حالة الشارع - فيسبوك]
• الناشر: ${publisher} (${post.accountHandle})
• التاريخ: ${formatDate(post.pubDate)}
• نبرة المحتوى: ${tone}
• مستوى الأهمية: ${importance}
• الملخص التنفيذي: ${summary}
• الجهات والشخصيات المذكورة: ${entities.join('، ')}
• الرابط: ${post.link}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedId(post.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy 3-line Report handler
  const handleCopyReport = () => {
    const fullReportText = `📊 [تقرير موجز: النبرة العامة للشارع والتوجهات الرئيسية]
${streetReport.line1}
${streetReport.line2}
${streetReport.line3}`;

    navigator.clipboard.writeText(fullReportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Generate / Refresh AI 3-Line Report via Server
  const handleGenerateAIReport = async () => {
    if (filteredPosts.length === 0) return;
    setIsGeneratingReport(true);
    try {
      const res = await fetch('/api/street-pulse/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: filteredPosts.slice(0, 15) })
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setStreetReport({
          line1: data.report.line1_toneAndTension.startsWith('1.') ? data.report.line1_toneAndTension : `1. **النبرة العامة السائدة ومستوى الاحتقان:** ${data.report.line1_toneAndTension}`,
          line2: data.report.line2_keyDriversAndTopics.startsWith('2.') ? data.report.line2_keyDriversAndTopics : `2. **أبرز التوجهات والقضايا المحركة للرأي العام:** ${data.report.line2_keyDriversAndTopics}`,
          line3: data.report.line3_proactiveConclusion.startsWith('3.') ? data.report.line3_proactiveConclusion : `3. **الخلاصة والمآل التقديري:** ${data.report.line3_proactiveConclusion}`
        });
      }
    } catch (err) {
      console.error('Failed to generate AI street pulse report:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Badges for Tone (تحريضي / داعم / معارض / محايد)
  const getToneBadge = (tone: StreetToneType) => {
    switch (tone) {
      case 'تحريضي':
        return { 
          bg: 'bg-rose-950/90 text-rose-200 border-rose-600 shadow-sm shadow-rose-900/50 animate-pulse', 
          icon: AlertTriangle, 
          label: '🚨 تحريضي' 
        };
      case 'معارض':
        return { 
          bg: 'bg-amber-950 text-amber-200 border-amber-600', 
          icon: Flame, 
          label: '⚠️ معارض' 
        };
      case 'داعم':
        return { 
          bg: 'bg-emerald-950 text-emerald-200 border-emerald-600', 
          icon: Sparkles, 
          label: '✨ داعم' 
        };
      default:
        return { 
          bg: 'bg-slate-900 text-slate-200 border-slate-600', 
          icon: Activity, 
          label: '⚖️ محايد' 
        };
    }
  };

  // Badges for Importance (مرتفع / متوسط / عادي)
  const getImportanceBadge = (importance: StreetImportanceType) => {
    switch (importance) {
      case 'مرتفع':
        return { 
          bg: 'bg-red-900/80 text-red-100 border-red-500 font-black', 
          label: '🔴 عالي / مرتفع' 
        };
      case 'متوسط':
        return { 
          bg: 'bg-amber-900/80 text-amber-100 border-amber-500 font-bold', 
          label: '🟡 متوسط الأهمية' 
        };
      default:
        return { 
          bg: 'bg-stone-800/90 text-stone-300 border-stone-600 font-medium', 
          label: '⚪ عادي / روتيني' 
        };
    }
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-stone-950 via-stone-900 to-amber-950 text-amber-50 p-5 sm:p-7 shadow-2xl border-2 border-amber-500/40 relative overflow-hidden font-['Tajawal',sans-serif] space-y-6">
      
      {/* Decorative Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-amber-500/20">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shadow-inner flex-shrink-0">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-amber-100 tracking-tight">
                المحرك الذكي لرصد حالة الشارع والنبض الشعبي
              </h2>
              <span className="bg-blue-900/60 text-blue-300 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-blue-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
                <span>رصد فيسبوك الميداني (JSON Live API)</span>
              </span>
            </div>
            <p className="text-xs text-amber-200/80 mt-1 max-w-2xl leading-relaxed">
              تحليل مباشر لمنشورات وتفاعلات الشارع الليبي عبر الرابط الذكي لتحليل النبرة (تحريضي/داعم/معارض/محايد) ومستوى الأهمية والجهات المذكورة.
            </p>
          </div>
        </div>

        {/* Live Refresh & Management Controls */}
        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          {onRefreshStreetPulse && (
            <button
              onClick={onRefreshStreetPulse}
              disabled={isRefreshing}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-amber-500/20 cursor-pointer disabled:opacity-50"
              title="جلب وتحديث منشورات الشارع مباشرة من رابط Google Apps Script"
            >
              <RefreshCw className={`w-4 h-4 text-stone-950 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'جاري جلب البيانات...' : 'تحديث من رابط الرصد الحي'}</span>
            </button>
          )}

          {isEditor && (
            <>
              <button
                onClick={onAddPost}
                className="bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md border border-stone-700 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>إضافة رصد يدوي</span>
              </button>

              {onOpenBulkImport && (
                <button
                  onClick={onOpenBulkImport}
                  className="bg-stone-800 hover:bg-stone-700 text-amber-300 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all border border-amber-500/30 cursor-pointer"
                  title="استيراد كتلة منشورات دفعة واحدة"
                >
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>استيراد جماعي</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Connected API Status Strip */}
      <div className="relative z-10 bg-stone-950/80 border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-amber-300">
          <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
          <span className="font-bold">مصدر تغذية الرصد:</span>
          <span className="font-mono text-[11px] text-amber-200/70 bg-stone-900 px-2 py-0.5 rounded border border-stone-800 max-w-xs sm:max-w-md truncate">
            https://script.google.com/macros/s/AKfycbx_kjT1zMKyPcSg-knU40xN9dpLox-Qdo-ULf3m2LLnRY9rb5eco08vfy_VDNTWiyQN/exec
          </span>
        </div>
        <div className="flex items-center gap-3 text-amber-200/90 text-[11px]">
          <span>إجمالي المنشورات المرصودة: <strong className="text-amber-300 font-bold">{posts.length}</strong></span>
          <span>•</span>
          <span>المعروض حالياً: <strong className="text-amber-300 font-bold">{filteredPosts.length}</strong></span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="relative z-10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-stone-900/90 p-3 rounded-xl border border-amber-500/20">
        
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-amber-400/60 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث في الناشر، الملخص التنفيذي، أو الجهات والشخصيات المذكورة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-stone-950 text-amber-100 placeholder-amber-500/50 text-xs rounded-xl pr-9 pl-4 py-2 border border-amber-500/30 focus:outline-none focus:border-amber-400"
          />
        </div>

        {/* Tone Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-amber-300/80 font-bold whitespace-nowrap">النبرة:</span>
          <select
            value={selectedToneFilter}
            onChange={(e) => setSelectedToneFilter(e.target.value)}
            className="bg-stone-950 text-amber-200 text-xs rounded-xl px-3 py-2 border border-amber-500/30 focus:outline-none focus:border-amber-400 font-bold cursor-pointer"
          >
            <option value="all">جميع النبرات</option>
            <option value="تحريضي">🚨 تحريضي</option>
            <option value="معارض">⚠️ معارض</option>
            <option value="داعم">✨ داعم</option>
            <option value="محايد">⚖️ محايد</option>
          </select>
        </div>

        {/* Importance Filter */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-amber-300/80 font-bold whitespace-nowrap">الأهمية:</span>
          <select
            value={selectedImportanceFilter}
            onChange={(e) => setSelectedImportanceFilter(e.target.value)}
            className="bg-stone-950 text-amber-200 text-xs rounded-xl px-3 py-2 border border-amber-500/30 focus:outline-none focus:border-amber-400 font-bold cursor-pointer"
          >
            <option value="all">جميع مستويات الأهمية</option>
            <option value="مرتفع">🔴 مرتفع / عالي</option>
            <option value="متوسط">🟡 متوسط</option>
            <option value="عادي">⚪ عادي</option>
          </select>
        </div>

      </div>

      {/* Empty State */}
      {filteredPosts.length === 0 && (
        <div className="relative z-10 text-center py-12 bg-stone-900/50 rounded-xl border border-dashed border-amber-500/30 p-6">
          <HelpCircle className="w-10 h-10 text-amber-500/40 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-amber-200">لا توجد منشورات رصد مطابقة للمحددات</h3>
          <p className="text-xs text-amber-400/60 mt-1">جرّب تغيير كلمات البحث أو فلتر النبرة ومستوى الأهمية.</p>
        </div>
      )}

      {/* 2. THE STREET MONITORING CARDS LIST (بطاقات الرصد) */}
      <div className="relative z-10 grid grid-cols-1 gap-5">
        {filteredPosts.map((post) => {
          const publisher = post.publisher || post.accountName;
          const tone = resolvePostTone(post);
          const importance = resolvePostImportance(post);
          const entities = resolvePostEntities(post);
          const executiveSummary = post.executiveSummary || post.summary || post.content;
          const toneBadge = getToneBadge(tone);
          const importanceBadge = getImportanceBadge(importance);

          return (
            <div
              key={post.id}
              className="rounded-2xl p-5 sm:p-6 bg-stone-900/95 border-2 border-amber-500/30 hover:border-amber-400/60 transition-all shadow-xl backdrop-blur-md relative overflow-hidden space-y-4"
            >
              
              {/* Top Bar: Publisher, Date & Core Metric Badges */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-amber-500/20">
                
                {/* 📌 الناشر والتاريخ */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-400/40 flex items-center justify-center text-blue-400 font-extrabold text-sm flex-shrink-0 shadow-inner">
                    fb
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-amber-400 font-bold">📌 الناشر:</span>
                      <h4 className="text-sm font-black text-amber-100">
                        {publisher}
                      </h4>
                      <span className="text-[11px] text-amber-400/60 font-mono">({post.accountHandle})</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-amber-300/70 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400/60" />
                      <span>التاريخ: {formatDate(post.pubDate)}</span>
                    </div>
                  </div>
                </div>

                {/* 🎭 نبرة المحتوى + ⚠️ مستوى الأهمية */}
                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                  
                  {/* 🎭 نبرة المحتوى */}
                  <div className={`px-3 py-1 rounded-xl border text-xs font-black flex items-center gap-1.5 shadow-sm ${toneBadge.bg}`}>
                    <span className="text-[10px] opacity-80">نبرة المحتوى:</span>
                    <span>{toneBadge.label}</span>
                  </div>

                  {/* ⚠️ مستوى الأهمية */}
                  <div className={`px-3 py-1 rounded-xl border text-xs flex items-center gap-1.5 shadow-sm ${importanceBadge.bg}`}>
                    <span className="text-[10px] opacity-80">الأهمية:</span>
                    <span>{importanceBadge.label}</span>
                  </div>

                </div>

              </div>

              {/* نص المنشور */}
              {post.content && (
                <div className="bg-stone-950/70 rounded-xl p-3.5 border border-stone-800/80 text-xs text-amber-100/95 leading-relaxed font-sans font-medium whitespace-pre-wrap">
                  {post.content}
                </div>
              )}

              {/* 🏷️ الجهات والشخصيات المذكورة */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs text-amber-300 font-bold flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>🏷️ الجهات والشخصيات المذكورة:</span>
                </span>
                {entities.map((entity, eIdx) => (
                  <span 
                    key={eIdx}
                    className="bg-stone-950 text-amber-200 border border-amber-500/30 text-xs px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 hover:border-amber-400 transition-colors"
                  >
                    <span>#{entity}</span>
                  </span>
                ))}
              </div>

              {/* Card Footer: 🔗 رابط المنشور الأصلي & Actions */}
              <div className="pt-3 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                
                {/* 🔗 رابط المنشور الأصلي */}
                <div className="flex items-center gap-2">
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                    title="فتح المنشور الأصلي على فيسبوك"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>🔗 رابط المنشور الأصلي على فيسبوك</span>
                  </a>

                  <button
                    onClick={() => handleCopyCard(post)}
                    className="bg-stone-950 hover:bg-stone-800 text-amber-300 border border-amber-500/30 px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="نسخ تفاصيل بطاقة الرصد"
                  >
                    {copiedId === post.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300 font-bold">تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ البطاقة</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Right Side Tools */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onToggleBookmark(post.id)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      post.isBookmarked
                        ? 'bg-amber-500 text-stone-950 border-amber-400'
                        : 'bg-stone-950 text-amber-300 border-amber-500/20 hover:text-white'
                    }`}
                    title="حفظ في المفضلة"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>

                  {isEditor && (
                    <button
                      onClick={() => onDeletePost(post.id)}
                      className="p-2 rounded-xl bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-800 transition-colors cursor-pointer"
                      title="حذف من السجل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

              </div>

            </div>
          );
        })}
      </div>

      {/* 3. FINAL 3-LINE EXECUTIVE REPORT SECTION (تقرير موجز في 3 أسطر) */}
      <div className="relative z-10 rounded-2xl bg-gradient-to-r from-amber-950/90 via-stone-900 to-stone-950 border-2 border-amber-400/80 p-6 shadow-2xl space-y-4">
        
        {/* Report Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-black shadow-md flex-shrink-0">
              📊
            </div>
            <div>
              <h3 className="text-base font-black text-amber-100">
                تقرير موجز: النبرة العامة للشارع والتوجهات الرئيسية (3 أسطر)
              </h3>
              <p className="text-[11px] text-amber-300/80">
                خلاصة استخباراتية وتحليلية دقيقة لحالة الرأي العام والنبض الشعبي بناءً على الرصد الميداني الحالي.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAIReport}
              disabled={isGeneratingReport}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
              title="إعادة تحليل وتوليد التقرير الثلاثي بواسطة الذكاء الاصطناعي"
            >
              <Sparkles className={`w-3.5 h-3.5 text-stone-950 ${isGeneratingReport ? 'animate-spin' : ''}`} />
              <span>{isGeneratingReport ? 'جاري التحليل...' : 'إعادة توليد التقرير (AI)'}</span>
            </button>

            <button
              onClick={handleCopyReport}
              className="bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-500/40 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="نسخ التقرير الموجز المكون من 3 أسطر"
            >
              {copiedReport ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300 font-bold">تم النسخ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ التقرير</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* The 3 Lines Container */}
        <div className="bg-stone-950/80 rounded-xl p-4 sm:p-5 border border-amber-500/30 space-y-3.5 text-xs sm:text-sm font-sans leading-relaxed">
          
          {/* Line 1 */}
          <div className="flex items-start gap-2.5 bg-stone-900/60 p-3 rounded-lg border border-amber-500/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
            <p className="text-amber-100 font-medium">
              <strong className="text-amber-300 font-black">1. النبرة العامة السائدة ومستوى الاحتقان:</strong>{' '}
              {streetReport.line1.replace(/^1\.\s*\*\*النبرة العامة السائدة ومستوى الاحتقان:\*\*\s*/, '')}
            </p>
          </div>

          {/* Line 2 */}
          <div className="flex items-start gap-2.5 bg-stone-900/60 p-3 rounded-lg border border-amber-500/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
            <p className="text-amber-100 font-medium">
              <strong className="text-amber-300 font-black">2. أبرز التوجهات والقضايا المحركة للرأي العام:</strong>{' '}
              {streetReport.line2.replace(/^2\.\s*\*\*أبرز التوجهات والقضايا المحركة للرأي العام:\*\*\s*/, '')}
            </p>
          </div>

          {/* Line 3 */}
          <div className="flex items-start gap-2.5 bg-stone-900/60 p-3 rounded-lg border border-amber-500/10">
            <span className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
            <p className="text-amber-100 font-medium">
              <strong className="text-amber-300 font-black">3. الخلاصة والمآل التقديري:</strong>{' '}
              {streetReport.line3.replace(/^3\.\s*\*\*الخلاصة والمآل التقديري:\*\*\s*/, '')}
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
