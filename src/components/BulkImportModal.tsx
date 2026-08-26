import React, { useState } from 'react';
import { 
  OfficialStatement, 
  OfficialAccount, 
  PopularMoodPost,
  ArticleCategory,
  StrategicImportanceType
} from '../types';
import { 
  Layers, 
  X, 
  Sparkles, 
  AlertCircle, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  RotateCcw, 
  Plus, 
  Building2, 
  Users2,
  FileText
} from 'lucide-react';

interface ExtractedPost {
  id: string;
  accountName: string;
  accountHandle?: string;
  content: string;
  pubDate?: string;
  title?: string;
}

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: OfficialAccount[];
  onAddStatement: (statement: OfficialStatement) => void;
  onAddPopularPost: (post: PopularMoodPost) => void;
  initialTargetSection?: 'official' | 'popular_mood';
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onAddStatement,
  onAddPopularPost,
  initialTargetSection = 'official'
}) => {
  const [targetSection, setTargetSection] = useState<'official' | 'popular_mood'>(initialTargetSection);
  const [platform, setPlatform] = useState<string>('X / Twitter');
  const [rawText, setRawText] = useState<string>('');
  
  // Wizard steps: 'input' | 'review' | 'processing' | 'done'
  const [step, setStep] = useState<'input' | 'review' | 'processing' | 'done'>('input');
  
  const [isParsingText, setIsParsingText] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Extracted list for review
  const [extractedPosts, setExtractedPosts] = useState<ExtractedPost[]>([]);
  
  // Progress state during deep AI analysis
  const [progress, setProgress] = useState<{ current: number; total: number; currentAccount: string }>({
    current: 0,
    total: 0,
    currentAccount: ''
  });
  
  const [completedCount, setCompletedCount] = useState<number>(0);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('input');
    setRawText('');
    setExtractedPosts([]);
    setParseError(null);
    setIsParsingText(false);
    setProgress({ current: 0, total: 0, currentAccount: '' });
  };

  const handleSectionChange = (section: 'official' | 'popular_mood') => {
    setTargetSection(section);
    if (section === 'popular_mood') {
      setPlatform('Facebook');
    } else {
      setPlatform('X / Twitter');
    }
  };

  // Step 1: Call AI to parse raw pasted text into individual posts
  const handleParseRawText = async () => {
    if (!rawText.trim()) {
      setParseError('يرجى لصق النص الخام المراد استيراده أولاً.');
      return;
    }

    setIsParsingText(true);
    setParseError(null);

    try {
      const res = await fetch('/api/news/parse-bulk-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: rawText.trim(),
          platform
        })
      });

      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.error || 'فشل تفكيك النص واستخراج المنشورات.');
      }

      if (!Array.isArray(data.posts) || data.posts.length === 0) {
        throw new Error('لم يتم العثور على أي منشورات واضحة في النص الملصوق. يرجى التأكد من محتوى النص.');
      }

      const formattedList: ExtractedPost[] = data.posts.map((p: any, idx: number) => ({
        id: `extracted-${Date.now()}-${idx}`,
        accountName: p.accountName || 'حساب غير محدد',
        accountHandle: p.accountHandle || `@${(p.accountName || 'account').replace(/\s+/g, '_')}`,
        content: p.content || '',
        pubDate: p.pubDate || new Date().toISOString().slice(0, 16),
        title: p.title || (p.content ? p.content.slice(0, 50) + '...' : 'منشور استيراد جماعي')
      }));

      setExtractedPosts(formattedList);
      setStep('review');
    } catch (err: any) {
      console.error('Error parsing bulk text:', err);
      setParseError(err.message || 'حدث خطأ أثناء الاتصال بالذكاء الاصطناعي لتفكيك النص.');
    } finally {
      setIsParsingText(false);
    }
  };

  // Delete an item during review
  const handleDeleteItem = (id: string) => {
    setExtractedPosts(prev => prev.filter(item => item.id !== id));
  };

  // Update item field during review
  const handleUpdateItem = (id: string, field: keyof ExtractedPost, value: string) => {
    setExtractedPosts(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Add blank item manually in review list
  const handleAddEmptyRow = () => {
    const newItem: ExtractedPost = {
      id: `extracted-manual-${Date.now()}`,
      accountName: '',
      accountHandle: '',
      content: '',
      pubDate: new Date().toISOString().slice(0, 16),
      title: ''
    };
    setExtractedPosts(prev => [...prev, newItem]);
  };

  // Step 3: Confirm and run deep AI analysis for each post sequentially
  const handleConfirmAndProcessAll = async () => {
    const validPosts = extractedPosts.filter(p => p.accountName.trim() && p.content.trim());
    if (validPosts.length === 0) {
      alert('لا توجد منشورات صالحة للاستيراد. يرجى إضافة اسم الحساب ونص المنشور.');
      return;
    }

    setStep('processing');
    const total = validPosts.length;
    setProgress({ current: 0, total, currentAccount: validPosts[0].accountName });

    const nowIso = new Date().toISOString();
    let countSuccess = 0;

    for (let i = 0; i < validPosts.length; i++) {
      const p = validPosts[i];
      setProgress({ current: i + 1, total, currentAccount: p.accountName });

      let summaryText = 'تم استيراد المنشور بنجاح عبر آلية الاستيراد الجماعي وإدراجه فوراً.';
      let categoryText: ArticleCategory = 'سياسة';
      let sentimentVal: 'positive' | 'neutral' | 'negative' = 'neutral';
      let impactVal: StrategicImportanceType = 'متوسط';

      // Call Gemini Deep Analysis for this post
      try {
        const res = await fetch('/api/news/analyze-article', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `منشور صادر عن: ${p.accountName}`,
            snippet: p.content,
            source: p.accountName
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && data.analysis) {
            if (data.analysis.summary) summaryText = data.analysis.summary;
            if (data.analysis.category) categoryText = data.analysis.category;
            if (data.analysis.sentiment) sentimentVal = data.analysis.sentiment;
            if (data.analysis.importanceLevel) {
              if (data.analysis.importanceLevel.includes('مرتفع')) impactVal = 'عالي الأهمية';
              else if (data.analysis.importanceLevel.includes('متوسط')) impactVal = 'متوسط';
            }
          }
        }
      } catch (err) {
        console.warn(`Auto AI analysis failed for item ${i + 1}, using default fallback:`, err);
      }

      const pubDateIso = p.pubDate && !isNaN(new Date(p.pubDate).getTime())
        ? new Date(p.pubDate).toISOString()
        : nowIso;

      if (targetSection === 'official') {
        const matchedAccount = accounts.find(a => 
          a.name.toLowerCase().includes(p.accountName.toLowerCase()) || 
          p.accountName.toLowerCase().includes(a.name.toLowerCase())
        );

        const statement: OfficialStatement = {
          id: `stmt-bulk-${Date.now()}-${i}`,
          accountId: matchedAccount ? matchedAccount.id : `acc-bulk-${Date.now()}-${i}`,
          accountName: p.accountName.trim(),
          accountHandle: p.accountHandle?.trim() || `@${p.accountName.trim().replace(/\s+/g, '_')}`,
          accountRole: matchedAccount ? matchedAccount.role : 'جهة / شخصية مرصودة عبر الاستيراد الجماعي',
          entityType: matchedAccount ? matchedAccount.entityType : 'sovereignty_body',
          platform,
          verified: true,
          content: p.content.trim(),
          title: p.title?.trim() || `منشور ${platform} - ${p.accountName}`,
          pubDate: pubDateIso,
          entryDate: nowIso,
          link: 'https://social.media',
          sourceReliability: 'حساب رسمي موثق',
          status: 'published', // Published immediately without review
          tags: ['استيراد_جماعي', platform],
          sentiment: sentimentVal,
          impactLevel: impactVal,
          category: categoryText,
          summary: summaryText
        };

        onAddStatement(statement);
      } else {
        const popularPost: PopularMoodPost = {
          id: `pm-bulk-${Date.now()}-${i}`,
          accountName: p.accountName.trim(),
          accountHandle: p.accountHandle?.trim() || `@${p.accountName.trim().replace(/\s+/g, '_')}`,
          platform,
          title: p.title?.trim() || `تفاعل شعبي - ${p.accountName}`,
          content: p.content.trim(),
          pubDate: pubDateIso,
          entryDate: nowIso,
          link: 'https://facebook.com',
          sourceReliability: 'حساب معروف وموثوق نسبيًا',
          potentialVirality: 'متوسط الانتشار',
          publicTensionLevel: 'توتر متوسط',
          status: 'published', // Published immediately without review
          tags: ['استيراد_جماعي', 'تفاعل_رقمي'],
          summary: summaryText
        };

        onAddPopularPost(popularPost);
      }

      countSuccess++;
    }

    setCompletedCount(countSuccess);
    setStep('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fade-in font-['Tajawal',sans-serif]">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-amber-100">
                  مُعالج الاستيراد الجماعي الذكي
                </h3>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md">
                  الذكاء الاصطناعي
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تفكيك الكتل النصية المنسوخة من الشبكات الاجتماعية وتحليلها دفعة واحدة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Step Views */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 bg-slate-50/50">

          {/* Target Section Selector */}
          {step === 'input' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                تحديد القسم المستهدف للاستيراد:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSectionChange('official')}
                  className={`p-3 rounded-xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                    targetSection === 'official'
                      ? 'bg-slate-900 text-amber-300 border-amber-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-xs block">1. تصريحات وبيانات رسمية</span>
                    <span className="text-[11px] opacity-80 font-normal">
                      استيراد منشورات الحسابات السيادية، البعثات الأممية، والقادة
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSectionChange('popular_mood')}
                  className={`p-3 rounded-xl border text-right transition-all flex items-start gap-3 cursor-pointer ${
                    targetSection === 'popular_mood'
                      ? 'bg-stone-900 text-amber-300 border-amber-500 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Users2 className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold text-xs block">2. رصد المزاج الشعبي وتفاعل فيسبوك</span>
                    <span className="text-[11px] opacity-80 font-normal">
                      استيراد منشورات وتفاعلات الصفحات العامة والرأي العام
                    </span>
                  </div>
                </button>
              </div>

              {/* Platform selection */}
              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs font-bold text-slate-700">المنصة الأصلية:</span>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold px-3 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="X / Twitter">X / Twitter</option>
                  <option value="Facebook">فيسبوك / Facebook</option>
                  <option value="Telegram">تليغرام / Telegram</option>
                  <option value="موقع إخباري">موقع إخباري / تصريح صحفي</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 1: RAW TEXT INPUT */}
          {step === 'input' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>الصق النص الخام الكامل هنا (كتلة نصية شاملة):</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  يدعم عدة منشورات متتالية مع أرقام التفاعلات والتصنيفات
                </span>
              </div>

              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={`الصق هنا النص الخام المنسوخ مباشرة من المتصفح...\n\nمثال:\nبعثة الأمم المتحدة للدعم في ليبيا @UNSMILibya · 3س\nتتابع البعثة الأممية بقلق التطورات الجارية في العاصمة طرابلس وتدعو كافة الأطراف إلى ضبط النفس واللجوء للحوار...\n140 إعجابات  50 إعادة تغريد\n\nالمشير خليفة حفتر\nتؤكد القيادة العامة للقوات المسلحة الليبية جاهزيتها الكاملة لتأمين الحقول والمنشآت النفطية وحماية سيادة الدولة...\n850 إعجاب  230 مشاركة`}
                rows={11}
                className="w-full bg-white border-2 border-slate-300 focus:border-amber-500 rounded-xl p-3.5 text-xs text-slate-900 font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-inner"
              />

              {parseError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <p className="text-[11px] text-slate-500 leading-normal max-w-lg">
                  💡 سيقوم نموذج الذكاء الاصطناعي بفصل كل منشور، وتحديد اسم الناشر والنص الفعلي واستبعاد أرقام الإعجابات وعناصر الأزرار والواجهة.
                </p>

                <button
                  type="button"
                  onClick={handleParseRawText}
                  disabled={isParsingText || !rawText.trim()}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isParsingText ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>جاري تفكيك النص واستخراج المنشورات...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>تحليل واستيراد الذكاء الاصطناعي</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: REVIEW EXTRACTED POSTS LIST */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 font-bold flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <span>
                    تم استخراج <strong>({extractedPosts.length})</strong> منشورات من النص. يمكنك مراجعتها، تعديل البيانات، أو حذف أي عنصر واجهة طفيل تم التقاطه خطأً:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-amber-800 hover:text-amber-950 underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>إعادة اللصق</span>
                </button>
              </div>

              {/* Table / Cards List */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {extractedPosts.map((post, idx) => (
                  <div 
                    key={post.id}
                    className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-amber-400 transition-all space-y-2.5 relative group"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 text-xs font-black flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={post.accountName}
                          onChange={(e) => handleUpdateItem(post.id, 'accountName', e.target.value)}
                          placeholder="اسم الناشر / الحساب..."
                          className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-black text-slate-900 w-full max-w-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <input
                          type="text"
                          value={post.accountHandle || ''}
                          onChange={(e) => handleUpdateItem(post.id, 'accountHandle', e.target.value)}
                          placeholder="@المعرف..."
                          className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-600 w-32 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 hidden sm:inline-block"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-medium">تاريخ النشر:</span>
                        <input
                          type="datetime-local"
                          value={post.pubDate ? post.pubDate.slice(0, 16) : ''}
                          onChange={(e) => handleUpdateItem(post.id, 'pubDate', e.target.value)}
                          className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-700 focus:bg-white focus:outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(post.id)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                          title="حذف هذا المنشور من القائمة"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                          <span className="hidden sm:inline">حذف</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <textarea
                        value={post.content}
                        onChange={(e) => handleUpdateItem(post.id, 'content', e.target.value)}
                        rows={3}
                        placeholder="نص المنشور..."
                        className="w-full bg-slate-50/80 border border-slate-200 focus:border-amber-500 rounded-lg p-2.5 text-xs text-slate-800 font-sans leading-relaxed focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Actions for Review */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAddEmptyRow}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-slate-300 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-slate-600" />
                  <span>إضافة منشور يدوي إضافي للقائمة</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    إلغاء وإعادة اللصق
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmAndProcessAll}
                    disabled={extractedPosts.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-200" />
                    <span>تأكيد الاستيراد وتشغيل التحليل المعمق ({extractedPosts.length})</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PROGRESS INDICATOR DURING DEEP ANALYSIS */}
          {step === 'processing' && (
            <div className="py-8 px-4 text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center mx-auto text-amber-600 animate-pulse shadow-inner">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-base font-black text-slate-900">
                  جارٍ تحليل المنشورات بواسطة الذكاء الاصطناعي...
                </h4>
                <p className="text-xs text-slate-600 font-medium">
                  جارٍ تنفيذ التحليل الاستراتيجي المعمق لكل منشور وتعيين الملخص والتصنيف ومستوى الأهمية...
                </p>
              </div>

              {/* Progress Bar Container */}
              <div className="max-w-lg mx-auto space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>جارٍ معالجة المنشور {progress.current} من {progress.total}...</span>
                  <span className="text-amber-600 font-black">
                    {Math.round((progress.current / (progress.total || 1)) * 100)}%
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden shadow-inner p-0.5 border border-slate-300">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-600 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${Math.round((progress.current / (progress.total || 1)) * 100)}%` }}
                  />
                </div>

                {progress.currentAccount && (
                  <p className="text-[11px] text-slate-500 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200 font-mono">
                    الحساب الحالي: <strong>{progress.currentAccount}</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS DONE VIEW */}
          {step === 'done' && (
            <div className="py-8 px-4 text-center space-y-5 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-600 shadow-md">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-lg font-black text-slate-900">
                  تم الاستيراد الجماعي بنجاح!
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  تم تحليل وإضافة <strong>({completedCount})</strong> منشورات بنجاح إلى جدول <strong>"بانتظار المراجعة"</strong> داخل واجهة المُدخِل.
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 max-w-lg mx-auto text-xs text-amber-900 text-right leading-relaxed font-semibold">
                ⚠️ <strong>تنبيه الأمان والاعتماد:</strong> جميع المنشورات المستوردة تم إدخالها بحالة <strong>"بانتظار المراجعة"</strong> ومخفية عن العرض الرئاسي، ويمكنك مراجعتها وتدقيقها الآن في تبويب "بانتظار المراجعة" ثم الضغط على "نشر للعرض الرئاسي".
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-5 py-2.5 rounded-xl border border-slate-300 transition-all cursor-pointer"
                >
                  استيراد دفعة جديدة
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="bg-slate-900 hover:bg-slate-800 text-amber-400 font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  إغلاق والانتقال لجدول المراجعة
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 p-3 sm:p-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>محرك التحليل الذكي للقيادة العامة — متصل بـ Firestore</span>
          </div>

          <span className="font-mono text-slate-500">v2.4 Bulk Import Protocol</span>
        </div>

      </div>
    </div>
  );
};
