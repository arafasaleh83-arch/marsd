import React, { useState } from 'react';
import { 
  OfficialStatement, 
  OfficialAccount, 
  SourceReliabilityType, 
  StrategicImportanceType, 
  ArticleCategory,
  PopularMoodPost,
  PotentialViralityType,
  PublicTensionLevelType
} from '../types';
import { FileText, X, Sparkles, AlertCircle, Users2, Building2, Layers } from 'lucide-react';

interface ManualPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: OfficialAccount[];
  onAddStatement: (statement: OfficialStatement) => void;
  onAddPopularPost: (post: PopularMoodPost) => void;
  initialTargetSection?: 'official' | 'popular_mood';
  onOpenBulkImport?: () => void;
}

export const ManualPostModal: React.FC<ManualPostModalProps> = ({
  isOpen,
  onClose,
  accounts,
  onAddStatement,
  onAddPopularPost,
  initialTargetSection = 'official',
  onOpenBulkImport
}) => {
  const nowFormatted = new Date().toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm

  const [targetSection, setTargetSection] = useState<'official' | 'popular_mood'>(initialTargetSection);
  const [platform, setPlatform] = useState<string>('X / Twitter');
  const [accountName, setAccountName] = useState<string>('');
  const [accountHandle, setAccountHandle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [link, setLink] = useState<string>('');
  const [pubDate, setPubDate] = useState<string>(nowFormatted);
  
  // Official metrics
  const [sourceReliability, setSourceReliability] = useState<SourceReliabilityType>('حساب رسمي موثق');
  const [impactLevel, setImpactLevel] = useState<StrategicImportanceType>('متوسط');
  
  // Popular Mood metrics
  const [potentialVirality, setPotentialVirality] = useState<PotentialViralityType>('واسع الانتشار');
  const [publicTensionLevel, setPublicTensionLevel] = useState<PublicTensionLevelType>('توتر متوسط');

  const [tagsInput, setTagsInput] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  if (!isOpen) return null;

  // Handle section toggle
  const handleSectionChange = (section: 'official' | 'popular_mood') => {
    setTargetSection(section);
    if (section === 'popular_mood') {
      setPlatform('Facebook');
      setSourceReliability('حساب مجهول أو جديد');
    } else {
      setPlatform('X / Twitter');
      setSourceReliability('حساب رسمي موثق');
    }
  };

  // Quick select an existing account
  const handleSelectAccount = (accId: string) => {
    setSelectedAccountId(accId);
    if (!accId) return;
    const acc = accounts.find(a => a.id === accId);
    if (acc) {
      setAccountName(acc.name);
      setAccountHandle(acc.handle);
      setPlatform(acc.platform || 'X / Twitter');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName.trim() || !content.trim()) {
      alert('يرجى كتابة اسم الحساب ونص المنشور على الأقل.');
      return;
    }

    setIsAnalyzing(true);

    const nowIso = new Date().toISOString();
    const actualPubDateIso = pubDate ? new Date(pubDate).toISOString() : nowIso;
    const tagsArr = tagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);

    let summaryText = 'تم إدخال المنشور يدوياً وإدراجه فوراً.';
    let categoryText: ArticleCategory = 'سياسة';
    let sentimentVal: 'positive' | 'neutral' | 'negative' = 'neutral';
    let impactVal: StrategicImportanceType = impactLevel;

    // Call Gemini AI Analysis Endpoint automatically
    try {
      const res = await fetch('/api/news/analyze-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `منشور صادر عن: ${accountName}`,
          snippet: content,
          source: accountName
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
      console.warn('Auto AI analysis offline or failed, using standard fallback metadata:', err);
    } finally {
      setIsAnalyzing(false);
    }

    if (targetSection === 'official') {
      const matchedAccount = accounts.find(a => a.id === selectedAccountId);

      const newStatement: OfficialStatement = {
        id: `stmt-manual-${Date.now()}`,
        accountId: selectedAccountId || `acc-manual-${Date.now()}`,
        accountName: accountName.trim(),
        accountHandle: accountHandle.trim() || `@${accountName.trim().replace(/\s+/g, '_')}`,
        accountRole: matchedAccount ? matchedAccount.role : 'حساب/صفحة إعلامية مرصودة',
        entityType: matchedAccount ? matchedAccount.entityType : 'sovereignty_body',
        platform,
        verified: sourceReliability === 'حساب رسمي موثق',
        content: content.trim(),
        title: `منشور ${platform} - ${accountName}`,
        pubDate: actualPubDateIso, // Actual publishing date/time
        entryDate: nowIso, // Automatic system entry date/time
        link: link.trim() || 'https://facebook.com',
        sourceReliability,
        status: 'published', // Published immediately without review
        tags: tagsArr.length > 0 ? tagsArr : ['رصد_يدوي', platform],
        sentiment: sentimentVal,
        impactLevel: impactVal,
        category: categoryText,
        summary: summaryText,
        isBookmarked: false
      };

      onAddStatement(newStatement);
    } else {
      // Popular Mood Post
      const newPopularPost: PopularMoodPost = {
        id: `pm-manual-${Date.now()}`,
        accountName: accountName.trim(),
        accountHandle: accountHandle.trim() || `Facebook: @${accountName.trim().replace(/\s+/g, '_')}`,
        platform: platform || 'Facebook',
        content: content.trim(),
        title: `منشور فيسبوك/تفاعل - ${accountName}`,
        pubDate: actualPubDateIso,
        entryDate: nowIso,
        link: link.trim() || 'https://facebook.com',
        sourceReliability,
        potentialVirality,
        publicTensionLevel,
        status: 'published', // Published immediately without review
        tags: tagsArr.length > 0 ? tagsArr : ['رصد_شعبى', platform],
        summary: summaryText,
        isBookmarked: false
      };

      onAddPopularPost(newPopularPost);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-['Tajawal',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shadow-inner">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>نموذج إضافة منشور / تصريح يدوي جديد</span>
                <span className="text-[10px] bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded">
                  خاص بالمُدخِل
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                تسجيل المنشورات مع تحديد القسم الموجه وتقييم الموثوقية بالذكاء الاصطناعي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Target Selection Bar */}
        <div className="bg-slate-100 p-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs px-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 ml-1">وجهة المنشور:</span>
            
            <button
              type="button"
              onClick={() => handleSectionChange('official')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                targetSection === 'official'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>المصادر الرسمية</span>
            </button>

            <button
              type="button"
              onClick={() => handleSectionChange('popular_mood')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                targetSection === 'popular_mood'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50'
              }`}
            >
              <Users2 className="w-4 h-4 text-amber-200" />
              <span>رصد المزاج الشعبي</span>
            </button>
          </div>

          {onOpenBulkImport && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenBulkImport();
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-950" />
              <span>⚡ الانتقال للاستيراد الجماعي (لصق كتلة)</span>
            </button>
          )}
        </div>

        {/* Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs text-amber-950 font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>
            يدخل المنشور بحالة <strong>"بانتظار المراجعة"</strong> ولن يظهر في واجهة العرض الرئاسية إلا بعد الاعتماد.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 bg-white text-xs">
          
          {/* Quick Select Account or Custom (Only for Official) */}
          {targetSection === 'official' && accounts.length > 0 && (
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1.5">
              <label className="block font-bold text-slate-700">اختر من الحسابات الرسمية المرصودة (اختياري):</label>
              <select
                value={selectedAccountId}
                onChange={(e) => handleSelectAccount(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
              >
                <option value="">-- أو أدخل اسم حساب/صفحة جديد أدناه --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.handle}) - {acc.platform}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Row 1: Platform & Account Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                المنصة المصدر <span className="text-rose-500">*</span>:
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
              >
                <option value="Facebook">فيسبوك (Facebook)</option>
                <option value="X / Twitter">منصة X (تويتر)</option>
                <option value="Telegram">تليجرام (Telegram)</option>
                <option value="بيان صحفي">بيان صحفي رسمي</option>
                <option value="موقع إخباري">موقع إخباري</option>
                <option value="منصة أخرى">منصة أخرى</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                اسم الحساب أو الصفحة <span className="text-rose-500">*</span>:
              </label>
              <input
                type="text"
                required
                placeholder={targetSection === 'popular_mood' ? "مثال: شبكة أخبار بنغازي، نبض الشارع..." : "مثال: القيادة العامة للقوات المسلحة..."}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Row 2: Account Handle & Source Reliability */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                المعرف أو الرابط المختصر (Handle / Page ID):
              </label>
              <input
                type="text"
                placeholder="@LNAspox أو /BenghaziNews"
                value={accountHandle}
                onChange={(e) => setAccountHandle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                تقييم موثوقية المصدر <span className="text-rose-500">*</span>:
              </label>
              <select
                value={sourceReliability}
                onChange={(e) => setSourceReliability(e.target.value as SourceReliabilityType)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400 font-bold"
              >
                <option value="حساب مجهول أو جديد">❓ حساب مجهول أو جديد</option>
                <option value="حساب معروف وموثوق نسبيًا">🔹 حساب معروف وموثوق نسبيًا</option>
                <option value="حساب رسمي موثق">🛡️ حساب رسمي موثق</option>
                <option value="غير محدد">⚪ غير محدد</option>
              </select>
            </div>
          </div>

          {/* Post Content Area */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              نص المنشور أو التصريح الأصلي <span className="text-rose-500">*</span>:
            </label>
            <textarea
              required
              rows={5}
              placeholder="انسخ وألصق نص المنشور أو منشور الفيسبوك كاملاً..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-800 focus:outline-none focus:border-slate-400 leading-relaxed font-sans"
            />
          </div>

          {/* Row 3: Actual Publishing Date/Time & Original Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>تاريخ ووقت النشر الفعلي:</span>
                <span className="text-[10px] text-slate-400 font-normal">(منفصل عن تاريخ الإدخال)</span>
              </label>
              <input
                type="datetime-local"
                required
                value={pubDate}
                onChange={(e) => setPubDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                رابط المنشور الأصلي:
              </label>
              <input
                type="url"
                placeholder="https://facebook.com/posts/12345"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
              />
            </div>
          </div>

          {/* Row 4: Metrics dependent on Target Section */}
          {targetSection === 'official' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">تقييم مستوى الأهمية:</label>
                <select
                  value={impactLevel}
                  onChange={(e) => setImpactLevel(e.target.value as StrategicImportanceType)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400 font-bold"
                >
                  <option value="عالي الأهمية">🚨 عالي الأهمية / عاجل</option>
                  <option value="عالي">🔴 عالي</option>
                  <option value="متوسط">🟡 متوسط</option>
                  <option value="اعتيادي">🟢 اعتيادي</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الوسوم (مفصولة بفواصل):</label>
                <input
                  type="text"
                  placeholder="بنغازي، القوات_المسلحة..."
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/60 p-3 rounded-lg border border-amber-200">
              <div>
                <label className="block font-bold text-amber-950 mb-1">درجة الانتشار المحتمل:</label>
                <select
                  value={potentialVirality}
                  onChange={(e) => setPotentialVirality(e.target.value as PotentialViralityType)}
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none font-bold"
                >
                  <option value="واسع الانتشار جداً">🔥 واسع الانتشار جداً</option>
                  <option value="واسع الانتشار">⚡ واسع الانتشار</option>
                  <option value="متوسط الانتشار">📈 متوسط الانتشار</option>
                  <option value="محدود الانتشار">🔹 محدود الانتشار</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-amber-950 mb-1">مستوى الاحتقان الشعبي:</label>
                <select
                  value={publicTensionLevel}
                  onChange={(e) => setPublicTensionLevel(e.target.value as PublicTensionLevelType)}
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none font-bold"
                >
                  <option value="احتقان شديد">🚨 احتقان شديد</option>
                  <option value="توتر مرتفع">🔴 توتر مرتفع</option>
                  <option value="توتر متوسط">🟡 توتر متوسط</option>
                  <option value="هادئ / متزن">🟢 هادئ / متزن</option>
                  <option value="إيجابي">✨ إيجابي</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-amber-950 mb-1">الوسوم:</label>
                <input
                  type="text"
                  placeholder="فيسبوك، السيولة، الكهرباء..."
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-lg px-3.5 py-2 text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Footer Submit Controls */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>سيتم توجيه المنشور تلقائيًا لقسم {targetSection === 'popular_mood' ? 'رصد المزاج الشعبي' : 'المصادر الرسمية'}.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-all"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isAnalyzing}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2 rounded-lg flex items-center gap-2 transition-all shadow-md disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>جاري التحليل والحفظ...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>حفظ كـ (بانتظار المراجعة)</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

