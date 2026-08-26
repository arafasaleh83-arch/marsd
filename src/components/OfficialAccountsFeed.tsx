import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { cleanText } from '../lib/utils';
import { 
  Building2, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink, 
  Bookmark, 
  BookmarkCheck, 
  Search, 
  Plus, 
  X, 
  Tag, 
  RefreshCw,
  Edit2,
  Trash2,
  Settings,
  Users,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Clock,
  Send,
  Eye,
  AlertCircle,
  Layers
} from 'lucide-react';
import { OfficialStatement, OfficialAccount, OfficialEntityType, StrategicImportanceType, PopularMoodPost } from '../types';
import { useAuth } from '../context/AuthContext';
import { ManualPostModal } from './ManualPostModal';

interface OfficialAccountsFeedProps {
  statements: OfficialStatement[];
  accounts: OfficialAccount[];
  onToggleBookmark: (id: string) => void;
  onAnalyzeStatement: (statement: OfficialStatement) => void;
  onAddAccount: (newAccount: OfficialAccount) => void;
  onEditAccount: (updatedAccount: OfficialAccount) => void;
  onDeleteAccount: (accountId: string) => void;
  onDeleteStatement?: (statementId: string) => void;
  onRefreshStatements: () => Promise<void>;
  onAddStatement: (newStatement: OfficialStatement) => void;
  onAddPopularPost?: (post: PopularMoodPost) => void;
  onPublishStatement?: (statementId: string) => void;
  onOpenBulkImport?: () => void;
  isAnalyzingId?: string | null;
  isRefreshing?: boolean;
}

export const OfficialAccountsFeed: React.FC<OfficialAccountsFeedProps> = ({
  statements,
  accounts,
  onToggleBookmark,
  onAnalyzeStatement,
  onAddAccount,
  onEditAccount,
  onDeleteAccount,
  onDeleteStatement,
  onRefreshStatements,
  onAddStatement,
  onAddPopularPost,
  onPublishStatement,
  onOpenBulkImport,
  isAnalyzingId,
  isRefreshing = false
}) => {
  const { isReadOnly } = useAuth();
  
  // Tab for Editor View: 'published' | 'pending'
  const [viewTab, setViewTab] = useState<'published' | 'pending'>('published');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Modals state
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [showManageAccountsModal, setShowManageAccountsModal] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<OfficialAccount | null>(null);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [deletingStatementId, setDeletingStatementId] = useState<string | null>(null);
  const [showManualPostModal, setShowManualPostModal] = useState<boolean>(false);

  // New account form state
  const [accName, setAccName] = useState<string>('');
  const [accHandle, setAccHandle] = useState<string>('');
  const [accRole, setAccRole] = useState<string>('');
  const [accEntityType, setAccEntityType] = useState<OfficialEntityType>('un_mission');
  const [accPlatform, setAccPlatform] = useState<string>('X / Twitter');

  // Count items
  const pendingStatements = statements.filter(s => s.status === 'pending_review');
  const publishedStatements = statements.filter(s => s.status !== 'pending_review');

  // Filter statements - all statements are added and shown immediately
  const filteredStatements = statements.filter(stmt => {
    // 1. Entity Filter
    if (selectedEntity !== 'all' && stmt.entityType !== selectedEntity) {
      return false;
    }

    // 2. Search term filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchText = (
        stmt.accountName + ' ' + 
        stmt.accountHandle + ' ' + 
        stmt.content + ' ' + 
        (stmt.title || '') + ' ' + 
        (stmt.tags || []).join(' ') + ' ' + 
        (stmt.sourceReliability || '')
      ).toLowerCase();

      if (!matchText.includes(term)) {
        return false;
      }
    }

    return true;
  });

  const handleCopyStatement = (stmt: OfficialStatement) => {
    const formatted = `[تصريح رسمي] ${stmt.accountName} (${stmt.accountHandle})\nتاريخ النشر الفعلي: ${new Date(stmt.pubDate).toLocaleString('ar-LY')}\nالمنصة: ${stmt.platform}\nموثوقية المصدر: ${stmt.sourceReliability || 'رسمي'}\n\n${stmt.title ? stmt.title + '\n' : ''}${stmt.content}\n\nالمصدر: ${stmt.link}`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(stmt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePublishToPresidential = (stmtId: string) => {
    if (onPublishStatement) {
      onPublishStatement(stmtId);
      setActionNotice('تمت ترقية المنشور بنجاح ونشره في واجهة العرض الرئاسية!');
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim() || !accHandle.trim()) return;

    const created: OfficialAccount = {
      id: `acc-custom-${Date.now()}`,
      name: accName.trim(),
      handle: accHandle.trim().startsWith('@') ? accHandle.trim() : `@${accHandle.trim()}`,
      role: accRole.trim() || 'جهة / شخصية رسمية متبعة',
      entityType: accEntityType,
      avatar: accEntityType === 'un_mission' ? '🇺🇳' : accEntityType === 'eu_mission' ? '🇪🇺' : accEntityType === 'libyan_leader' ? '⚔️' : '🏛️',
      verified: true,
      platform: accPlatform
    };

    onAddAccount(created);
    setShowAddAccountModal(false);
    resetAccForm();
  };

  const handleSaveEditAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !accName.trim() || !accHandle.trim()) return;

    const updated: OfficialAccount = {
      ...editingAccount,
      name: accName.trim(),
      handle: accHandle.trim().startsWith('@') ? accHandle.trim() : `@${accHandle.trim()}`,
      role: accRole.trim(),
      entityType: accEntityType,
      platform: accPlatform
    };

    onEditAccount(updated);
    setEditingAccount(null);
    resetAccForm();
  };

  const startEditingAccount = (acc: OfficialAccount) => {
    setEditingAccount(acc);
    setAccName(acc.name);
    setAccHandle(acc.handle);
    setAccRole(acc.role);
    setAccEntityType(acc.entityType);
    setAccPlatform(acc.platform);
  };

  const resetAccForm = () => {
    setAccName('');
    setAccHandle('');
    setAccRole('');
    setAccEntityType('un_mission');
    setAccPlatform('X / Twitter');
  };

  const handleTriggerLiveRefresh = async () => {
    try {
      setSyncStatusMsg('جاري الاتصال بالمصادر الرسمية وتحديث البيانات...');
      await onRefreshStatements();
      setSyncStatusMsg('تم التحديث بنجاح! تم استجلاب أحدث التصريحات الرسمية.');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err) {
      setSyncStatusMsg('حدث خطأ أثناء الاتصال بمحرك التحديث.');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  const getEntityBadgeStyle = (entityType: OfficialEntityType) => {
    switch (entityType) {
      case 'un_mission':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'eu_mission':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'libyan_leader':
        return 'bg-slate-800 text-white border-slate-700';
      case 'embassy_diplomat':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'sovereignty_body':
      default:
        return 'bg-green-50 text-green-800 border-green-200';
    }
  };

  const getEntityLabel = (entityType: OfficialEntityType) => {
    switch (entityType) {
      case 'un_mission': return 'بعثة أممية';
      case 'eu_mission': return 'اتحاد أوروبي';
      case 'libyan_leader': return 'قيادة شخصية';
      case 'embassy_diplomat': return 'سفارة ودبلوماسية';
      case 'sovereignty_body': return 'مؤسسة سيادية';
      default: return 'جهة رسمية';
    }
  };

  const getImpactBadge = (impact?: StrategicImportanceType | string) => {
    switch (impact) {
      case 'عالي':
      case 'عالي الأهمية':
        return <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded font-bold">تأثير عالي</span>;
      case 'متوسط':
        return <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-bold">تأثير متوسط</span>;
      default:
        return <span className="text-[10px] bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded font-medium">بيان اعتيادي</span>;
    }
  };

  const getReliabilityBadge = (reliability?: string) => {
    switch (reliability) {
      case 'حساب رسمي موثق':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            رسمي موثق
          </span>
        );
      case 'حساب معروف وموثوق نسبيًا':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            معروف وموثوق
          </span>
        );
      case 'حساب مجهول أو جديد':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            حساب مجهول / جديد
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
            غير محدد
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-['Tajawal',sans-serif]">

      {/* Action Notice Toast */}
      {actionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900 font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sync Status Toast */}
      {syncStatusMsg && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 font-bold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
            <span>{syncStatusMsg}</span>
          </div>
          <button onClick={() => setSyncStatusMsg(null)} className="text-amber-700 hover:text-amber-950">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Monitored Accounts Carousel Bar */}
      <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-600" />
            قائمة الحسابات الرسمية المرصودة ({accounts.length}):
          </span>
          {!isReadOnly && (
            <button 
              onClick={() => setShowManageAccountsModal(true)}
              className="text-[11px] text-blue-700 font-bold hover:underline"
            >
              إدارة القائمة بالكامل
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {accounts.map(acc => {
            const statementCount = statements.filter(s => s.accountId === acc.id).length;
            return (
              <div 
                key={acc.id}
                className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between gap-2.5 flex-shrink-0 min-w-[220px] shadow-2xs hover:border-slate-300 transition-all group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl flex-shrink-0">{acc.avatar}</span>
                  <div className="overflow-hidden text-xs">
                    <div className="flex items-center gap-1 font-bold text-slate-800 truncate">
                      <span className="truncate">{acc.name}</span>
                      {acc.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-mono">{acc.handle}</span>
                      <span className="bg-slate-100 text-slate-700 font-bold px-1.5 py-0.2 rounded border border-slate-200">
                        {statementCount} منشور
                      </span>
                    </div>
                  </div>
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { startEditingAccount(acc); }}
                      className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                      title="تعديل الحساب"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingAccountId(acc.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      title="حذف الحساب"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedEntity('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedEntity === 'all'
                ? 'bg-slate-900 text-white font-bold shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            جميع الجهات ({statements.length})
          </button>

          <button
            onClick={() => setSelectedEntity('un_mission')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedEntity === 'un_mission'
                ? 'bg-blue-800 text-white font-bold shadow-sm'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
            }`}
          >
            <span>🇺🇳 البعثات الأممية</span>
          </button>

          <button
            onClick={() => setSelectedEntity('eu_mission')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedEntity === 'eu_mission'
                ? 'bg-indigo-800 text-white font-bold shadow-sm'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
            }`}
          >
            <span>🇪🇺 الاتحاد الأوروبي</span>
          </button>

          <button
            onClick={() => setSelectedEntity('libyan_leader')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedEntity === 'libyan_leader'
                ? 'bg-slate-800 text-white font-bold shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <span>⚔️ القادة والشخصيات الليبية</span>
          </button>

          <button
            onClick={() => setSelectedEntity('embassy_diplomat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedEntity === 'embassy_diplomat'
                ? 'bg-purple-800 text-white font-bold shadow-sm'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
            }`}
          >
            <span>🏛️ السفارات والدبلوماسيون</span>
          </button>

          <button
            onClick={() => setSelectedEntity('sovereignty_body')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 ${
              selectedEntity === 'sovereignty_body'
                ? 'bg-green-800 text-white font-bold shadow-sm'
                : 'bg-green-50 hover:bg-green-100 text-green-800 border border-green-200'
            }`}
          >
            <span>🛢️ الجهات السيادية</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="w-full md:w-64 relative">
          <input
            type="text"
            placeholder="بحث وتصفية المنشورات..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-xs text-slate-800 focus:outline-none focus:border-slate-400 font-medium"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
        </div>

      </div>

      {/* Feed List */}
      {filteredStatements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500 shadow-sm space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-base font-bold text-slate-700">
            {viewTab === 'pending' ? 'لا توجد منشورات بانتظار المراجعة حاليًا.' : 'لا توجد منشورات تطابق التصفية الحالية.'}
          </p>
          <p className="text-xs text-slate-400">
            {viewTab === 'pending'
              ? 'عند إدخال منشور جديد يدوياً، سيظهر هنا أولاً للاختبار والمراجعة قبل اعتماده.'
              : 'يمكنك استخدام زر "إضافة منشور يدوي" أو "تحديث حي" لاستجلاب البيانات.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredStatements.map(stmt => {
            const isAnalyzing = isAnalyzingId === stmt.id;
            const isPending = stmt.status === 'pending_review';

            return (
              <div
                key={stmt.id}
                className={`bg-white border rounded-xl p-4 shadow-sm hover:shadow transition-all group relative ${
                  isPending ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                
                {/* PENDING REVIEW NOTICE BANNER FOR EDITOR VIEW */}
                {isPending && (
                  <div className="mb-3 bg-amber-500 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-950 flex-shrink-0 animate-pulse" />
                      <span>مُدخَل يدوياً — بانتظار المراجعة والاعتماد (مخفي من واجهة العرض الرئاسية)</span>
                    </div>

                    {!isReadOnly && (
                      <button
                        onClick={() => handlePublishToPresidential(stmt.id)}
                        className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded text-xs font-extrabold flex items-center gap-1.5 shadow transition-all"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                        <span>نشر للعرض الرئاسي</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Account Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-2xl flex-shrink-0">
                      {accounts.find(a => a.id === stmt.accountId)?.avatar || '🏛️'}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{stmt.accountName}</span>
                        {stmt.verified && (
                          <span title="حساب موثق رسمياً" className="inline-flex items-center">
                            <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          </span>
                        )}
                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {stmt.accountHandle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {stmt.accountRole}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    
                    {/* Source Reliability Rating Badge */}
                    {getReliabilityBadge(stmt.sourceReliability)}

                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold border ${getEntityBadgeStyle(stmt.entityType)}`}>
                      {getEntityLabel(stmt.entityType)}
                    </span>

                    <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono font-medium">
                      {stmt.platform}
                    </span>

                    {getImpactBadge(stmt.impactLevel)}
                  </div>
                </div>

                {/* Body Content */}
                <div className="py-3 space-y-2">
                  
                  {/* Separate Publishing Date vs System Entry Date display */}
                  <div className="flex items-center gap-4 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>تاريخ النشر الفعلي:</span>
                      <strong className="text-slate-800 font-mono">
                        {new Date(stmt.pubDate).toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' })}
                      </strong>
                    </div>

                    {stmt.entryDate && (
                      <div className="flex items-center gap-1 font-medium text-slate-400 border-r border-slate-200 pr-4">
                        <span>تاريخ الإدخال بالنظام:</span>
                        <span className="font-mono">
                          {new Date(stmt.entryDate).toLocaleString('ar-LY', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {stmt.title && (
                    <h3 className="font-bold text-slate-900 text-sm leading-snug pt-1">
                      {cleanText(stmt.title)}
                    </h3>
                  )}

                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50/80 p-3 rounded-lg border border-slate-200 font-sans">
                    "{cleanText(stmt.content)}"
                  </p>

                  {/* Tags */}
                  {stmt.tags && stmt.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Tag className="w-3 h-3" /> الوسوم:
                      </span>
                      {stmt.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* AI Summary / Analysis Box */}
                  {stmt.summary && (
                    <div className="mt-2 bg-amber-50/90 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 leading-relaxed space-y-1">
                      <div className="font-bold text-amber-950 flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>تحليل ملخص المنشور بالذكاء الاصطناعي:</span>
                      </div>
                      <div className="markdown-body text-xs text-amber-950 leading-relaxed font-sans">
                        <ReactMarkdown>{stmt.summary}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="border-t border-slate-100 pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  
                  <div className="flex items-center gap-2">
                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopyStatement(stmt)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all font-medium"
                      title="نسخ نص البيان للتقرير"
                    >
                      {copiedId === stmt.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-700 font-bold">تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>نسخ النص</span>
                        </>
                      )}
                    </button>

                    {/* Gemini AI Analysis button */}
                    <button
                      onClick={() => onAnalyzeStatement(stmt)}
                      disabled={isAnalyzing}
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all font-bold"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-amber-600' : 'text-amber-600'}`} />
                      <span>{isAnalyzing ? 'جاري التحليل...' : 'إعادة التحليل بالـ AI'}</span>
                    </button>

                    {/* Publish Button for Editor Mode if Pending */}
                    {!isReadOnly && isPending && (
                      <button
                        onClick={() => handlePublishToPresidential(stmt.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-extrabold transition-all shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5 text-emerald-400" />
                        <span>اعتماد ونشر للرئيس</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Source Link */}
                    {stmt.link && (
                      <a
                        href={stmt.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all text-[11px]"
                      >
                        <span>المصدر الأصلي</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    )}

                    {/* Bookmark */}
                    <button
                      onClick={() => onToggleBookmark(stmt.id)}
                      className={`p-1.5 rounded transition-all border ${
                        stmt.isBookmarked
                          ? 'bg-slate-800 text-white border-slate-700'
                          : 'bg-slate-100 text-slate-500 hover:text-slate-800 border-slate-200'
                      }`}
                      title={stmt.isBookmarked ? 'إزالة من الحفظ' : 'حفظ التغيير'}
                    >
                      {stmt.isBookmarked ? (
                        <BookmarkCheck className="w-4 h-4 fill-white text-white" />
                      ) : (
                        <Bookmark className="w-4 h-4" />
                      )}
                    </button>

                    {/* Delete Statement (Editor Mode) */}
                    {!isReadOnly && onDeleteStatement && (
                      <button
                        onClick={() => setDeletingStatementId(stmt.id)}
                        className="p-1.5 rounded bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all"
                        title="حذف هذا المنشور"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Add New Account */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            
            <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-bold">إضافة حساب رسمي جديد للرصد</h3>
              </div>
              <button
                onClick={() => setShowAddAccountModal(false)}
                className="p-1 rounded text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4 bg-white text-xs">
              
              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم الجهة أو الشخصية الرسمية:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: بعثة منظمة الصحة العالمية في ليبيا"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">المعرف الرسمي (Handle):</label>
                  <input
                    type="text"
                    required
                    placeholder="@WHOLibya"
                    value={accHandle}
                    onChange={(e) => setAccHandle(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الصفة والمسئولية:</label>
                  <input
                    type="text"
                    placeholder="مثال: بعثة أممية متخصصة"
                    value={accRole}
                    onChange={(e) => setAccRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تصنيف الكيان:</label>
                  <select
                    value={accEntityType}
                    onChange={(e) => setAccEntityType(e.target.value as OfficialEntityType)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
                  >
                    <option value="un_mission">🇺🇳 بعثة أممية</option>
                    <option value="eu_mission">🇪🇺 اتحاد أوروبي / إقليمي</option>
                    <option value="libyan_leader">⚔️ قيادة / شخصية ليبية</option>
                    <option value="embassy_diplomat">🏛️ سفارة / دبلوماسي</option>
                    <option value="sovereignty_body">🛢️ جهة سيادية</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">منصة النشر الأساسية:</label>
                  <select
                    value={accPlatform}
                    onChange={(e) => setAccPlatform(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
                  >
                    <option value="X / Twitter">X / Twitter</option>
                    <option value="Facebook">Facebook</option>
                    <option value="بيان صحفي">بيان صحفي رسمي</option>
                    <option value="Telegram">Telegram</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-medium hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded shadow-sm"
                >
                  إضافة الحساب
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 2: Edit Account Details */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
            
            <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-bold">تعديل بيانات الحساب الرسمي: {editingAccount.name}</h3>
              </div>
              <button
                onClick={() => setEditingAccount(null)}
                className="p-1 rounded text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAccount} className="p-6 space-y-4 bg-white text-xs">
              
              <div>
                <label className="block font-semibold text-slate-700 mb-1">اسم الجهة أو الشخصية:</label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">المعرف (Handle):</label>
                  <input
                    type="text"
                    required
                    value={accHandle}
                    onChange={(e) => setAccHandle(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">الصفة الرسمية:</label>
                  <input
                    type="text"
                    value={accRole}
                    onChange={(e) => setAccRole(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">تصنيف الكيان:</label>
                  <select
                    value={accEntityType}
                    onChange={(e) => setAccEntityType(e.target.value as OfficialEntityType)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
                  >
                    <option value="un_mission">🇺🇳 بعثة أممية</option>
                    <option value="eu_mission">🇪🇺 اتحاد أوروبي / إقليمي</option>
                    <option value="libyan_leader">⚔️ قيادة / شخصية ليبية</option>
                    <option value="embassy_diplomat">🏛️ سفارة / دبلوماسي</option>
                    <option value="sovereignty_body">🛢️ جهة سيادية</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">المنصة:</label>
                  <select
                    value={accPlatform}
                    onChange={(e) => setAccPlatform(e.target.value as any)}
                    className="w-full bg-white border border-slate-200 rounded px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
                  >
                    <option value="X / Twitter">X / Twitter</option>
                    <option value="Facebook">Facebook</option>
                    <option value="بيان صحفي">بيان صحفي رسمي</option>
                    <option value="Telegram">Telegram</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded font-medium hover:bg-slate-200"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded shadow-sm"
                >
                  حفظ التغييرات
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL 3: Manage Accounts Manager (Full Table View) */}
      {showManageAccountsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            
            <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="text-base font-bold">إدارة وحذف/تعديل الحسابات المرصودة</h3>
                  <p className="text-xs text-slate-300">التحكم الكامل في البعثات الدبلوماسية والقادة المستهدفين في الرصد</p>
                </div>
              </div>
              <button
                onClick={() => setShowManageAccountsModal(false)}
                className="p-1 rounded text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-slate-50">
              {accounts.map((acc) => (
                <div key={acc.id} className="bg-white border border-slate-200 rounded p-3 flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{acc.avatar}</span>
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
                        <span>{acc.name}</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                          {acc.handle}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{acc.role} - <span className="font-semibold">{getEntityLabel(acc.entityType)}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => { startEditingAccount(acc); }}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3 text-slate-500" />
                      <span>تعديل</span>
                    </button>

                    <button
                      onClick={() => {
                        onDeleteAccount(acc.id);
                      }}
                      className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white px-6 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => { resetAccForm(); setShowAddAccountModal(true); }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة حساب جديد</span>
              </button>

              <button
                onClick={() => setShowManageAccountsModal(false)}
                className="px-4 py-1.5 bg-slate-100 text-slate-700 rounded text-xs font-bold hover:bg-slate-200"
              >
                إغلاق
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL 4: Delete Account Confirmation */}
      {deletingAccountId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف الحساب من قائمة الرصد</h3>
              <p className="text-xs text-slate-500 mt-1">
                هل أنت تأكد من إزالة هذا الحساب؟ لن يتم تتبع التصريحات الخاصة به مستقبلاً.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingAccountId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  onDeleteAccount(deletingAccountId);
                  setDeletingAccountId(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold shadow-sm"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Statement Confirmation */}
      {deletingStatementId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-xl overflow-hidden p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف المنشور من السجل</h3>
              <p className="text-xs text-slate-500 mt-1">
                هل أنت متاكد من حذف هذا المنشور؟
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingStatementId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  if (onDeleteStatement) {
                    onDeleteStatement(deletingStatementId);
                  }
                  setDeletingStatementId(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold shadow-sm"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: Manual Post Modal */}
      <ManualPostModal
        isOpen={showManualPostModal}
        onClose={() => setShowManualPostModal(false)}
        accounts={accounts}
        onAddStatement={onAddStatement}
        onAddPopularPost={onAddPopularPost || (() => {})}
        initialTargetSection="official"
        onOpenBulkImport={onOpenBulkImport}
      />

    </div>
  );
};
