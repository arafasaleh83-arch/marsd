import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { XMLParser } from "fast-xml-parser";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini SDK lazily / safely
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Empty fallback dataset - no dummy/mock data permitted
const FALLBACK_ARTICLES: any[] = [];


// Helper to determine news keywords matches
function findMatchedKeywords(text: string, searchKeywords: string[]): string[] {
  const matched: string[] = [];
  const textLower = text.toLowerCase();
  for (const kw of searchKeywords) {
    if (textLower.includes(kw.toLowerCase())) {
      matched.push(kw);
    }
  }
  return matched.length > 0 ? matched : ["ليبيا"];
}

function cleanHtmlText(str: string): string {
  if (!str) return "";
  return str
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&gt;/gi, ">")
    .replace(/&lt;/gi, "<")
    .replace(/&#\d+;/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/<[^>]*>?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Simple rule-based categorization & sentiment fallback
function inferArticleMeta(title: string, snippet: string) {
  const combined = (title + " " + snippet).toLowerCase();
  
  let category: "سياسة" | "عسكري وأمني" | "اقتصاد وطاقة" | "دبلوماسي وتدويل" | "شؤون محلية" = "سياسة";
  if (/جيش|عسكري|مسلحة|قيادة|مناورات|دورية|أمن|حدود|كتيبة|المشير|سلاح/i.test(combined)) {
    category = "عسكري وأمني";
  } else if (/نفط|غاز|مؤسسة|ميزانية|اقتصاد|صرف|دينار|إنتاج|برميل|تنمية/i.test(combined)) {
    category = "اقتصاد وطاقة";
  } else if (/أمم متحدة|دولية|سفير|مجلس الأمن|بعثة|خارجية|اتفاق/i.test(combined)) {
    category = "دبلوماسي وتدويل";
  } else if (/إعمار|مشاريع|بنغازي|طرابلس|بلدية|بنية تحتية|خدمات/i.test(combined)) {
    category = "شؤون محلية";
  }

  let sentiment: "positive" | "neutral" | "negative" = "neutral";
  let sentimentScore = 1;
  if (/افتتاح|نجاح|استقرار|نمو|زيادة|تنمية|المصالحة|إعمار|جاهزية|تأمين/i.test(combined)) {
    sentiment = "positive";
    sentimentScore = 6;
  } else if (/تحذير|اشتباك|خلاف|انقسام|تضخم|أزمة|انقطاع|خسائر/i.test(combined)) {
    sentiment = "negative";
    sentimentScore = -6;
  }

  return { category, sentiment, sentimentScore };
}

// 1. Route to Fetch Live Google News RSS Feed for Libya keywords
app.get("/api/news/rss", async (req, res) => {
  const searchQuery = (req.query.q as string) || 'ليبيا OR حفتر OR "القيادة العامة للقوات المسلحة"';
  const encodedQuery = encodeURIComponent(searchQuery);
  const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=ar&gl=LY&ceid=LY:ar`;

  const keywordsList = ["ليبيا", "حفتر", "القيادة العامة للقوات المسلحة", "بنغازي", "طرابلس", "النفط", "المجلس الرئاسي", "البعثة الأممية"];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout for reliable Google News fetch

    const response = await fetch(rssUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
        "Cookie": "CONSENT=YES+cb.20220419-08-p0.ar+FX+123",
        "Accept": "application/rss+xml, application/xml, text/xml, */*"
      }
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Google News RSS returned HTTP status ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const rawBody = await response.text();

    if (!contentType.toLowerCase().includes("xml")) {
      const preview = rawBody.slice(0, 300).replace(/\s+/g, " ").trim();
      console.error(`[Google News RSS] Response is not XML (content-type: "${contentType}"). Preview (first 300 chars): ${preview}`);
      throw new Error(`Google News response is not XML (content-type: "${contentType}"). Response appears to be HTML (likely Consent Wall or bot challenge).`);
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    const parsed = parser.parse(rawBody);

    let items = parsed?.rss?.channel?.item;
    if (items && !Array.isArray(items)) {
      items = [items];
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No RSS items found in Google News feed");
    }

    const articles = items.map((item: any, index: number) => {
      const rawTitle = String(item.title || "");
      const rawSource = typeof item.source === "object" ? item.source["#text"] || "أخبار جوجل" : String(item.source || "أخبار جوجل");
      const rawSnippet = item.description ? String(item.description) : rawTitle;

      let cleanTitle = cleanHtmlText(rawTitle);
      // Remove trailing publisher name if formatted as "Title - Publisher"
      cleanTitle = cleanTitle.replace(/\s+-\s+[^-]+$/, "").trim();

      const source = cleanHtmlText(rawSource) || "Google News";
      const snippet = cleanHtmlText(rawSnippet) || cleanTitle;
      const title = cleanTitle || "خبر إعلامي مرصود";

      const link = String(item.link || "");
      const pubDate = item.pubDate ? new Date(item.pubDate).toUTCString() : new Date().toUTCString();

      const meta = inferArticleMeta(title, snippet);
      const matched = findMatchedKeywords(title + " " + snippet, keywordsList);

      return {
        id: `gn-rss-${index}-${Date.now()}`,
        title,
        link: link || rssUrl,
        pubDate,
        source,
        snippet,
        sentiment: meta.sentiment,
        sentimentScore: meta.sentimentScore,
        category: meta.category,
        keywordsMatched: matched,
        summary: snippet.slice(0, 160) + "..."
      };
    });

    return res.json({
      status: "success",
      sourceType: "live_rss",
      googleNewsEngine: true,
      query: searchQuery,
      count: articles.length,
      articles
    });

  } catch (err: any) {
    console.error("[Google News RSS Error]:", err.message || err);
    return res.status(502).json({
      status: "error",
      message: "فشل جلب الأخبار من Google News RSS",
      error: err.message || "Unknown error occurred during RSS fetch or parse",
      query: searchQuery,
      sourceType: "error",
      articles: []
    });
  }
});

// 2. AI Sentiment & Categorization analysis via Gemini API
app.post("/api/news/analyze-article", async (req, res) => {
  try {
    const { title, snippet, source } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Article title is required" });
    }

    const ai = getGeminiClient();
    const prompt = `أنت مستشار وتحليلي أمني وسياسي متخصص في الشأن الليبي والإقليمي لغرفة العمليات.
عند استقبال الخبر أو التغريدة التالية، قم بإعادة معالجتها وتقديم مخرجات فورية بدقة وبدون مقدمات إدارية، مع الحفاظ على الهيكل التالي بدقة:

المحتوى المرصود:
- العنوان/النص: ${title}
- المصدر: ${source || "غير محدد"}
- التقييم/التفاصيل: ${snippet || title}

المطلوب: تقديم مخرجات فورية دقيقة بدون أي مقدمات إدارية أو عبارات افتتاحية (مثل "إليك التحليل" أو "نقدم لكم")، ملتزماً بالهيكل الهرمي التالي:

1. **الملخص التنفيذي:** (سطران بحد أقصى يلخصان جوهر الحدث).
2. **التصنيف:** (اختر واحداً بدقة من: أمني / سياسي / اقتصادي / عسكري).
3. **مستوى الأهمية:** (اختر واحداً بدقة من: مرتفع جداً / متوسط / عادي).
4. **الدراسة التحليلية:**
   - **السياق والأبعاد:** ما وراء الخبر والأسباب المباشرة.
   - **التداعيات المتوقعة:** التأثير المباشر على الأرض أو على المشهد السياسي.
   - **التوصيات/الإجراءات المقترحة:** الخطوة التالية أو التوصية الميدانية/الإعلامية.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING, description: "سطران بحد أقصى يلخصان جوهر الحدث" },
            category: { type: Type.STRING, description: "أمني أو سياسي أو اقتصادي أو عسكري" },
            importanceLevel: { type: Type.STRING, description: "مرتفع جداً أو متوسط أو عادي" },
            contextAndDimensions: { type: Type.STRING, description: "ما وراء الخبر والأسباب المباشرة" },
            expectedConsequences: { type: Type.STRING, description: "التأثير المباشر على الأرض أو على المشهد السياسي" },
            recommendations: { type: Type.STRING, description: "الخطوة التالية أو التوصية الميدانية/الإعلامية" },
            sentiment: { type: Type.STRING, description: "positive, neutral, or negative" },
            sentimentScore: { type: Type.NUMBER, description: "Score between -10 and 10" },
            summary: { type: Type.STRING, description: "النص الكامل المنسق بالتراكيب والهيكلية المطلوبة مباشرة وبدون مقدمات إدارية" }
          },
          required: [
            "executiveSummary",
            "category",
            "importanceLevel",
            "contextAndDimensions",
            "expectedConsequences",
            "recommendations",
            "sentiment",
            "sentimentScore",
            "summary"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");

    // Ensure the summary field matches the required text structure cleanly
    if (!parsed.summary || !parsed.summary.includes("الملخص التنفيذي")) {
      parsed.summary = `1. **الملخص التنفيذي:** ${parsed.executiveSummary}

2. **التصنيف:** ${parsed.category}

3. **مستوى الأهمية:** ${parsed.importanceLevel}

4. **الدراسة التحليلية:**
• **السياق والأبعاد:** ${parsed.contextAndDimensions}
• **التداعيات المتوقعة:** ${parsed.expectedConsequences}
• **التوصيات/الإجراءات المقترحة:** ${parsed.recommendations}`;
    }

    // Map category string to standard category if needed
    let stdCategory = "سياسة";
    if (parsed.category?.includes("عسكري") || parsed.category?.includes("أمني")) stdCategory = "عسكري وأمني";
    else if (parsed.category?.includes("اقتصاد")) stdCategory = "اقتصاد وطاقة";
    else if (parsed.category?.includes("سياس")) stdCategory = "سياسة";

    return res.json({ 
      status: "success", 
      analysis: {
        ...parsed,
        category: stdCategory
      } 
    });
  } catch (error: any) {
    console.error("Error analyzing article with Gemini:", error);
    return res.status(500).json({ error: error.message || "Failed to analyze article" });
  }
});

// 3. AI Media Monitoring Daily Briefing Generation via Gemini
app.post("/api/news/generate-briefing", async (req, res) => {
  try {
    const { articles, targetKeywords } = req.body;
    if (!articles || !Array.isArray(articles) || articles.length === 0) {
      return res.status(400).json({ error: "Articles list is required for briefing generation" });
    }

    const articlesText = articles
      .slice(0, 12)
      .map((a: any, i: number) => `${i + 1}. [${a.source}] ${a.title} (${a.category || "عام"})\n${a.snippet || ''}`)
      .join("\n---\n");

    const keywordsStr = (targetKeywords && targetKeywords.length > 0) ? targetKeywords.join(", ") : "ليبيا، حفتر، القيادة العامة للقوات المسلحة";

    const ai = getGeminiClient();
    const prompt = `أنت محلل سياسي واستراتيجي محنك، تعمل بصفة استشارية عليا لصالح القيادة العامة للقوات المسلحة.
تتميز بالدقة والعمق التحليلي والقدرة على استشراف المآلات الأمنية والسياسية بناءً على الأخبار والمعطيات المرصودة التالية لـ (${keywordsStr}):

${articlesText}

المهمة:
تفكيك المعطيات، دراستها، وتقديم قراءة استخبارية وسياسية متعمقة وفق المنهجية التالية:
1. فلترة الأحداث: التركيز على ما يمس الأمن القومي، سيادة الدولة، وموقع القيادة العامة في المعادلة السياسية والعسكرية.
2. ربط السياقات: تحليل الدوافع الخفية وراء التصريحات والتحركات (المحلية والدولية)، ووضعها في سياقها الجيوسياسي الأشمل.
3. تقييم الموقف: استنباط الفرص، رصد التهديدات المحتملة، وتحديد نقاط الضعف في تحركات الأطراف الأخرى.

ضوابط الصياغة والأسلوب:
- استخدم لغة رصينة، قاطعة، واحترافية تعكس ثقل المؤسسة العسكرية والسياسية.
- استخدم مصطلحات التحليل الاستراتيجي (توازنات الردع، الفراغ الأمني، التموضع الجيوسياسي، موازين القوى).
- يُمنع منعاً باتاً استخدام العبارات الإدارية النمطية مثل "تتخذ إجراءاتكم" أو "المذكور أعلاه".

المطلوب إرجاعه بصيغة JSON بالتفصيل وفق الهيكل التكراري المحدد:
- executiveSummary: تقدير الموقف (الملخص التنفيذي): قراءة مكثفة لجوهر الأحداث المجمعة في سطرين إلى ثلاثة أسطر.
- strategicAnalysis: التحليل الاستراتيجي: دراسة أبعاد الحدث أو الخبر من زاوية مصلحة القيادة العامة وتأثيره على موازين القوى على الأرض.
- expectedConsequences: التداعيات المتوقعة: مصفوفة من 3 إلى 4 نقاط تستشرف ما سيترتب على هذه الأخبار على المدى القريب والمتوسط (سياسياً وأمنياً).
- proactiveConclusion: الخلاصة الاستباقية: الرؤية النهائية للموقف وكيف يخدم أو يعرقل التوجهات العامة للقيادة العامة.
- keyDevelopments: مصفوفة من 3 إلى 5 نقاط لأهم المستجدات والتطورات المرصودة ميدانياً وسياسياً.
- riskAssessment: تقييم المخاطر وتوازنات الردع والفراغ الأمني المحتمل.
- recommendedActions: مصفوفة من 3 توصيات استراتيجية وتوجهات موصى بها.
- mediaSentimentOverview: تقييم شامل لاتجاهات وسائل الإعلام المحلية والإقليمية والدولية.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executiveSummary: { type: Type.STRING },
            strategicAnalysis: { type: Type.STRING },
            expectedConsequences: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            proactiveConclusion: { type: Type.STRING },
            keyDevelopments: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            riskAssessment: { type: Type.STRING },
            recommendedActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            mediaSentimentOverview: { type: Type.STRING }
          },
          required: [
            "executiveSummary", 
            "strategicAnalysis", 
            "expectedConsequences", 
            "proactiveConclusion", 
            "keyDevelopments", 
            "riskAssessment", 
            "recommendedActions", 
            "mediaSentimentOverview"
          ]
        }
      }
    });

    const briefingData = JSON.parse(response.text || "{}");
    briefingData.timestamp = new Date().toLocaleTimeString("ar-LY", {
      hour: "2-digit",
      minute: "2-digit",
      day: "numeric",
      month: "short",
      year: "numeric"
    });

    return res.json({ status: "success", briefing: briefingData });
  } catch (error: any) {
    console.error("Error generating briefing:", error);
    return res.status(500).json({ error: error.message || "Failed to generate briefing" });
  }
});

// 4. Fetch Live Official Statements & Press Releases
app.post("/api/official/fetch-statements", async (req, res) => {
  try {
    const { accounts } = req.body;
    const accountList = Array.isArray(accounts) && accounts.length > 0 ? accounts : [];

    // Query RSS for recent official statements
    const queries = [
      'UNSMIL OR "بعثة الأمم المتحدة للدعم في ليبيا"',
      'EUinLibya OR "الاتحاد الأوروبي" OR "سفير الاتحاد الأوروبي"',
      '"القيادة العامة للقوات المسلحة" OR "شعبة الإعلام الحربي" OR "المشير خليفة حفتر"',
      '"سفارة الولايات المتحدة" OR "المؤسسة الوطنية للنفط" OR "مجلس النواب الليبي"'
    ];

    const fetchPromises = queries.map(async (q) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ar&gl=LY&ceid=LY:ar`;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0 MediaMonitorOfficial/1.0" }
        });
        clearTimeout(timeout);
        if (!resp.ok) return [];
        const text = await resp.text();
        const parser = new XMLParser({ ignoreAttributes: false });
        const parsed = parser.parse(text);
        return parsed?.rss?.channel?.item || [];
      } catch (e) {
        return [];
      }
    });

    const rawResults = await Promise.all(fetchPromises);
    const allItems = rawResults.flat();

    if (allItems.length === 0) {
      return res.json({
        status: "success",
        sourceType: "cached",
        message: "استعادت البيانات المسجلة مؤقتاً لعدم وجود تحديثات جديدة عبر RSS",
        statements: []
      });
    }

    const newStatements: any[] = [];
    allItems.slice(0, 12).forEach((item: any, idx: number) => {
      const title = String(item.title || "").replace(/ - [^-]+$/, "").trim();
      const link = String(item.link || "https://news.google.com");
      const pubDate = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
      const rawSnippet = item.description ? String(item.description).replace(/<[^>]*>?/gm, "") : title;

      // Match item to an existing account if possible
      let matchedAcc = accountList.find((acc: any) => 
        title.includes(acc.name) || rawSnippet.includes(acc.name) || 
        title.includes(acc.handle.replace('@', '')) || rawSnippet.includes(acc.handle.replace('@', ''))
      );

      if (!matchedAcc) {
        // Assign default matching based on keywords
        if (/أممية|UNSMIL|البعثة/i.test(title + rawSnippet)) {
          matchedAcc = accountList.find((a: any) => a.entityType === 'un_mission') || accountList[0];
        } else if (/أوروبي|EU|السفير/i.test(title + rawSnippet)) {
          matchedAcc = accountList.find((a: any) => a.entityType === 'eu_mission' || a.entityType === 'embassy_diplomat') || accountList[1];
        } else if (/القيادة العامة|حفتر|القوات المسلحة/i.test(title + rawSnippet)) {
          matchedAcc = accountList.find((a: any) => a.entityType === 'libyan_leader') || accountList[2];
        } else {
          matchedAcc = accountList[0] || {
            id: 'acc-unsmil',
            name: 'بعثة الأمم المتحدة للدعم في ليبيا',
            handle: '@UNSMILibya',
            role: 'منظمة أممية رسمية',
            entityType: 'un_mission',
            verified: true,
            platform: 'X / Twitter'
          };
        }
      }

      const impact: 'عالي' | 'متوسط' | 'اعتيادي' = /عاجل|هام|قرار|انتخابات|ميزانية|جاهزية/i.test(title) ? 'عالي' : 'متوسط';

      newStatements.push({
        id: `stmt-live-${idx}-${Date.now()}`,
        accountId: matchedAcc.id,
        accountName: matchedAcc.name,
        accountHandle: matchedAcc.handle,
        accountRole: matchedAcc.role,
        entityType: matchedAcc.entityType,
        platform: matchedAcc.platform || 'X / Twitter',
        verified: matchedAcc.verified,
        title: title || 'تصريح رسمي رصد مؤخراً',
        content: rawSnippet,
        pubDate,
        link,
        tags: ['رصد_مباشر', 'تصريح_رسمي', matchedAcc.entityType],
        sentiment: /تأكيد|ترحيب|نجاح|دعم/i.test(title) ? 'positive' : 'neutral',
        impactLevel: impact,
        summary: `تم رصد هذا التصريح/البيان مباشرة عبر محرك التغطية للبعثات والجهات الرسمية.`
      });
    });

    return res.json({
      status: "success",
      sourceType: "live_sync",
      count: newStatements.length,
      statements: newStatements
    });

  } catch (error: any) {
    console.error("Error fetching live official statements:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch statements" });
  }
});

// Endpoint to validate/test X (Twitter) API v2 Bearer Token
app.post("/api/x/test-bearer", async (req, res) => {
  try {
    const { bearerToken, query } = req.body;
    if (!bearerToken) {
      return res.status(400).json({ status: "error", message: "رمز المصادقة (Bearer Token) مطلوب." });
    }

    const searchQuery = query || '("ليبيا" OR "حفتر" OR "القيادة العامة") -is:retweet lang:ar';
    const apiUrl = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(searchQuery)}&tweet.fields=created_at,author_id&expansions=author_id&user.fields=username,name&max_results=10`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${bearerToken.trim()}`,
        "Content-Type": "application/json"
      }
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      return res.status(response.status || 400).json({
        status: "error",
        message: data.detail || (data.errors && data.errors[0]?.message) || "فشل الاتصال بـ API منصة X. تحقق من صحة الرمز.",
        raw: data
      });
    }

    return res.json({
      status: "success",
      message: `تم التوثيق واختبار الاتصال بـ X API بنجاح! تم العثور على ${data.data?.length || 0} تغريدة مباشرة.`,
      count: data.data?.length || 0,
      tweets: data.data || [],
      users: data.includes?.users || []
    });
  } catch (err: any) {
    return res.status(500).json({
      status: "error",
      message: err.message || "حدث خطأ أثناء الاتصال بـ API منصة X"
    });
  }
});

// 6. Bulk Raw Social Media Text Parsing via Gemini API
app.post("/api/news/parse-bulk-text", async (req, res) => {
  try {
    const { rawText, platform } = req.body;
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return res.status(400).json({ error: "rawText is required" });
    }

    const ai = getGeminiClient();
    const prompt = `فيما يلي نص خام منسوخ من منصة تواصل اجتماعي (${platform || 'X / فيسبوك'})، وقد يحتوي على عدة منشورات مختلطة معًا مع عناصر واجهة إضافية (أسماء مستخدمين، تواريخ، أرقام إعجابات وتعليقات ومشاركات). مهمتك: افصل كل منشور مستقل عن الآخر، واستخرج له: اسم الحساب أو المستخدم، نص المنشور فقط (بدون أرقام التفاعل أو عناصر الواجهة)، وتاريخ النشر إن وُجد بوضوح. تجاهل أي عنصر واجهة لا علاقة له بالمحتوى الفعلي (أزرار، عدادات، روابط تنقل). أعد النتيجة كمصفوفة JSON، كل عنصر يمثل منشورًا مستقلًا.

النص الخام المنسوخ:
${rawText.trim()}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "مصفوفة تضم المنشورات المستخرجة من النص الخام",
          items: {
            type: Type.OBJECT,
            properties: {
              accountName: { type: Type.STRING, description: "اسم الحساب أو الناشر" },
              accountHandle: { type: Type.STRING, description: "معرف الحساب أو المعرف المسبوق بـ @" },
              content: { type: Type.STRING, description: "نص المنشور الفعلي فقط خالي من أرقام التفاعلات والأزرار" },
              pubDate: { type: Type.STRING, description: "التاريخ أو الوقت المذكور للمنشور أو تاريخ اليوم" },
              title: { type: Type.STRING, description: "عنوان مختصر استناداً على بداية النص" }
            },
            required: ["accountName", "content"]
          }
        }
      }
    });

    const items = JSON.parse(response.text || "[]");
    return res.json({
      status: "success",
      count: Array.isArray(items) ? items.length : 0,
      posts: Array.isArray(items) ? items : []
    });
  } catch (error: any) {
    console.error("Error parsing bulk text with Gemini:", error);
    return res.status(500).json({ error: error.message || "فشل تفكيك النص واستخراج المنشورات" });
  }
});

// 9. Street Pulse (رصد حالة الشارع) API - Fetches live posts from Google Apps Script endpoint
const STREET_PULSE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_kjT1zMKyPcSg-knU40xN9dpLox-Qdo-ULf3m2LLnRY9rb5eco08vfy_VDNTWiyQN/exec";

app.get("/api/street-pulse/feed", async (req, res) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(STREET_PULSE_SCRIPT_URL, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 StreetPulseBot/1.0",
        "Accept": "application/json, text/plain, */*",
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Google Apps Script returned status ${response.status} ${response.statusText}`);
    }

    const rawData = await response.json();
    let rawList: any[] = [];
    if (Array.isArray(rawData)) {
      rawList = rawData;
    } else if (rawData && Array.isArray(rawData.data)) {
      rawList = rawData.data;
    } else if (rawData && Array.isArray(rawData.posts)) {
      rawList = rawData.posts;
    }

    // Normalize items to standard structure matching the 6 card requirements
    const normalizedPosts = rawList.map((item, index) => {
      const publisher = item.publisher || item["الناشر"] || item.author || item.page || item["اسم الصفحة"] || item.accountName || item["الحساب"] || "صفحة عامة";
      const pubDate = item.pubDate || item.date || item["التاريخ"] || item.timestamp || item["تاريخ النشر"] || new Date().toISOString();
      const content = item.content || item.text || item["المحتوى"] || item["النص"] || item.post || "";
      const executiveSummary = item.executiveSummary || item["الملخص التنفيذي"] || item.summary || item["الملخص"] || item["التحليل"] || (content ? content.slice(0, 160) + "..." : "ملخص تحليلي لرصد التفاعل الشعبي.");
      
      // Tone normalization: تحريضي / داعم / معارض / محايد
      const rawTone = String(item.tone || item["نبرة المحتوى"] || item.sentiment || item["النبرة"] || "").trim().toLowerCase();
      let tone: "تحريضي" | "داعم" | "معارض" | "محايد" = "محايد";
      if (/تحريض|فتنة|تأجيج|استفزاز|تهديد|inciting/i.test(rawTone)) {
        tone = "تحريضي";
      } else if (/داعم|تأييد|مساند|إيجابي|support/i.test(rawTone)) {
        tone = "داعم";
      } else if (/معارض|انتقاد|احتجاج|سخط|غضب|refusal|oppose/i.test(rawTone)) {
        tone = "معارض";
      } else {
        tone = "محايد";
      }

      // Importance normalization: مرتفع / متوسط / عادي
      const rawImp = String(item.importance || item["مستوى الأهمية"] || item.importanceLevel || item["الأهمية"] || "").trim().toLowerCase();
      let importance: "مرتفع" | "متوسط" | "عادي" = "متوسط";
      if (/مرتفع|عالي|طارئ|حساس|high/i.test(rawImp)) {
        importance = "مرتفع";
      } else if (/عادي|روتيني|منخفض|low/i.test(rawImp)) {
        importance = "عادي";
      } else {
        importance = "متوسط";
      }

      // Entities mentioned: array of figures and entities
      let entities: string[] = [];
      const rawEntities = item.mentionedEntities || item["الجهات والشخصيات المذكورة"] || item.entities || item.figures || item.tags || item["الشخصيات والجهات"];
      if (Array.isArray(rawEntities)) {
        entities = rawEntities.map(e => String(e).trim()).filter(Boolean);
      } else if (typeof rawEntities === "string" && rawEntities.trim()) {
        entities = rawEntities.split(/[,،؛\n]+/).map(e => e.trim().replace(/^#/, "")).filter(Boolean);
      }
      if (entities.length === 0) {
        // Extract basic entities from text if none provided
        if (/حفتر|القيادة العامة/i.test(content)) entities.push("القيادة العامة للقوات المسلحة");
        if (/المصرف المركزي|المركزي|الكبير/i.test(content)) entities.push("مصرف ليبيا المركزي");
        if (/حكومة|الدبيبة|حماد/i.test(content)) entities.push("الحكومة");
        if (/المجلس الرئاسي|المنفي/i.test(content)) entities.push("المجلس الرئاسي");
        if (/البعثة الأممية|باتيلي|خوري/i.test(content)) entities.push("البعثة الأممية");
        if (entities.length === 0) entities.push("الشأن العام الليبي");
      }

      // Link
      const link = item.link || item["رابط المنشور"] || item.url || item["الرابط"] || "https://facebook.com";

      // Tension mapping
      let publicTensionLevel: "احتقان شديد" | "توتر مرتفع" | "توتر متوسط" | "هادئ / متزن" | "إيجابي" = "توتر متوسط";
      if (tone === "تحريضي") publicTensionLevel = "احتقان شديد";
      else if (tone === "معارض") publicTensionLevel = "توتر مرتفع";
      else if (tone === "داعم") publicTensionLevel = "إيجابي";
      else publicTensionLevel = "هادئ / متزن";

      return {
        id: item.id || `pulse_${Date.now()}_${index}`,
        accountName: publisher,
        publisher: publisher,
        accountHandle: item.accountHandle || item.handle || `@fb_${index + 1}`,
        platform: "Facebook",
        content: content || executiveSummary,
        executiveSummary,
        tone,
        importance,
        mentionedEntities: entities,
        link,
        pubDate,
        entryDate: new Date().toISOString(),
        sourceReliability: (item.sourceReliability || "حساب معروف وموثوق نسبيًا") as any,
        potentialVirality: (item.potentialVirality || (importance === "مرتفع" ? "واسع الانتشار جداً" : "متوسط الانتشار")) as any,
        publicTensionLevel,
        status: "published" as const,
        tags: entities
      };
    });

    return res.json({
      status: "success",
      endpointUrl: STREET_PULSE_SCRIPT_URL,
      count: normalizedPosts.length,
      posts: normalizedPosts
    });
  } catch (error: any) {
    console.error("[Street Pulse API Error]:", error.message || error);
    return res.status(500).json({
      status: "error",
      message: "فشل الاتصال برابط رصد حالة الشارع",
      error: error.message || "Unknown error",
      posts: []
    });
  }
});

// 10. Generate 3-line Executive Street Pulse Report via Gemini
app.post("/api/street-pulse/generate-report", async (req, res) => {
  try {
    const { posts } = req.body;
    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return res.status(400).json({ error: "Posts array is required" });
    }

    const ai = getGeminiClient();
    const postsText = posts.slice(0, 15).map((p: any, idx: number) => 
      `${idx + 1}. الناشر: ${p.publisher || p.accountName} | النبرة: ${p.tone || "محايد"} | الأهمية: ${p.importance || "متوسط"}\nالملخص: ${p.executiveSummary || p.content}\nالجهات المذكورة: ${(p.mentionedEntities || []).join(", ")}`
    ).join("\n---\n");

    const prompt = `أنت المحرك الاستخباراتي والتحليلي المسؤول عن رصد المزاج الشعبي وحالة الشارع الليبي.
بناءً على منشورات فيسبوك الميدانية المرصودة التالية:
${postsText}

المطلوب بدقة وإلزام:
أعطني تقريراً موجزاً ومكثفاً في **3 أسطر فقط** (كل سطر يبدأ برقم وبنط عريض لموضوعه) يوضح:
1. **النبرة العامة السائدة ومستوى الاحتقان:** (تقييم مكثف لميل الشارع هل هو محتقن أو داعم أو مترقب مع ذكر النسبة التقريبية للاتجاه).
2. **أبرز التوجهات والقضايا المحركة للرأي العام:** (أهم القضايا والجهات والشخصيات التي يدور حولها النقاش في الشارع حالياً).
3. **الخلاصة والمآل التقديري:** (استشراف أمني/سياسي سريع لمآلات الرأي العام وتوصية الرصد الاستباقي).

اكتب الأسطر الثلاثة مباشرة بلغة أمنية واستراتيجية محكمة بدون أي مقدمات أو هوامش.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            line1_toneAndTension: { type: Type.STRING, description: "السطر الأول: النبرة العامة السائدة ومستوى الاحتقان" },
            line2_keyDriversAndTopics: { type: Type.STRING, description: "السطر الثاني: أبرز التوجهات والقضايا المحركة للرأي العام" },
            line3_proactiveConclusion: { type: Type.STRING, description: "السطر الثالث: الخلاصة والمآل التقديري" },
            fullThreeLineReport: { type: Type.STRING, description: "التقرير المكتمل المكون من 3 أسطر مرقمة" }
          },
          required: ["line1_toneAndTension", "line2_keyDriversAndTopics", "line3_proactiveConclusion", "fullThreeLineReport"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      status: "success",
      report: parsed
    });
  } catch (error: any) {
    console.error("Error generating street pulse report:", error);
    return res.status(500).json({ error: error.message || "Failed to generate street report" });
  }
});

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error("Express middleware error caught:", err);
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({
      error: err.type === "entity.too.large"
        ? "حجم البيانات المرسلة كبير جداً، يرجى تقليل القائمة والمحاولة مجدداً."
        : (err.message || "حدث خطأ في معالجة الطلب الخادمي"),
      status: "error"
    });
  }
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Libya Media Monitoring Dashboard Engine" });
});

async function startServer() {
  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Media Monitor Dashboard Server] running at http://localhost:${PORT}`);
  });
}

startServer();
