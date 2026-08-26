import React, { useState } from 'react';
import { NewsArticle } from '../types';
import { 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  X, 
  Code2, 
  Play, 
  Clock, 
  Layers, 
  HelpCircle,
  FileText,
  RefreshCw,
  ShieldCheck,
  Eye,
  EyeOff,
  Zap,
  CheckCircle2,
  AlertCircle,
  Key,
  Radio
} from 'lucide-react';

interface GoogleSheetsIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  articles: NewsArticle[];
}

export const GoogleSheetsIntegration: React.FC<GoogleSheetsIntegrationProps> = ({
  isOpen,
  onClose,
  articles
}) => {
  const [queryKeywords, setQueryKeywords] = useState<string>('("ليبيا" OR "حفتر" OR "القيادة العامة") -is:retweet lang:ar');
  const [bearerToken, setBearerToken] = useState<string>('AAAAAAAAAAAAAAAAAAAAACfs%2BwEAAAAAQn95d9%2FxUGpzcoj2%2F%2Bsp4nt5160%3D8SrauP6w9C1uki3FqjNlTUKvw8Er4WxjkZ9D2eCHwNcqdYq7yX');
  const [showTokenKey, setShowTokenKey] = useState<boolean>(false);
  const [sheetName, setSheetName] = useState<string>('الرصد الإعلامي');
  const [hoursInterval, setHoursInterval] = useState<number>(1);
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(true);
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'twitter_script' | 'script' | 'instructions' | 'export'>('twitter_script');
  
  // Bearer Token Test & Live Sync State
  const [isTestingToken, setIsTestingToken] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: 'success' | 'error';
    message: string;
    tweetCount?: number;
    sampleTweets?: any[];
  } | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle live testing of the Bearer Token & connection to X API
  const handleTestBearerToken = async () => {
    setIsTestingToken(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/x/test-bearer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bearerToken,
          query: queryKeywords
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setTestResult({
          status: 'success',
          message: data.message || `تم التوثيق واختبار الاتصال بـ X API بنجاح! تم العثور على ${data.count} تغريدة مباشرة.`,
          tweetCount: data.count,
          sampleTweets: data.tweets?.slice(0, 3) || []
        });
        setLastSyncedTime(new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' }));
      } else {
        setTestResult({
          status: 'error',
          message: data.message || 'فشل الاتصال بـ API منصة X. يرجى التأكد من صلاحية الرمز.'
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 'error',
        message: 'تعذر الاتصال الخادمي باختبار API منصة X: ' + (err.message || 'خطأ غير معروف')
      });
    } finally {
      setIsTestingToken(false);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(bearerToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Generate X (Twitter) API v2 Google Apps Script
  const twitterScript = `// ============================================================
// سكريبت رصد تغريدات منصة X (تويتر) المباشرة إلى Google Sheets
// المتابعة السياسية والدبلوماسية - القيادة العامة للقوات المسلحة
// ============================================================

const BEARER_TOKEN = "${bearerToken.trim()}";

function fetchXNewsToSheet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // 1. إعداد ترويسة الجدول إذا كان جديداً
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["التاريخ", "الحساب", "اسم الحساب", "التغريدة", "الرابط"]);
    sheet.getRange("A1:E1").setFontWeight("bold").setBackground("#1e293b").setFontColor("#f8fafc");
  }

  // 2. قراءة الروابط المضافة سابقاً لمنع تكرار التغريدات
  var existingData = sheet.getDataRange().getValues();
  var existingLinks = [];
  for (var i = 1; i < existingData.length; i++) {
    existingLinks.push(existingData[i][4]); 
  }

  // 3. بناء نص البحث والاتصال بـ API v2
  var query = '${queryKeywords.replace(/'/g, "\\'")}';
  var apiUrl = "https://api.twitter.com/2/tweets/search/recent?query=" + encodeURIComponent(query) + 
                "&tweet.fields=created_at,author_id&expansions=author_id&user.fields=username,name&max_results=20";

  var options = {
    "method": "GET",
    "headers": {
      "Authorization": "Bearer " + BEARER_TOKEN,
      "Content-Type": "application/json"
    },
    "muteHttpExceptions": true
  };

  try {
    var response = UrlFetchApp.fetch(apiUrl, options);
    var json = JSON.parse(response.getContentText());

    if (json.errors) {
      Logger.log("خطأ في API: " + JSON.stringify(json.errors));
      return;
    }

    if (!json.data || json.data.length === 0) {
      Logger.log("لا توجد تغريدات جديدة حالياً.");
      return;
    }

    // 4. خريطة بيانات مالكي الحسابات
    var usersMap = {};
    if (json.includes && json.includes.users) {
      json.includes.users.forEach(function(user) {
        usersMap[user.id] = { username: user.username, name: user.name };
      });
    }

    var newRows = [];

    // 5. استخراج البيانات وتصفياتها
    for (var j = 0; j < json.data.length; j++) {
      var tweet = json.data[j];
      var username = usersMap[tweet.author_id] ? usersMap[tweet.author_id].username : "unknown";
      var name = usersMap[tweet.author_id] ? usersMap[tweet.author_id].name : "غير معروف";
      var tweetUrl = "https://twitter.com/" + username + "/status/" + tweet.id;

      if (existingLinks.indexOf(tweetUrl) === -1) {
        var formattedDate = new Date(tweet.created_at);
        newRows.push([formattedDate, "@" + username, name, tweet.text, tweetUrl]);
        existingLinks.push(tweetUrl);
      }
    }

    // 6. إضافة التغريدات في أسطر جديدة داخل الجدول
    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 5).setValues(newRows);
      Logger.log("تمت إضافة " + newRows.length + " تغريدة بنجاح.");
    }

  } catch (e) {
    Logger.log("حدث خطأ أثناء الاتصال: " + e.toString());
  }
}

// دالة جدولة التحديث التلقائي كل ${hoursInterval} ساعة
function createHourlyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('fetchXNewsToSheet')
    .timeBased()
    .everyHours(${hoursInterval})
    .create();

  Logger.log("تم تفعيل مشغل المزامنة التلقائية لـ X كل ${hoursInterval} ساعة بنجاح.");
}`;

  // Generate customized Google Apps Script based on user configuration
  const generatedScript = `// ============================================================
// سكريبت الرصد الإعلامي الذكي للوحة التحكم و Google Sheets
// التردد: كل ${hoursInterval} ساعة تلقائياً
// ============================================================

function fetchLibyaNewsToSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("${sheetName}") || ss.getActiveSheet();
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["التاريخ", "العنوان", "المصدر", "الرابط"]);
    sheet.getRange("A1:D1").setFontWeight("bold").setBackground("#1e293b").setFontColor("#f8fafc");
  }

  var existingData = sheet.getDataRange().getValues();
  var existingLinks = [];
  for (var i = 1; i < existingData.length; i++) {
    existingLinks.push(existingData[i][3]);
  }

  var rssUrl = "https://news.google.com/rss/search?q=" + encodeURIComponent("ليبيا OR حفتر") + "&hl=ar&gl=LY&ceid=LY:ar";

  try {
    var response = UrlFetchApp.fetch(rssUrl);
    var xmlText = response.getContentText();
    var document = XmlService.parse(xmlText);
    var root = document.getRootElement();
    var channel = root.getChild('channel');
    var items = channel.getChildren('item');

    var newRows = [];

    for (var j = items.length - 1; j >= 0; j--) {
      var item = items[j];
      var title = item.getChildText('title');
      var link = item.getChildText('link');
      var pubDate = item.getChildText('pubDate');
      var source = item.getChildText('source') || "أخبار جوجل";
      
      var formattedDate = new Date(pubDate);

      if (existingLinks.indexOf(link) === -1) {
        newRows.push([formattedDate, title, source, link]);
        existingLinks.push(link); 
      }
    }

    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 4).setValues(newRows);
      Logger.log("تمت إضافة " + newRows.length + " خبر جديد بنجاح.");
    }
    
  } catch (e) {
    Logger.log("حدث خطأ أثناء جلب البيانات: " + e.toString());
  }
}

function createHourlyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  ScriptApp.newTrigger('fetchLibyaNewsToSheet')
    .timeBased()
    .everyHours(${hoursInterval})
    .create();

  Logger.log("تم تفعيل المشغل التلقائي كل ${hoursInterval} ساعة بنجاح.");
}`;

  const handleCopyCode = () => {
    const codeToCopy = activeTab === 'twitter_script' ? twitterScript : generatedScript;
    navigator.clipboard.writeText(codeToCopy);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleDownloadScript = () => {
    const codeToDownload = activeTab === 'twitter_script' ? twitterScript : generatedScript;
    const fileName = activeTab === 'twitter_script' ? 'X_Twitter_Libya_Monitoring.gs' : 'LibyaNewsMonitoring.gs';
    const blob = new Blob([codeToDownload], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['التاريخ', 'العنوان', 'المصدر', 'المجال', 'النبرة', 'الرابط'];
    const rows = articles.map(a => [
      `"${new Date(a.pubDate).toLocaleString('ar-LY')}"`,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.source}"`,
      `"${a.category || ''}"`,
      `"${a.sentiment || ''}"`,
      `"${a.link}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `مرصد_الأخبار_الليبية_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-slate-700 border border-slate-600 flex items-center justify-center text-white">
              <FileSpreadsheet className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>مركز المزامنة الذكية مع X (تويتر) و Google Sheets</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full font-mono">API v2</span>
              </h2>
              <p className="text-xs text-slate-300">أتمتة رصد الأخبار والتغريدات الرسمية وتحديث جداول البيانات تلقائياً</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 flex items-center gap-2 sm:gap-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('twitter_script')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'twitter_script'
                ? 'border-slate-800 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-4 h-4 text-sky-500" />
            <span>ربط X (تويتر) API v2 & جدولة المزامنة</span>
          </button>

          <button
            onClick={() => setActiveTab('script')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'script'
                ? 'border-slate-800 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Code2 className="w-4 h-4 text-emerald-600" />
            <span>سكريبت الأخبار العامة (Google RSS)</span>
          </button>

          <button
            onClick={() => setActiveTab('instructions')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'instructions'
                ? 'border-slate-800 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>خطوات التفعيل في Google Sheets</span>
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'export'
                ? 'border-slate-800 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>تصدير مباشر CSV / Excel</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          
          {activeTab === 'twitter_script' && (
            <div className="space-y-5">
              
              {/* 1. Bearer Token Management Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    <h3 className="text-xs font-bold text-slate-900">إدارة مفتاح التوثيق (X API Bearer Token)</h3>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    مفتاح التوثيق مُدخل وجاهز
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700">
                    رمز التوثيق الخاص بحسابك (Bearer Token):
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showTokenKey ? 'text' : 'password'}
                        value={bearerToken}
                        onChange={(e) => setBearerToken(e.target.value)}
                        placeholder="أدخل رمز Bearer Token الخاص بمنصة X..."
                        className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 font-mono pr-10 focus:outline-none focus:border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowTokenKey(!showTokenKey)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                        title={showTokenKey ? 'إخفاء الرمز' : 'إظهار الرمز'}
                      >
                        {showTokenKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="نسخ مفتاح Bearer"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedToken ? 'تم النسخ' : 'نسخ المفتاح'}</span>
                    </button>
                  </div>
                </div>

                {/* Search Query Parameter Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    عبارة البحث والاستعلام في تغريدات منصة X:
                  </label>
                  <input
                    type="text"
                    value={queryKeywords}
                    onChange={(e) => setQueryKeywords(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-slate-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    تلقائياً يتم جلب التغريدات العربية المباشرة المتعلقة بـ القيادة العامة، حفتر، وليس بها إعادة تغريد (Retweet).
                  </p>
                </div>
              </div>

              {/* 2. Automated Scheduling Controls Card */}
              <div className="bg-sky-50/50 border border-sky-200 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-700" />
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">إعدادات وتفعيل المزامنة التلقائية (Auto-Sync Schedule)</h3>
                      <p className="text-[11px] text-slate-600">جدولة تشغيل سكريبت Google Apps Script لجلب التغريدات في الخلفية</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isAutoSyncEnabled} 
                        onChange={(e) => setIsAutoSyncEnabled(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-600"></div>
                      <span className="mr-2 text-xs font-semibold text-slate-800">
                        {isAutoSyncEnabled ? 'المزامنة مُمكّنة' : 'المزامنة متوقفة'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end pt-1">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">تكرار التحديث التلقائي في Google Sheets:</label>
                    <select
                      value={hoursInterval}
                      onChange={(e) => setHoursInterval(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-slate-500 font-medium"
                    >
                      <option value={1}>كل ساعة واحدة (موصى به للرصد العاجل)</option>
                      <option value={2}>كل ساعتين</option>
                      <option value={6}>كل 6 ساعات</option>
                      <option value={12}>كل 12 ساعة</option>
                      <option value={24}>مرة واحدة يومياً</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestBearerToken}
                      disabled={isTestingToken}
                      className="w-full py-2 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded text-xs font-bold shadow flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isTestingToken ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>جاري جلب واختبار الاتصال...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>اختبار اتصال API X الآن</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Test Result Display Panel */}
                {testResult && (
                  <div className={`p-3 rounded border text-xs leading-relaxed transition-all ${
                    testResult.status === 'success' 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                      : 'bg-rose-50 border-rose-300 text-rose-950'
                  }`}>
                    <div className="flex items-start gap-2">
                      {testResult.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <strong className="font-bold">{testResult.message}</strong>
                        
                        {testResult.sampleTweets && testResult.sampleTweets.length > 0 && (
                          <div className="mt-2 space-y-1.5 border-t border-emerald-200 pt-2">
                            <span className="text-[11px] font-bold text-emerald-900 block">نموذج من التغريدات المباشرة المرصودة:</span>
                            {testResult.sampleTweets.map((t: any, idx: number) => (
                              <div key={idx} className="bg-white/80 p-2 rounded border border-emerald-200 text-[11px] font-sans text-slate-800">
                                <p className="font-medium">{t.text}</p>
                                <span className="text-[10px] text-slate-500 block mt-0.5">تاريخ التغريدة: {new Date(t.created_at).toLocaleString('ar-LY')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {lastSyncedTime && (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                    <span>آخر اختبار مزامنة ناجح: <strong className="text-slate-800">{lastSyncedTime}</strong></span>
                  </div>
                )}
              </div>

              {/* 3. Generated Code Box */}
              <div className="relative bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
                <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-sky-400" />
                    <span className="font-mono text-sky-400 font-bold">X_Twitter_Libya_Monitoring.gs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1 rounded transition-all border border-slate-700"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? 'تم نسخ السكريبت!' : 'نسخ الكود'}</span>
                    </button>
                    <button
                      onClick={handleDownloadScript}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded transition-all border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>تحميل ملف .gs</span>
                    </button>
                  </div>
                </div>

                <pre className="p-4 text-xs font-mono text-sky-300 overflow-x-auto max-h-72 leading-relaxed bg-slate-900">
                  <code>{twitterScript}</code>
                </pre>
              </div>

            </div>
          )}

          {activeTab === 'script' && (
            <div className="space-y-4">
              
              {/* Configuration Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">الكلمات المفتاحية في الاستعلام:</label>
                  <input
                    type="text"
                    value={queryKeywords}
                    onChange={(e) => setQueryKeywords(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اسم ورقة الشيت (Sheet Name):</label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">معدل التحديث التلقائي:</label>
                  <select
                    value={hoursInterval}
                    onChange={(e) => setHoursInterval(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-slate-400"
                  >
                    <option value={1}>كل ساعة واحدة</option>
                    <option value={2}>كل ساعتين</option>
                    <option value={6}>كل 6 ساعات</option>
                    <option value={12}>كل 12 ساعة</option>
                    <option value={24}>مرة في اليوم</option>
                  </select>
                </div>
              </div>

              {/* Code Box */}
              <div className="relative bg-slate-900 border border-slate-800 rounded overflow-hidden">
                <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-emerald-400">LibyaNewsMonitoring.gs</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1 rounded transition-all border border-slate-700"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? 'تم النسخ!' : 'نسخ الكود'}</span>
                    </button>
                    <button
                      onClick={handleDownloadScript}
                      className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded transition-all border border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>تحميل .gs</span>
                    </button>
                  </div>
                </div>

                <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto max-h-80 leading-relaxed bg-slate-900">
                  <code>{generatedScript}</code>
                </pre>
              </div>

            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-800 mb-2">خطوات إعداد وتفعيل المزامنة التلقائية مع X في Google Sheets:</h3>

              <div className="grid grid-cols-1 gap-3 text-xs">
                
                <div className="bg-slate-50 p-4 rounded border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">إنشاء جدول بيانات جديد في Google Sheets</h4>
                    <p className="text-slate-600">انتقل إلى <a href="https://sheets.new" target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold underline inline-flex items-center gap-1">sheets.new <ExternalLink className="w-3 h-3" /></a> وافتح شيت جديد فارغ.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">الوصول لمحرر التوسيعات (Apps Script)</h4>
                    <p className="text-slate-600">من القائمة العلوية في Google Sheets اختر: <strong className="text-slate-900">توسيعات (Extensions) &gt; محرر السكريبت (Apps Script)</strong>.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">لصق كود المزامنة مع مفتاح Bearer</h4>
                    <p className="text-slate-600">انسخ الكود الجاهز من التبويب الأول (والذي يتضمن رمز Bearer Token تلقائياً) والصقه داخل المحرر مع حفظ الملف باسم <strong className="text-slate-900">X_Libya_Monitoring.gs</strong>.</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded border border-slate-200 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1">تفعيل جدولة المزامنة التلقائية</h4>
                    <p className="text-slate-600">اختر دالة <strong className="text-sky-700 font-bold">createHourlyTrigger</strong> واضغط <strong className="text-green-700 font-bold">تشغيل (Run)</strong> لمنح صلاحيات الشبكة والتفعيل التلقائي في الخلفية.</p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-6 rounded border border-slate-200 text-center space-y-3">
                <FileText className="w-10 h-10 text-slate-700 mx-auto" />
                <h3 className="text-base font-bold text-slate-800">تصدير الأخبار المرصودة حالياً</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  يمكنك تصدير جدول الأخبار المباشرة الحالية (<strong className="text-slate-900">{articles.length} خبر</strong>) بصيغة CSV مشفرة بـ UTF-8 لفتحها مباشرة في Excel أو Google Sheets.
                </p>
                <button
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded shadow transition-all text-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>تصدير ملف CSV / Excel الآن</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>نظام المزامنة الذكية متوافق مع X API v2 & Google Apps Script</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded transition-all font-medium"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};

