import React, { useState } from 'react';
import { useAuth, UserRole } from '../context/AuthContext';
import { 
  ShieldAlert, 
  Lock, 
  UserCheck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Crown, 
  Edit3, 
  Sparkles,
  ShieldCheck,
  Building2,
  FileText
} from 'lucide-react';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { isAuthenticated, login } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole>('presidential');
  const [password, setPassword] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      const res = login(selectedRole, password, username);
      if (!res.success) {
        setErrorMsg(res.message || 'خطأ في عملية تسجيل الدخول');
      }
      setIsLoading(false);
    }, 450);
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 font-['Tajawal',sans-serif] selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      
      {/* Background Graphic Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 pointer-events-none"></div>

      {/* Subtle Glow Effects */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-xl bg-slate-900 border-2 border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10 my-8">
        
        {/* Top Header Banner */}
        <div className="bg-slate-950 p-6 border-b border-slate-800 text-center space-y-3 relative">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-slate-900 border-2 border-amber-500/50 rounded-2xl flex items-center justify-center mx-auto text-amber-400 shadow-xl">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide">
              منظومة الرصد والتحليل الإعلامي الاستراتيجي
            </h1>
            <p className="text-xs text-amber-400 font-bold mt-1">
              القيادة العامة للقوات المسلحة - نظام توجيه الصلاحيات
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-[11px] text-slate-300 border border-slate-800 font-mono">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>نظام محصّن بـ 2 مستويات دخول مستقلة</span>
          </div>
        </div>

        {/* Level Switcher Selector */}
        <div className="p-6 bg-slate-900/90 space-y-6">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3 text-center">
              اختر مستوى الوصول المطلوب
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              {/* Option 1: Presidential View */}
              <button
                type="button"
                onClick={() => handleRoleSelect('presidential')}
                className={`p-4 rounded-xl border-2 text-right transition-all flex flex-col justify-between relative overflow-hidden group ${
                  selectedRole === 'presidential'
                    ? 'border-amber-500 bg-amber-500/10 text-white shadow-lg ring-1 ring-amber-500/50'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {selectedRole === 'presidential' && (
                  <span className="absolute top-0 right-0 bg-amber-500 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-bl">
                    المحدد حالياً
                  </span>
                )}
                
                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${selectedRole === 'presidential' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-amber-300">واجهة العرض الرئاسي</h3>
                    <p className="text-[10px] text-slate-400">Presidential Read-Only View</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2 mt-1">
                  وضع <span className="text-amber-400 font-bold">"قراءة فقط"</span> بالكامل للقيادات العليا. لا تحوي أي أزرار تعديل أو إدخال أو حذف إطلاقاً.
                </p>
              </button>

              {/* Option 2: Developer/Editor View */}
              <button
                type="button"
                onClick={() => handleRoleSelect('editor')}
                className={`p-4 rounded-xl border-2 text-right transition-all flex flex-col justify-between relative overflow-hidden group ${
                  selectedRole === 'editor'
                    ? 'border-sky-500 bg-sky-500/10 text-white shadow-lg ring-1 ring-sky-500/50'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {selectedRole === 'editor' && (
                  <span className="absolute top-0 right-0 bg-sky-500 text-slate-950 text-[9px] font-extrabold px-2 py-0.5 rounded-bl">
                    المحدد حالياً
                  </span>
                )}

                <div className="flex items-center gap-2 mb-2">
                  <div className={`p-2 rounded-lg ${selectedRole === 'editor' ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-sky-300">واجهة المُدخِل والمُحرر</h3>
                    <p className="text-[10px] text-slate-400">Developer / Operational View</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed border-t border-slate-800/80 pt-2 mt-1">
                  تحتوي على كل أدوات <span className="text-sky-400 font-bold">الإضافة والتعديل والحذف</span> وربط شيتات جوجل والكلمات المفتاحية.
                </p>
              </button>

            </div>
          </div>

          {/* Form Credentials Input */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
            
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/40 rounded-lg text-xs text-rose-300 flex items-start gap-2 animate-fadeIn">
                <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">الصفة / الاسم (اختياري)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={selectedRole === 'presidential' ? 'مثال: سيادة القائد العام' : 'مثال: مهندس رصد وتجميع'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                  <UserCheck className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  رمز الدخول (PIN) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="أدخل رمز الدخول"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono text-center tracking-widest text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-extrabold shadow-lg transition-all text-xs flex items-center justify-center gap-2 ${
                selectedRole === 'presidential'
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
              }`}
            >
              {isLoading ? (
                <span>جاري فتح الواجهة وتوثيق الصلاحية...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>
                    الدخول إلى {selectedRole === 'presidential' ? 'واجهة العرض الرئاسي (قراءة فقط)' : 'واجهة المُدخِل والمُحرر (صلاحيات كاملة)'}
                  </span>
                </>
              )}
            </button>

          </form>

        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 text-center text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span>ROLE-BASED ACCESS CONTROL (RBAC)</span>
          <span className="text-amber-500/90 font-bold">القيادة العامة - 2026</span>
        </div>

      </div>
    </div>
  );
};
