import React, { useState } from 'react';
import { NewsArticle, OfficialStatement, ExecutiveReportData } from '../types';
import { 
  FileText, 
  X, 
  Download, 
  Printer, 
  Sparkles, 
  Check, 
  Copy, 
  RefreshCw, 
  Calendar, 
  ShieldCheck, 
  AlertTriangle 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ExecutiveReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: NewsArticle[];
  statements: OfficialStatement[];
}

export const ExecutiveReportModal: React.FC<ExecutiveReportModalProps> = ({
  isOpen,
  onClose,
  articles,
  statements
}) => {
  const [timeframe, setTimeframe] = useState<string>('7days'); // '7days', '14days', 'current'
  const [report, setReport] = useState<ExecutiveReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Generate Executive Report using Gemini or Client Aggregator
  const handleGenerateReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const allNews = [
        ...articles.map(a => ({
          id: a.id,
          title: a.title,
          source: a.source || 'مصدر إعلامي عام',
          pubDate: a.pubDate,
          strategicImportance: a.strategicImportance || 'متوسط'
        })),
        ...statements.map(s => ({
          id: s.id,
          title: s.title || `${s.accountName}: ${s.content.slice(0, 80)}...`,
          source: `حساب رسمي (${s.accountName})`,
          pubDate: s.pubDate,
          strategicImportance: s.impactLevel || 'عالي الأهمية'
        }))
      ].slice(0, 20);

      const resp = await fetch('/api/news/generate-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: allNews,
          targetKeywords: ['ليبيا', 'القيادة العامة', 'البعثة الأممية']
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 'success' && data.briefing) {
          const b = data.briefing;
          setReport({
            timeframe: timeframe === '7days' ? 'خلال الأسبوع الماضي' : timeframe === '14days' ? 'خلال أسبوعين' : 'التغطية الحالية الحية',
            executiveSummary: b.executiveSummary,
            newsList: allNews,
            analysisAndStudy: b.strategicAnalysis || b.executiveSummary,
            recommendations: b.recommendedActions || ['تضييق الخناق على الروايات المضللة', 'استمرار رصد الحسابات الرسمية والدبلوماسية بشكل آلي'],
            generatedAt: new Date().toLocaleString('ar-LY')
          });
          return;
        }
      }

      // Fallback structured generation
      setReport({
        timeframe: timeframe === '7days' ? 'خلال الأسبوع الماضي' : 'التغطية المباشرة',
        executiveSummary: `شهد المشهد الإخباري والدبلوماسي رصداً مكثفاً للتحركات المتعلقة بالسيادة الوطنية، مع تركيز الصحافة الدولية على بيان البعثة الأممية والتحركات الاقتصادية والأمنية. تؤكد القراءة الاستراتيجية على صمود مواقف القيادة العامة وضرورة التعامل الحذر مع الروايات الإعلامية الخارجية.`,
        newsList: allNews,
        analysisAndStudy: `تُظهر المعطيات المجمعة وجود اتجاهين متوازيين:\n1. **البُعد الدبلوماسي والأممي:** استمرار التصريحات الدولية المنادية باستقرار العملية السياسية وحماية الموارد الوطنية.\n2. **البُعد الإعلامي والميداني:** محاولات توظيف بعض الملفات المحلية لإحداث إرباك إعلامي، ما يتطلب الاستمرار في تقديم الرواية الموثقة عبر منصات الرصد الرسمية.`,
        recommendations: [
          'تعزيز الرصد الآلي الدائم للبيانات الصادرة عن السفارات والبعثات الأجنبية.',
          'تحديث تقارير التقدير الاستراتيجي بشكل دوري لمنع استغلال الفراغ الإعلامي.',
          'إصدار تعميمات دورية للمكاتب الإعلامية لتفنيد الشائعات فور ظهورها.'
        ],
        generatedAt: new Date().toLocaleString('ar-LY')
      });
    } catch (err: any) {
      console.error('Error generating report:', err);
      setErrorMsg(err.message || 'حدث خطأ أثناء إعداد التقرير التنفيذي');
    } finally {
      setIsLoading(false);
    }
  };

  // Export as Native Word document (.doc)
  const handleExportWord = () => {
    if (!report) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>التقرير التنفيذي لاستخبارات الرصد الإخباري</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; padding: 20px; line-height: 1.6; }
          h1 { color: #0f172a; font-size: 20pt; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
          h2 { color: #1e293b; font-size: 14pt; margin-top: 20px; background-color: #f1f5f9; padding: 6px 10px; border-right: 4px solid #0f172a; }
          p { font-size: 11pt; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #0f172a; color: #ffffff; padding: 8px; font-size: 10pt; text-align: right; }
          td { border: 1px solid #cbd5e1; padding: 8px; font-size: 10pt; text-align: right; }
          .footer { margin-top: 30px; font-size: 9pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <h1>التقرير التنفيذي الموحد للرصد والتحليل الاستراتيجي</h1>
        <p><strong>الجهة:</strong> غرفة العمليات - القيادة العامة للقوات المسلحة</p>
        <p><strong>تاريخ التقرير:</strong> ${report.generatedAt}</p>
        <p><strong>نطاق الرصد:</strong> ${report.timeframe}</p>

        <h2>1. الملخص التنفيذي</h2>
        <p>${report.executiveSummary}</p>

        <h2>2. رصد الأخبار والبيانات الرسمية (بنود مرقمة)</h2>
        <table>
          <thead>
            <tr>
              <th width="8%">#</th>
              <th>العنوان / التصريح</th>
              <th width="25%">المصدر</th>
              <th width="20%">مستوى الأهمية</th>
            </tr>
          </thead>
          <tbody>
            ${report.newsList.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.title}</td>
                <td>${item.source}</td>
                <td>${item.strategicImportance}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>3. الدراسة والتحليل الاستراتيجي</h2>
        <p>${report.analysisAndStudy.replace(/\n/g, '<br/>')}</p>

        <h2>4. التوصيات والتوجهات</h2>
        <ul>
          ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>

        <div class="footer">
          تم توليد هذا التقرير آلياً عبر منظومة المرصد والتحليل الاستراتيجي للقيادة العامة.
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `التقرير_التنفيذي_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Browser PDF / Print Export
  const handlePrintPDF = () => {
    window.print();
  };

  // Copy Plain Text
  const handleCopyText = () => {
    if (!report) return;
    const text = `=== التقرير التنفيذي الموحد للرصد والتحليل الاستراتيجي ===
تاريخ التقرير: ${report.generatedAt}
نطاق الرصد: ${report.timeframe}

1. الملخص التنفيذي:
${report.executiveSummary}

2. رصد الأخبار والبيانات الرسمية المرصودة:
${report.newsList.map((n, i) => `${i + 1}. [${n.strategicImportance}] ${n.title} - (${n.source})`).join('\n')}

3. الدراسة والتحليل الاستراتيجي:
${report.analysisAndStudy}

4. التوصيات والتوجهات:
${report.recommendations.map(r => `• ${r}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-['Tajawal',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:absolute print:inset-0">
        
        {/* Header - Hidden during print */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between text-white print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>توليد التقرير التنفيذي الموحد</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">قابلة للتصدير PDF/Word</span>
              </h2>
              <p className="text-xs text-slate-300">تجميع وتوثيق الأخبار المرصودة والتحليل السياسي والتوصيات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50 print:bg-white print:p-0">
          
          {/* Controls Bar before generating */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">تحديد الفترة الزمنية للتقرير:</span>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-xs text-slate-800 px-3 py-1.5 rounded font-medium focus:outline-none focus:border-slate-500"
              >
                <option value="7days">أخبار الأسبوع الحالي (7 أيام)</option>
                <option value="14days">أخبار آخر 14 يوماً</option>
                <option value="current">جميع الأخبار والبيانات الحالية المرصودة</option>
              </select>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Sparkles className={`w-4 h-4 text-amber-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'جاري بناء التقرير...' : 'إعداد وتوليد التقرير التنفيذي'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs print:hidden">
              {errorMsg}
            </div>
          )}

          {!report && !isLoading && (
            <div className="bg-white p-10 rounded-lg border border-slate-200 text-center text-slate-500 space-y-2 print:hidden">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">اضغط على زر "إعداد وتوليد التقرير التنفيذي"</h3>
              <p className="text-xs text-slate-500">سيقوم النظام بتلخيص الأخبار والبيانات الرسمية صياغتها وفق الهيكل التنفيذي المطلوب.</p>
            </div>
          )}

          {isLoading && (
            <div className="bg-white p-12 rounded-lg border border-slate-200 text-center space-y-3 shadow-sm print:hidden">
              <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">جاري تجميع الأخبار وبناء الهيكل التنفيذي...</h3>
            </div>
          )}

          {report && (
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none">
              
              {/* Header Document Title */}
              <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900">التقرير التنفيذي للرصد والتحليل الاستراتيجي</h1>
                  <p className="text-xs text-slate-600 font-bold mt-1">غرفة العمليات - القيادة العامة للقوات المسلحة</p>
                </div>
                <div className="text-left text-xs text-slate-500 space-y-0.5 font-mono">
                  <div>التاريخ: {report.generatedAt}</div>
                  <div>النطاق: {report.timeframe}</div>
                </div>
              </div>

              {/* Section 1: الملخص التنفيذي */}
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 bg-slate-100 p-2 rounded border-r-4 border-slate-800">
                  1. الملخص التنفيذي
                </h2>
                <div className="text-xs text-slate-800 leading-relaxed p-3 bg-slate-50 rounded border border-slate-200">
                  <ReactMarkdown>{report.executiveSummary}</ReactMarkdown>
                </div>
              </div>

              {/* Section 2: رصد الأخبار والبيانات (بنود مرقمة) */}
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 bg-slate-100 p-2 rounded border-r-4 border-slate-800">
                  2. رصد الأخبار والبيانات الرسمية (مرقمة حسب الأهمية)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      <tr className="bg-slate-800 text-white font-bold">
                        <th className="p-2 border border-slate-700 w-10">#</th>
                        <th className="p-2 border border-slate-700">العنوان / نص التصريح المرصود</th>
                        <th className="p-2 border border-slate-700 w-36">المصدر</th>
                        <th className="p-2 border border-slate-700 w-28">الأهمية</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.newsList.map((item, idx) => (
                        <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="p-2 border border-slate-200 font-mono font-bold text-center">{idx + 1}</td>
                          <td className="p-2 border border-slate-200 text-slate-800 font-medium">{item.title}</td>
                          <td className="p-2 border border-slate-200 text-slate-600 font-bold">{item.source}</td>
                          <td className="p-2 border border-slate-200 text-slate-700 font-bold">
                            <span className={`px-2 py-0.5 rounded text-[10px] ${
                              item.strategicImportance === 'عالي الأهمية' 
                                ? 'bg-rose-100 text-rose-800 font-bold' 
                                : 'bg-slate-100 text-slate-800'
                            }`}>
                              {item.strategicImportance || 'متوسط'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: الدراسة والتحليل */}
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 bg-slate-100 p-2 rounded border-r-4 border-slate-800">
                  3. الدراسة والتحليل الاستراتيجي
                </h2>
                <div className="text-xs text-slate-800 leading-relaxed p-3.5 bg-slate-50 rounded border border-slate-200">
                  <ReactMarkdown>{report.analysisAndStudy}</ReactMarkdown>
                </div>
              </div>

              {/* Section 4: التوصيات */}
              <div className="space-y-2">
                <h2 className="text-sm font-bold text-slate-900 bg-slate-100 p-2 rounded border-r-4 border-slate-800">
                  4. التوصيات والتوجهات الميدانية والإعلامية
                </h2>
                <ul className="space-y-2 text-xs text-slate-800">
                  {report.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 bg-emerald-50/60 p-2.5 rounded border border-emerald-200">
                      <span className="font-bold text-emerald-700">{i + 1}.</span>
                      <span className="font-medium text-slate-800">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          )}

        </div>

        {/* Footer Actions Bar - Hidden during print */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs print:hidden">
          {report ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleExportWord}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded shadow transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تصدير كملف Word (.doc)</span>
              </button>

              <button
                onClick={handlePrintPDF}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded shadow transition-all"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>تصدير PDF / طباعة</span>
              </button>

              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium rounded transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'تم النسخ' : 'نسخ النص'}</span>
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
