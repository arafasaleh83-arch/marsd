import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  RefreshCw, 
  FileSpreadsheet, 
  Sparkles, 
  Search, 
  Tag, 
  Clock,
  FileText,
  Crown,
  Edit3,
  LogOut,
  ShieldCheck,
  Eye
} from 'lucide-react';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  autoRefreshInterval: number;
  setAutoRefreshInterval: (val: number) => void;
  onOpenSheetsModal: () => void;
  onOpenBriefingModal: () => void;
  onOpenKeywordsModal: () => void;
  onOpenExecutiveReportModal: () => void;
  lastUpdatedTime: string;
  sourceType: string;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isLoading,
  searchTerm,
  setSearchTerm,
  autoRefreshInterval,
  setAutoRefreshInterval,
  onOpenSheetsModal,
  onOpenBriefingModal,
  onOpenKeywordsModal,
  onOpenExecutiveReportModal,
  lastUpdatedTime,
  sourceType
}) => {
  const { role, username, isReadOnly, logout } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm text-slate-900 font-['Tajawal',sans-serif]">
      
      {/* Role Banner Accent Bar */}
      {isReadOnly ? (
        <div className="bg-slate-950 text-amber-300 px-4 py-1.5 text-xs font-bold border-b border-amber-500/30 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-amber-500 text-slate-950 p-1 rounded font-extrabold flex items-center gap-1 text-[10px]">
                <Crown className="w-3.5 h-3.5" />
                العرض الرئاسي
              </span>
              <span className="text-amber-200">
                {username ? `مرحباً: ${username}` : 'المكتب الرئاسي'}
              </span>
              <span className="hidden sm:inline-block text-amber-500/50">•</span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-300/80 font-normal">
                <Eye className="w-3 h-3 text-amber-400" />
                وضع القراءة فقط بالكامل — محمية ضد أي تعديل أو حذف
              </span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded transition-all cursor-pointer font-medium"
              title="تسجيل الخروج وتبديل المستوى"
            >
              <LogOut className="w-3 h-3 text-amber-400" />
              <span>تبديل مستوى الدخول</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 text-sky-200 px-4 py-1.5 text-xs font-bold border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-sky-500 text-slate-950 p-1 rounded font-extrabold flex items-center gap-1 text-[10px]">
                <Edit3 className="w-3.5 h-3.5" />
                واجهة المُدخِل والمُحرر
              </span>
              <span className="text-sky-100">
                {username ? `المستخدم: ${username}` : 'غرفة العمليات والإدخال'}
              </span>
              <span className="hidden sm:inline-block text-slate-700">•</span>
              <span className="hidden sm:inline-block text-[11px] text-sky-300/80 font-normal">
                صلاحيات كاملة للإضافة والتعديل والحذف وإدارة المصادر
              </span>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-1 text-[11px] bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-0.5 rounded transition-all cursor-pointer font-medium"
              title="تسجيل الخروج وتبديل المستوى"
            >
              <LogOut className="w-3 h-3 text-slate-400" />
              <span>خروج / تبديل</span>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Logo and App Title */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm border border-slate-800">
                <div className="w-4 h-4 border-2 border-amber-400 rounded-sm flex items-center justify-center">
                  <Activity className="w-3 h-3 text-amber-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    مرصد السيادة الوطنية
                  </h1>
                  <span className="flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    رصد استراتيجي حي
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 font-medium">
                  <span>للمتابعة السياسية و الدبلوماسية ورصد المزاج الشعبي والتفاعل الرقمي</span>
                </p>
              </div>
            </div>

            {/* Mobile Refresh Action */}
            <div className="flex lg:hidden items-center gap-2">
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 rounded bg-slate-800 text-white hover:bg-slate-700 active:scale-95 transition-all shadow-sm"
                title="تحديث الأخبار"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Center Search Input */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                placeholder="تصفية وسرد العناوين والمصادر المرصودة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-400 focus:ring-1 focus:ring-slate-300 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-2.5" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute left-3 top-2 text-xs text-slate-500 hover:text-slate-800 bg-slate-200 px-1.5 py-0.5 rounded"
                >
                  مسح
                </button>
              )}
            </div>
          </div>

          {/* Controls & Quick Modals */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Auto Refresh Interval */}
            <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>التحديث:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-slate-800 font-semibold focus:outline-none cursor-pointer"
              >
                <option value={0} className="bg-white text-slate-800">يدوي</option>
                <option value={15} className="bg-white text-slate-800">15 دقيقة</option>
                <option value={30} className="bg-white text-slate-800">30 دقيقة</option>
                <option value={60} className="bg-white text-slate-800">كل 60 دقيقة</option>
              </select>
            </div>

            {/* Keywords Manager Button */}
            <button
              onClick={onOpenKeywordsModal}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-medium transition-all"
            >
              <Tag className="w-3.5 h-3.5 text-slate-600" />
              <span>{isReadOnly ? 'عرض الكلمات المفتاحية' : 'إدارة الكلمات المفتاحية'}</span>
            </button>

            {/* AI Briefing Button */}
            <button
              onClick={onOpenBriefingModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm text-xs font-medium transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>إعداد موجز مفصل</span>
            </button>

            {/* Executive Report Modal Button */}
            <button
              onClick={onOpenExecutiveReportModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-sm text-xs transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>توليد تقرير تنفيذي</span>
            </button>

            {/* Google Sheets Script Button (ONLY visible in Developer/Editor mode as per user request) */}
            {!isReadOnly && (
              <button
                onClick={onOpenSheetsModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium shadow-sm transition-all"
                title="ربط وتكوين Google Sheets (خاص بالمُدخِل والمهندس)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                <span>ربط Google Sheets</span>
              </button>
            )}

            {/* Manual Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700 shadow-sm transition-all"
              title="تحديث الأخبار الآن"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>تحديث الفيد</span>
            </button>

          </div>

        </div>

        {/* Status Line */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">آخر سحب للبيانات:</span>
            <span className="text-slate-700 font-bold font-mono">{lastUpdatedTime || 'الآن'}</span>
          </div>
        </div>

      </div>
    </header>
  );
};
