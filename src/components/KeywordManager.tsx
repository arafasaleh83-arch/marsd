import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Tag, Plus, X, Check, Eye, Crown } from 'lucide-react';

interface KeywordManagerProps {
  isOpen: boolean;
  onClose: () => void;
  keywords: string[];
  onUpdateKeywords: (newKeywords: string[]) => void;
}

export const KeywordManager: React.FC<KeywordManagerProps> = ({
  isOpen,
  onClose,
  keywords,
  onUpdateKeywords
}) => {
  const { isReadOnly } = useAuth();
  const [newKeywordInput, setNewKeywordInput] = useState<string>('');

  const suggestedPresets = [
    'ليبيا',
    'حفتر',
    'القيادة العامة للقوات المسلحة',
    'بنغازي',
    'طرابلس',
    'المؤسسة الوطنية للنفط',
    'مجلس النواب',
    'المجلس الرئاسي',
    'صندوق إعادة الإعمار',
    'حرس المنشآت النفطية',
    'الجنوب الليبي',
    'الهجرة غير الشرعية'
  ];

  if (!isOpen) return null;

  const handleAddKeyword = (kwToAdd?: string) => {
    if (isReadOnly) return;
    const val = (kwToAdd || newKeywordInput).trim();
    if (!val) return;
    if (!keywords.includes(val)) {
      onUpdateKeywords([...keywords, val]);
    }
    setNewKeywordInput('');
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    if (isReadOnly) return;
    if (keywords.length <= 1) {
      alert('يجب الإبقاء على كلمة مفتاحية واحدة على الأقل في استعلام الرصد.');
      return;
    }
    onUpdateKeywords(keywords.filter(k => k !== kwToRemove));
  };

  // Build current query string
  const generatedQuery = keywords
    .map(k => (k.includes(' ') ? `"${k}"` : k))
    .join(' OR ');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto font-['Tajawal',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 shadow-inner">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>إدارة الكلمات المفتاحية ومواضيع الرصد</span>
                {isReadOnly && (
                  <span className="text-[10px] bg-amber-500 text-slate-950 font-extrabold px-2 py-0.5 rounded flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    عرض رئاسي
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-300">الكلمات المستهدفة والمواضيع المعتمدة في جلب الأخبار</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Notice for Presidential View */}
        {isReadOnly && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 font-bold flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>أنت في واجهة العرض الرئاسي (وضع قراءة فقط). يمكنك استعراض الكلمات دون تعديلها.</span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 space-y-5 bg-white">
          
          {/* Input field (Only for Editor/Developer) */}
          {!isReadOnly && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">إضافة كلمة مفتاحية جديدة:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="مثال: الجيش الليبي، بنغازي، النفط..."
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                  className="flex-1 bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400"
                />
                <button
                  onClick={() => handleAddKeyword()}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>
          )}

          {/* Active Keywords list */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">الكلمات المفتاحية النشطة حالياً:</label>
            <div className="flex flex-wrap gap-2 p-3.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[60px]">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="inline-flex items-center gap-1.5 bg-slate-200 text-slate-900 border border-slate-300 text-xs px-3 py-1 rounded-full font-bold shadow-xs"
                >
                  <span>{kw}</span>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleRemoveKeyword(kw)}
                      className="hover:bg-slate-300 rounded-full p-0.5 text-slate-600 hover:text-slate-900 transition-colors"
                      title="حذف"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Preset Suggestions (Only in Editor/Developer mode) */}
          {!isReadOnly && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500">مقترحات شائعة للرصد الليبي:</label>
              <div className="flex flex-wrap gap-1.5">
                {suggestedPresets.map((preset) => {
                  const isSelected = keywords.includes(preset);
                  return (
                    <button
                      key={preset}
                      onClick={() => isSelected ? handleRemoveKeyword(preset) : handleAddKeyword(preset)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                        isSelected
                          ? 'bg-slate-800 text-white border-slate-700 font-bold'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Preview RSS Query */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1 text-xs">
            <span className="text-slate-500 text-[11px] font-bold">صيغة الاستعلام المعتمدة في محرك البحث:</span>
            <p className="font-mono text-slate-800 text-[11px] break-all bg-white p-2.5 rounded border border-slate-200">
              {generatedQuery}
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            {isReadOnly ? 'معاينة معتمدة للرصد الاستراتيجي.' : 'سيتم تطبيق الكلمات وتأثيرها على النتائج الحية.'}
          </span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2 rounded-lg text-xs transition-all shadow-sm"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
