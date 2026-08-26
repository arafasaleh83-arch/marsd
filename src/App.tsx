import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NewsArticle, MediaMetrics, OfficialAccount, OfficialStatement, PopularMoodPost } from './types';
import { INITIAL_OFFICIAL_ACCOUNTS, INITIAL_OFFICIAL_STATEMENTS } from './data/officialAccountsData';
import { INITIAL_POPULAR_MOOD_POSTS } from './data/popularMoodData';
import { FALLBACK_NEWS_ARTICLES } from './data/fallbackNewsData';
import { 
  subscribeOfficialStatements, 
  subscribePopularMoodPosts, 
  subscribeOfficialAccounts, 
  saveOfficialStatementToDb, 
  deleteOfficialStatementFromDb, 
  savePopularMoodPostToDb, 
  deletePopularMoodPostFromDb, 
  saveOfficialAccountToDb, 
  deleteOfficialAccountFromDb, 
  initializeDefaultAccountsIfEmpty,
  cleanupLegacyPlaceholderPosts
} from './lib/firebase';
import { Header } from './components/Header';
import { MetricsCards } from './components/MetricsCards';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { NewsFeed } from './components/NewsFeed';
import { OfficialAccountsFeed } from './components/OfficialAccountsFeed';
import { PopularMoodFeed } from './components/PopularMoodFeed';
import { ManualPostModal } from './components/ManualPostModal';
import { GoogleSheetsIntegration } from './components/GoogleSheetsIntegration';
import { AIBriefingModal } from './components/AIBriefingModal';
import { ExecutiveReportModal } from './components/ExecutiveReportModal';
import { KeywordManager } from './components/KeywordManager';
import { BulkImportModal } from './components/BulkImportModal';
import { AuthGate } from './components/AuthGate';
import { AuthProvider } from './context/AuthContext';
import { LibyaStreetPulseMap } from './components/LibyaStreetPulseMap';
import { Activity, ShieldCheck, FileSpreadsheet, RefreshCw, AlertCircle, Newspaper, Building2, BarChart3, Users2, MapPin } from 'lucide-react';

function DashboardApp() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sourceType, setSourceType] = useState<string>('live_rss');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(15); // minutes
  const [keywords, setKeywords] = useState<string[]>(['ليبيا', 'حفتر', 'القيادة العامة للقوات المسلحة']);
  
  // Dashboard main tab view: 'all' | 'map' | 'popular_mood' | 'news' | 'official' | 'analytics'
  const [activeMainTab, setActiveMainTab] = useState<'all' | 'map' | 'popular_mood' | 'news' | 'official' | 'analytics'>('all');

  // Official accounts and statements state with Firestore realtime persistence
  const [officialAccounts, setOfficialAccounts] = useState<OfficialAccount[]>(INITIAL_OFFICIAL_ACCOUNTS);
  const [officialStatements, setOfficialStatements] = useState<OfficialStatement[]>([]);
  const [popularMoodPosts, setPopularMoodPosts] = useState<PopularMoodPost[]>([]);

  const [isRefreshingOfficial, setIsRefreshingOfficial] = useState<boolean>(false);
  const [isRefreshingStreetPulse, setIsRefreshingStreetPulse] = useState<boolean>(false);
  const [isManualPopularModalOpen, setIsManualPopularModalOpen] = useState<boolean>(false);
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState<boolean>(false);

  // Subscribe to Firestore Collections
  useEffect(() => {
    // Seed default accounts if empty, and remove any legacy default placeholder posts
    initializeDefaultAccountsIfEmpty(INITIAL_OFFICIAL_ACCOUNTS);
    cleanupLegacyPlaceholderPosts();

    const unsubscribeStatements = subscribeOfficialStatements((statements) => {
      // Keep only manually created / imported statements
      const manualOnlyStatements = statements.filter(s => !s.id.startsWith('stmt-dummy') && !s.id.startsWith('statement_00'));
      setOfficialStatements(manualOnlyStatements);
    });

    const unsubscribePopular = subscribePopularMoodPosts((posts) => {
      // Keep only manually uploaded / imported posts
      const manualOnlyPosts = posts.filter(p => !p.id.startsWith('pulse_00'));
      setPopularMoodPosts(manualOnlyPosts);
    });

    const unsubscribeAccounts = subscribeOfficialAccounts((accounts) => {
      if (accounts.length > 0) {
        setOfficialAccounts(accounts);
      }
    });

    return () => {
      unsubscribeStatements();
      unsubscribePopular();
      unsubscribeAccounts();
    };
  }, []);

  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('libya_news_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [analyzingArticleId, setAnalyzingArticleId] = useState<string | null>(null);
  const [analyzingStatementId, setAnalyzingStatementId] = useState<string | null>(null);

  // Modals state
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState<boolean>(false);
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState<boolean>(false);
  const [isExecutiveReportModalOpen, setIsExecutiveReportModalOpen] = useState<boolean>(false);
  const [isKeywordsModalOpen, setIsKeywordsModalOpen] = useState<boolean>(false);

  const [activeGoogleQuery, setActiveGoogleQuery] = useState<string>('');

  // Build current query string
  const currentQuery = useMemo(() => {
    if (activeGoogleQuery) return activeGoogleQuery;
    return keywords.map(k => (k.includes(' ') ? `"${k}"` : k)).join(' OR ');
  }, [keywords, activeGoogleQuery]);

  // Fetch news articles from server RSS endpoint
  const fetchNewsFeed = useCallback(async (overrideQuery?: string) => {
    setIsLoading(true);
    try {
      const q = overrideQuery !== undefined ? overrideQuery : currentQuery;
      const res = await fetch(`/api/news/rss?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Invalid content-type: ${contentType}`);
      }
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.articles)) {
        const updated = data.articles.map((art: NewsArticle) => ({
          ...art,
          isBookmarked: bookmarkedIds.includes(art.id)
        }));
        setArticles(updated);
        setSourceType(data.sourceType || 'live_rss');
        return;
      }
      setArticles([]);
    } catch (error) {
      console.warn('Failed to fetch news feed from live RSS API:', error);
      setArticles([]);
      setSourceType('live_rss');
    } finally {
      setIsLoading(false);
      setLastUpdatedTime(new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [currentQuery, bookmarkedIds]);

  const handleSearchGoogleNews = (q: string) => {
    setActiveGoogleQuery(q);
    fetchNewsFeed(q);
  };

  // Initial load
  useEffect(() => {
    fetchNewsFeed();
  }, [currentQuery]);

  // Auto refresh timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const intervalMs = autoRefreshInterval * 60 * 1000;
    const timer = setInterval(() => {
      fetchNewsFeed();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [autoRefreshInterval, fetchNewsFeed]);

  // Save bookmarks
  useEffect(() => {
    try {
      localStorage.setItem('libya_news_bookmarks', JSON.stringify(bookmarkedIds));
    } catch (e) {
      console.error('Failed to save bookmarks:', e);
    }
  }, [bookmarkedIds]);

  // Toggle bookmark handler
  const handleToggleBookmark = (id: string) => {
    setBookmarkedIds(prev => {
      const exists = prev.includes(id);
      const updated = exists ? prev.filter(x => x !== id) : [...prev, id];
      return updated;
    });

    setArticles(prev => prev.map(art => art.id === id ? { ...art, isBookmarked: !art.isBookmarked } : art));
  };

  // Analyze specific article with Gemini API
  const handleAnalyzeArticle = async (article: NewsArticle) => {
    setAnalyzingArticleId(article.id);
    try {
      const res = await fetch('/api/news/analyze-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          snippet: article.snippet || article.title,
          source: article.source
        })
      });

      const data = await res.json();
      if (data.status === 'success' && data.analysis) {
        const { sentiment, sentimentScore, category, summary } = data.analysis;
        setArticles(prev => prev.map(a => a.id === article.id ? {
          ...a,
          sentiment,
          sentimentScore,
          category,
          summary
        } : a));
      }
    } catch (err) {
      console.error('Error analyzing article:', err);
    } finally {
      setAnalyzingArticleId(null);
    }
  };

  // Toggle official statement bookmark handler
  const handleToggleStatementBookmark = (id: string) => {
    const target = officialStatements.find(s => s.id === id);
    if (target) {
      saveOfficialStatementToDb({ ...target, isBookmarked: !target.isBookmarked });
    }
  };

  // Analyze official statement with Gemini
  const handleAnalyzeStatement = async (statement: OfficialStatement) => {
    setAnalyzingStatementId(statement.id);
    try {
      const res = await fetch('/api/news/analyze-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: statement.title || statement.accountName,
          snippet: statement.content,
          source: statement.accountName
        })
      });

      const data = await res.json();
      if (data.status === 'success' && data.analysis) {
        saveOfficialStatementToDb({
          ...statement,
          summary: data.analysis.summary,
          sentiment: data.analysis.sentiment
        });
      }
    } catch (err) {
      console.error('Error analyzing statement:', err);
    } finally {
      setAnalyzingStatementId(null);
    }
  };

  // Add custom account handler
  const handleAddOfficialAccount = (newAccount: OfficialAccount) => {
    saveOfficialAccountToDb(newAccount);
  };

  // Edit official account handler
  const handleEditOfficialAccount = (updatedAccount: OfficialAccount) => {
    saveOfficialAccountToDb(updatedAccount);
  };

  // Delete official account handler
  const handleDeleteOfficialAccount = (accountId: string) => {
    deleteOfficialAccountFromDb(accountId);
  };

  // Live Refresh official statements from server API
  const handleRefreshOfficialStatements = async () => {
    setIsRefreshingOfficial(true);
    try {
      const sanitizedAccounts = officialAccounts.map(a => ({
        id: a.id,
        name: a.name,
        handle: a.handle,
        role: a.role,
        entityType: a.entityType,
        platform: a.platform
      }));

      const resp = await fetch('/api/official/fetch-statements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: sanitizedAccounts })
      });

      if (!resp.ok) {
        console.error('Failed to refresh official statements, status:', resp.status);
        return;
      }

      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.error('Response was not JSON');
        return;
      }

      const data = await resp.json();
      if (data.status === 'success' && Array.isArray(data.statements) && data.statements.length > 0) {
        for (const stmt of data.statements) {
          saveOfficialStatementToDb(stmt);
        }
      }
    } catch (err) {
      console.error('Failed to refresh official statements:', err);
    } finally {
      setIsRefreshingOfficial(false);
    }
  };

  // Add manual official statement (published immediately)
  const handleAddOfficialStatement = (newStatement: OfficialStatement) => {
    saveOfficialStatementToDb({
      ...newStatement,
      status: 'published',
      publishedAt: newStatement.publishedAt || new Date().toISOString()
    });
  };

  // Publish manual statement to Presidential View
  const handlePublishStatement = (statementId: string) => {
    const target = officialStatements.find(s => s.id === statementId);
    if (target) {
      saveOfficialStatementToDb({
        ...target,
        status: 'published',
        publishedAt: new Date().toISOString()
      });
    }
  };

  // Delete individual official statement
  const handleDeleteOfficialStatement = (statementId: string) => {
    deleteOfficialStatementFromDb(statementId);
  };

  // Popular Mood Handlers
  const handleTogglePopularBookmark = (id: string) => {
    const target = popularMoodPosts.find(p => p.id === id);
    if (target) {
      savePopularMoodPostToDb({ ...target, isBookmarked: !target.isBookmarked });
    }
  };

  const handleAddPopularPost = (newPost: PopularMoodPost) => {
    savePopularMoodPostToDb({
      ...newPost,
      status: 'published',
      publishedAt: newPost.publishedAt || new Date().toISOString()
    });
  };

  const handlePublishPopularPost = (id: string) => {
    const target = popularMoodPosts.find(p => p.id === id);
    if (target) {
      savePopularMoodPostToDb({
        ...target,
        status: 'published',
        publishedAt: new Date().toISOString()
      });
    }
  };

  const handleDeletePopularPost = (id: string) => {
    deletePopularMoodPostFromDb(id);
  };

  // Live Refresh Street Pulse posts from Google Apps Script URL
  const handleRefreshStreetPulse = async () => {
    setIsRefreshingStreetPulse(true);
    try {
      const resp = await fetch('/api/street-pulse/feed');
      if (!resp.ok) {
        throw new Error(`Server returned status ${resp.status}`);
      }
      const data = await resp.json();
      if (data.status === 'success' && Array.isArray(data.posts) && data.posts.length > 0) {
        for (const post of data.posts) {
          savePopularMoodPostToDb(post);
        }
        setPopularMoodPosts(data.posts);
      }
    } catch (err) {
      console.error('Error refreshing street pulse:', err);
    } finally {
      setIsRefreshingStreetPulse(false);
    }
  };

  const handleAnalyzePopularPost = async (post: PopularMoodPost) => {
    try {
      const res = await fetch('/api/news/analyze-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: post.title || post.accountName,
          snippet: post.content,
          source: post.accountName
        })
      });
      const data = await res.json();
      if (data.status === 'success' && data.analysis) {
        savePopularMoodPostToDb({
          ...post,
          summary: data.analysis.summary
        });
      }
    } catch (err) {
      console.error('Error analyzing popular post:', err);
    }
  };

  // Search filter for news
  const searchedArticles = useMemo(() => {
    if (!searchTerm.trim()) return articles;
    const term = searchTerm.toLowerCase();
    return articles.filter(a => 
      a.title.toLowerCase().includes(term) ||
      a.source.toLowerCase().includes(term) ||
      (a.snippet && a.snippet.toLowerCase().includes(term)) ||
      (a.category && a.category.toLowerCase().includes(term))
    );
  }, [articles, searchTerm]);

  // Search filter for official statements
  const searchedStatements = useMemo(() => {
    if (!searchTerm.trim()) return officialStatements;
    const term = searchTerm.toLowerCase();
    return officialStatements.filter(s => 
      s.accountName.toLowerCase().includes(term) ||
      s.accountHandle.toLowerCase().includes(term) ||
      s.content.toLowerCase().includes(term) ||
      (s.title && s.title.toLowerCase().includes(term))
    );
  }, [officialStatements, searchTerm]);

  // Compute metrics dynamically
  const metrics = useMemo<MediaMetrics>(() => {
    const totalArticles = articles.length;

    const sentimentBreakdown = {
      positive: 0,
      neutral: 0,
      negative: 0
    };

    const categoryBreakdown: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};

    articles.forEach(art => {
      // sentiment
      if (art.sentiment === 'positive') sentimentBreakdown.positive++;
      else if (art.sentiment === 'negative') sentimentBreakdown.negative++;
      else sentimentBreakdown.neutral++;

      // category
      const cat = art.category || 'عام';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

      // source
      const src = art.source || 'غير محدد';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });

    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalArticles,
      sentimentBreakdown,
      categoryBreakdown,
      topSources,
      dailyTrend: []
    };
  }, [articles]);

  return (
    <AuthGate>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Tajawal',sans-serif] selection:bg-slate-800 selection:text-white">
        
        {/* App Top Header */}
        <Header
          onRefresh={fetchNewsFeed}
          isLoading={isLoading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          autoRefreshInterval={autoRefreshInterval}
          setAutoRefreshInterval={setAutoRefreshInterval}
          onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          onOpenBriefingModal={() => setIsBriefingModalOpen(true)}
          onOpenExecutiveReportModal={() => setIsExecutiveReportModalOpen(true)}
          onOpenKeywordsModal={() => setIsKeywordsModalOpen(true)}
          lastUpdatedTime={lastUpdatedTime}
          sourceType={sourceType}
        />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Navigation Tabs Bar for Dashboard Sections */}
        <div className="mb-6 bg-white border border-slate-200 rounded p-1.5 shadow-sm flex items-center justify-between overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5">
            
            <button
              onClick={() => setActiveMainTab('all')}
              className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 ${
                activeMainTab === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Activity className="w-4 h-4 text-amber-300" />
              <span>العرض الشامل الموحد</span>
            </button>

            <button
              onClick={() => setActiveMainTab('map')}
              className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 ${
                activeMainTab === 'map'
                  ? 'bg-rose-800 text-white shadow-sm border border-rose-600'
                  : 'bg-rose-50 text-rose-950 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <MapPin className="w-4 h-4 text-rose-500" />
              <span>خريطة بؤر الاحتقان ومزاج الشارع</span>
              <span className="bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded font-mono font-bold animate-pulse">رادار ليبيا</span>
            </button>

            <button
              onClick={() => setActiveMainTab('popular_mood')}
              className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 ${
                activeMainTab === 'popular_mood'
                  ? 'bg-amber-800 text-white shadow-sm border border-amber-600'
                  : 'bg-amber-50/90 text-amber-950 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <Users2 className="w-4 h-4 text-amber-500" />
              <span>رصد المزاج الشعبي والتفاعل الرقمي ({popularMoodPosts.length})</span>
              <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">فيسبوك</span>
            </button>

            <button
              onClick={() => setActiveMainTab('official')}
              className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 ${
                activeMainTab === 'official'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>المصادر والبيانات الرسمية ({searchedStatements.length})</span>
              <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded font-mono">جديد</span>
            </button>

            <button
              onClick={() => setActiveMainTab('news')}
              className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 ${
                activeMainTab === 'news'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Newspaper className="w-4 h-4 text-blue-400" />
              <span>الأخبار الصحفية ({searchedArticles.length})</span>
            </button>

            <button
              onClick={() => setActiveMainTab('analytics')}
              className={`px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2 ${
                activeMainTab === 'analytics'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>التحليلات الاستراتيجية</span>
            </button>


          </div>
        </div>

        {/* View Layouts based on Active Main Tab */}

        {/* 1. All Unified View */}
        {activeMainTab === 'all' && (
          <div className="space-y-8">
            {/* Visual Metrics Row */}
            <MetricsCards metrics={metrics} bookmarkedCount={bookmarkedIds.length} />

            {/* Libya Real Interactive Map of Tension Areas and Street Mood */}
            <LibyaStreetPulseMap
              posts={popularMoodPosts}
              onSelectPost={handleAnalyzePopularPost}
            />

            {/* Official Accounts & International Statements Section */}
            <OfficialAccountsFeed
              statements={searchedStatements}
              accounts={officialAccounts}
              onToggleBookmark={handleToggleStatementBookmark}
              onAnalyzeStatement={handleAnalyzeStatement}
              onAddAccount={handleAddOfficialAccount}
              onEditAccount={handleEditOfficialAccount}
              onDeleteAccount={handleDeleteOfficialAccount}
              onDeleteStatement={handleDeleteOfficialStatement}
              onRefreshStatements={handleRefreshOfficialStatements}
              onAddStatement={handleAddOfficialStatement}
              onAddPopularPost={handleAddPopularPost}
              onPublishStatement={handlePublishStatement}
              isAnalyzingId={analyzingStatementId}
              isRefreshing={isRefreshingOfficial}
            />

            {/* Popular Mood & Social Media Unverified Section */}
            <PopularMoodFeed
              posts={popularMoodPosts}
              onToggleBookmark={handleTogglePopularBookmark}
              onAnalyzePost={handleAnalyzePopularPost}
              onAddPost={() => setIsManualPopularModalOpen(true)}
              onDeletePost={handleDeletePopularPost}
              onPublishPost={handlePublishPopularPost}
              onRefreshStreetPulse={handleRefreshStreetPulse}
              isRefreshing={isRefreshingStreetPulse}
            />

            {/* Analytics Charts Row */}
            <AnalyticsCharts metrics={metrics} />

            {/* Main News Feed Stream */}
            <NewsFeed
              articles={searchedArticles}
              onToggleBookmark={handleToggleBookmark}
              onAnalyzeArticle={handleAnalyzeArticle}
              analyzingArticleId={analyzingArticleId}
              onSearchGoogleNews={handleSearchGoogleNews}
              currentQuery={currentQuery}
              isLoading={isLoading}
              sourceType={sourceType}
              onRefresh={() => fetchNewsFeed()}
            />
          </div>
        )}

        {/* 2. Map Only View (Dedicated Libya Radar & Geographic Tension Hotspots) */}
        {activeMainTab === 'map' && (
          <div className="space-y-6">
            <LibyaStreetPulseMap
              posts={popularMoodPosts}
              onSelectPost={handleAnalyzePopularPost}
            />

            <PopularMoodFeed
              posts={popularMoodPosts}
              onToggleBookmark={handleTogglePopularBookmark}
              onAnalyzePost={handleAnalyzePopularPost}
              onAddPost={() => setIsManualPopularModalOpen(true)}
              onDeletePost={handleDeletePopularPost}
              onPublishPost={handlePublishPopularPost}
              onOpenBulkImport={() => setIsBulkImportModalOpen(true)}
              onRefreshStreetPulse={handleRefreshStreetPulse}
              isRefreshing={isRefreshingStreetPulse}
            />
          </div>
        )}

        {/* 3. News Feed Only View */}
        {activeMainTab === 'news' && (
          <div className="space-y-6">
            <NewsFeed
              articles={searchedArticles}
              onToggleBookmark={handleToggleBookmark}
              onAnalyzeArticle={handleAnalyzeArticle}
              analyzingArticleId={analyzingArticleId}
              onSearchGoogleNews={handleSearchGoogleNews}
              currentQuery={currentQuery}
              isLoading={isLoading}
              sourceType={sourceType}
              onRefresh={() => fetchNewsFeed()}
            />
          </div>
        )}

        {/* 4. Official Accounts & Statements Feed Only View */}
        {activeMainTab === 'official' && (
          <div className="space-y-6">
            <OfficialAccountsFeed
              statements={searchedStatements}
              accounts={officialAccounts}
              onToggleBookmark={handleToggleStatementBookmark}
              onAnalyzeStatement={handleAnalyzeStatement}
              onAddAccount={handleAddOfficialAccount}
              onEditAccount={handleEditOfficialAccount}
              onDeleteAccount={handleDeleteOfficialAccount}
              onDeleteStatement={handleDeleteOfficialStatement}
              onRefreshStatements={handleRefreshOfficialStatements}
              onAddStatement={handleAddOfficialStatement}
              onAddPopularPost={handleAddPopularPost}
              onPublishStatement={handlePublishStatement}
              onOpenBulkImport={() => setIsBulkImportModalOpen(true)}
              isAnalyzingId={analyzingStatementId}
              isRefreshing={isRefreshingOfficial}
            />
          </div>
        )}

        {/* 5. Popular Mood Only View */}
        {activeMainTab === 'popular_mood' && (
          <div className="space-y-6">
            <LibyaStreetPulseMap
              posts={popularMoodPosts}
              onSelectPost={handleAnalyzePopularPost}
            />

            <PopularMoodFeed
              posts={popularMoodPosts}
              onToggleBookmark={handleTogglePopularBookmark}
              onAnalyzePost={handleAnalyzePopularPost}
              onAddPost={() => setIsManualPopularModalOpen(true)}
              onDeletePost={handleDeletePopularPost}
              onPublishPost={handlePublishPopularPost}
              onOpenBulkImport={() => setIsBulkImportModalOpen(true)}
              onRefreshStreetPulse={handleRefreshStreetPulse}
              isRefreshing={isRefreshingStreetPulse}
            />
          </div>
        )}


        {/* 5. Analytics Only View */}
        {activeMainTab === 'analytics' && (
          <div className="space-y-6">
            <MetricsCards metrics={metrics} bookmarkedCount={bookmarkedIds.length} />
            <AnalyticsCharts metrics={metrics} />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-700" />
            <span className="font-bold text-slate-800">منظومة الرصد الإخباري المستمر</span>
            <span className="text-slate-300">|</span>
            <span>المرصد الإعلامي الليبي</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            مدعوم بـ Google News RSS و Gemini AI &amp; Google Apps Script Integration
          </p>
        </div>
      </footer>

      {/* Modals */}
      <GoogleSheetsIntegration
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        articles={articles}
      />

      <AIBriefingModal
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        articles={articles}
        targetKeywords={keywords}
      />

      <ExecutiveReportModal
        isOpen={isExecutiveReportModalOpen}
        onClose={() => setIsExecutiveReportModalOpen(false)}
        articles={articles}
        statements={officialStatements}
      />

      <KeywordManager
        isOpen={isKeywordsModalOpen}
        onClose={() => setIsKeywordsModalOpen(false)}
        keywords={keywords}
        onUpdateKeywords={setKeywords}
      />

      <ManualPostModal
        isOpen={isManualPopularModalOpen}
        onClose={() => setIsManualPopularModalOpen(false)}
        accounts={officialAccounts}
        onAddStatement={handleAddOfficialStatement}
        onAddPopularPost={handleAddPopularPost}
        initialTargetSection="popular_mood"
        onOpenBulkImport={() => setIsBulkImportModalOpen(true)}
      />

      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        accounts={officialAccounts}
        onAddStatement={handleAddOfficialStatement}
        onAddPopularPost={handleAddPopularPost}
      />

    </div>
    </AuthGate>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardApp />
    </AuthProvider>
  );
}
