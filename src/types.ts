export type SentimentType = 'positive' | 'neutral' | 'negative';

export type StrategicImportanceType = 'عالي الأهمية' | 'عالي' | 'متوسط' | 'روتيني' | 'اعتيادي';

export type StreetToneType = 'تحريضي' | 'داعم' | 'معارض' | 'محايد';

export type StreetImportanceType = 'مرتفع' | 'متوسط' | 'عادي';

export type ArticleCategory = 
  | 'سياسة'
  | 'عسكري وأمني'
  | 'اقتصاد وطاقة'
  | 'دبلوماسي وتدويل'
  | 'شؤون محلية';

export type SourceReliabilityType = 
  | 'حساب رسمي موثق'
  | 'حساب معروف وموثوق نسبيًا'
  | 'حساب مجهول أو جديد'
  | 'غير محدد';

export type PostReviewStatus = 'pending_review' | 'published';

export type PotentialViralityType = 
  | 'واسع الانتشار جداً'
  | 'واسع الانتشار'
  | 'متوسط الانتشار'
  | 'محدود الانتشار';

export type PublicTensionLevelType = 
  | 'احتقان شديد'
  | 'توتر مرتفع'
  | 'توتر متوسط'
  | 'هادئ / متزن'
  | 'إيجابي';

export interface PopularMoodPost {
  id: string;
  accountName: string;
  publisher?: string;
  accountHandle: string;
  platform: 'Facebook' | 'X / Twitter' | 'Telegram' | 'TikTok' | string;
  content: string;
  title?: string;
  pubDate: string; // Actual publishing date and time
  entryDate?: string; // System entry date and time (recorded automatically)
  link: string;
  sourceReliability: SourceReliabilityType; // 'حساب رسمي موثق' | 'حساب معروف وموثوق نسبيًا' | 'حساب مجهول أو جديد' | 'غير محدد'
  potentialVirality: PotentialViralityType; // درجة الانتشار المحتمل
  publicTensionLevel: PublicTensionLevelType; // مستوى الاحتقان الشعبي
  
  // Street Pulse Specific Fields
  executiveSummary?: string; // الملخص التنفيذي
  tone?: StreetToneType; // نبرة المحتوى: تحريضي / داعم / معارض / محايد
  importance?: StreetImportanceType; // مستوى الأهمية: مرتفع / متوسط / عادي
  mentionedEntities?: string[]; // الجهات والشخصيات المذكورة

  status?: PostReviewStatus; // 'pending_review' or 'published'
  publishedAt?: string;
  tags?: string[];
  summary?: string;
  isBookmarked?: boolean;
}

export type OfficialEntityType = 
  | 'un_mission' // البعثات والمنظمات الأممية
  | 'eu_mission' // الاتحاد الأوروبي والبعثات الأوروبية
  | 'libyan_leader' // القيادة والشخصيات الليبية
  | 'embassy_diplomat' // السفارات والدبلوماسيون
  | 'sovereignty_body'; // الهيئات والمؤسسات السيادية

export interface OfficialAccount {
  id: string;
  name: string;
  handle: string;
  role: string;
  entityType: OfficialEntityType;
  avatar: string;
  verified: boolean;
  platform: 'X / Twitter' | 'Facebook' | 'بيان صحفي' | 'Telegram' | string;
}

export interface OfficialStatement {
  id: string;
  accountId: string;
  accountName: string;
  accountHandle: string;
  accountRole: string;
  entityType: OfficialEntityType;
  platform: 'X / Twitter' | 'Facebook' | 'بيان صحفي' | 'Telegram' | string;
  verified: boolean;
  content: string;
  title?: string;
  pubDate: string; // Actual publishing date and time
  entryDate?: string; // System entry date and time (recorded automatically)
  link: string;
  sourceReliability?: SourceReliabilityType;
  status?: PostReviewStatus; // 'pending_review' or 'published'
  publishedAt?: string;
  tags?: string[];
  sentiment?: SentimentType;
  impactLevel?: StrategicImportanceType;
  category?: ArticleCategory;
  summary?: string;
  isBookmarked?: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  snippet?: string;
  sentiment?: SentimentType;
  sentimentScore?: number; // -10 to +10
  strategicImportance?: StrategicImportanceType;
  category?: ArticleCategory;
  keywordsMatched?: string[];
  summary?: string;
  isBookmarked?: boolean;
}

export interface MediaMetrics {
  totalArticles: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  categoryBreakdown: Record<string, number>;
  topSources: { source: string; count: number }[];
  dailyTrend: {
    date: string;
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  }[];
}

export interface AIExtractedBriefing {
  executiveSummary: string; // تقدير الموقف (الملخص التنفيذي)
  strategicAnalysis?: string; // التحليل الاستراتيجي
  expectedConsequences?: string[]; // التداعيات المتوقعة
  proactiveConclusion?: string; // الخلاصة الاستباقية
  keyDevelopments: string[]; // أبرز المستجدات
  riskAssessment: string; // تقييم المخاطر والتهديدات
  recommendedActions: string[]; // التوصيات والتوجهات
  mediaSentimentOverview: string; // نظرة عامة على التغطية
  timestamp: string;
}

export interface ExecutiveReportData {
  timeframe: string; // الفترة الزمنية
  executiveSummary: string; // 1. ملخص تنفيذي
  newsList: { id: string; title: string; source: string; pubDate: string; strategicImportance?: string }[]; // 2. رصد الأخبار (بنود مرقمة)
  analysisAndStudy: string; // 3. الدراسة والتحليل
  recommendations: string[]; // 4. التوصيات
  generatedAt: string;
}

export interface GoogleAppsScriptConfig {
  query: string;
  sheetName: string;
  updateFrequencyHours: number;
  autoCategorizeAI: boolean;
}

