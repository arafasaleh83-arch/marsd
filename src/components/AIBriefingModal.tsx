import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AIExtractedBriefing, NewsArticle } from '../types';
import { 
  Sparkles, 
  X, 
  Copy, 
  Check, 
  FileText, 
  AlertOctagon, 
  CheckCircle2, 
  RefreshCw,
  Printer
} from 'lucide-react';

interface AIBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: NewsArticle[];
  targetKeywords: string[];
}

export const AIBriefingModal: React.FC<AIBriefingModalProps> = ({
  isOpen,
  onClose,
  articles,
  targetKeywords
}) => {
  const [briefing, setBriefing] = useState<AIExtractedBriefing | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleGenerateBriefing = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Sanitize articles to keep payload light & fast
      const sanitizedArticles = (articles || []).slice(0, 15).map(a => ({
        id: a.id,
        title: a.title,
        source: a.source,
        category: a.category,
        snippet: a.snippet ? String(a.snippet).slice(0, 250) : a.title
      }));

      const response = await fetch('/api/news/generate-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: sanitizedArticles,
          targetKeywords
        })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        if (contentType.includes('application/json')) {
          const errData = await response.json();
          throw new Error(errData.error || `خطأ الخادم (${response.status})`);
        } else {
          const rawText = await response.text();
          throw new Error(`تعذر الاتصال بالخادم (${response.status}): ${rawText.slice(0, 80)}`);
        }
      }

      if (!contentType.includes('application/json')) {
        throw new Error('تنسيق الاستجابة من الخادم غير صالح.');
      }

      const data = await response.json();
      if (data.status === 'success' && data.briefing) {
        setBriefing(data.briefing);
      } else {
        throw new Error(data.error || 'فشل في استخراج الإيجاز الذكي');
      }
    } catch (err: any) {
      console.error('Error generating briefing:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء التواصل مع نموذج Gemini');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReport = () => {
    if (!briefing) return;
    const text = `=== تقرير التقدير الاستراتيجي والتحليل السياسي لمحتوى الأخبار ===
تاريخ الإصدار: ${briefing.timestamp}
الجهة المعنية: القيادة العامة للقوات المسلحة

1. تقدير الموقف (الملخص التنفيذي):
${briefing.executiveSummary}

2. التحليل الاستراتيجي:
${briefing.strategicAnalysis || briefing.executiveSummary}

3. التداعيات المتوقعة (سياسياً وأمنياً):
${(briefing.expectedConsequences && briefing.expectedConsequences.length > 0 ? briefing.expectedConsequences : briefing.keyDevelopments).map(c => `• ${c}`).join('\n')}

4. الخلاصة الاستباقية:
${briefing.proactiveConclusion || briefing.riskAssessment}

---
[أبرز المستجدات والتطورات المرصودة]:
${briefing.keyDevelopments.map(d => `• ${d}`).join('\n')}

[تقييم المخاطر وتوازنات الردع]:
${briefing.riskAssessment}

[التوصيات والتوجهات الموصى بها]:
${briefing.recommendedActions.map(r => `• ${r}`).join('\n')}

[نظرة عامة على التغطية الإعلامية]:
${briefing.mediaSentimentOverview}
`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>التقرير الاستراتيجي والتحليل السياسي لمحتوى الأخبار</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono">Gemini AI</span>
              </h2>
              <p className="text-xs text-slate-300">قراءة استخبارية وسياسية متعمقة لصالح القيادة العامة للقوات المسلحة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50">
          
          {!briefing && !isLoading && (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-700 border border-slate-200">
                <FileText className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">توليد التقرير الاستراتيجي والتحليل السياسي</h3>
                <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
                  يقوم المكون بالربط مع نموذج Gemini لتفكيك محتوى الأخبار المرصودة، تحليل الدوافع والمآلات، وتقديم تقدير موقف سياسي واستراتيجي رصين.
                </p>
              </div>
              <button
                onClick={handleGenerateBriefing}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-6 py-2.5 rounded shadow transition-all text-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>إعداد التحليل السياسي والاستراتيجي الآن</span>
              </button>
            </div>
          )}

          {isLoading && (
            <div className="bg-white p-12 rounded-lg border border-slate-200 text-center space-y-3 shadow-sm">
              <RefreshCw className="w-10 h-10 text-sky-600 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">جاري قراءة المعطيات وتفكيك السياقات السياسية والأمنية...</h3>
              <p className="text-xs text-slate-500">صياغة تقدير الموقف، التحليل الاستراتيجي، واستشراف التداعيات الميدانية</p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 p-4 rounded-lg text-xs text-rose-900">
              <p className="font-bold mb-1">خطأ في استخراج التقرير التحليلي:</p>
              <p>{errorMessage}</p>
            </div>
          )}

          {briefing && (
            <div className="space-y-4">
              
              {/* Section 1: تقدير الموقف (الملخص التنفيذي) */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-900"></span>
                    <span>1. تقدير الموقف (الملخص التنفيذي)</span>
                  </h4>
                  <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded">{briefing.timestamp}</span>
                </div>
                <div className="text-xs text-slate-800 leading-relaxed font-medium bg-slate-50 p-3 rounded border border-slate-200 markdown-body">
                  <ReactMarkdown>{briefing.executiveSummary}</ReactMarkdown>
                </div>
              </div>

              {/* Section 2: التحليل الاستراتيجي */}
              {briefing.strategicAnalysis && (
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <h4 className="text-xs font-bold text-sky-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="w-2 h-2 rounded-full bg-sky-600"></span>
                    <span>2. التحليل الاستراتيجي (موازين القوى والتموضع الجيوسياسي)</span>
                  </h4>
                  <div className="text-xs text-slate-800 leading-relaxed bg-sky-50/40 p-3 rounded border border-sky-100 markdown-body">
                    <ReactMarkdown>{briefing.strategicAnalysis}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Section 3: التداعيات المتوقعة */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                  <span>3. التداعيات المتوقعة (على المدى القريب والمتوسط سياسياً وأمنياً)</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-800">
                  {(briefing.expectedConsequences && briefing.expectedConsequences.length > 0 
                    ? briefing.expectedConsequences 
                    : briefing.keyDevelopments
                  ).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-amber-50/30 p-2.5 rounded border border-amber-100">
                      <span className="text-amber-700 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section 4: الخلاصة الاستباقية */}
              {briefing.proactiveConclusion && (
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>4. الخلاصة الاستباقية والرؤية النهائية</span>
                  </h4>
                  <p className="text-xs text-slate-800 leading-relaxed bg-emerald-50/40 p-3 rounded border border-emerald-100 font-medium">
                    {briefing.proactiveConclusion}
                  </p>
                </div>
              )}

              {/* Additional Details Grid: Risk Assessment & Recommendations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Risk & Deterrence Assessment */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <span>تقييم المخاطر وتوازنات الردع</span>
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed bg-rose-50/40 p-3 rounded border border-rose-100">
                    {briefing.riskAssessment}
                  </p>
                </div>

                {/* Recommendations */}
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-2">
                  <h4 className="text-xs font-bold text-purple-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>التوصيات والتوجهات الاستراتيجية</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {briefing.recommendedActions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-purple-50/30 p-2 rounded border border-purple-100">
                        <span className="text-purple-700 font-bold">✓</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Media Sentiment Overview */}
              <div className="bg-slate-900 text-slate-200 p-4 rounded-lg text-xs leading-relaxed space-y-1">
                <h4 className="text-xs font-bold text-amber-300">نظرة عامة على اتجاهات التغطية الإعلامية:</h4>
                <p className="text-slate-300">{briefing.mediaSentimentOverview}</p>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
          {briefing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyReport}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded shadow transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم نسخ التقرير المكتمل' : 'نسخ التقرير الاستراتيجي'}</span>
              </button>
              <button
                onClick={handleGenerateBriefing}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded transition-all border border-slate-300 font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
                <span>إعادة قراءة وتحليل التغطية</span>
              </button>
            </div>
          ) : (
            <div></div>
          )}

          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded transition-all font-medium"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
