import { PopularMoodPost, PublicTensionLevelType, StreetToneType } from '../types';

export interface LibyanCity {
  id: string;
  name: string;
  nameEn: string;
  region: 'المنطقة الغربية' | 'المنطقة الشرقية' | 'المنطقة الوسطى والخليج' | 'الجنوب وفزان' | 'الساحل الغربي والجبل';
  lat: number;
  lng: number;
  aliases: string[];
}

export const LIBYAN_CITIES: LibyanCity[] = [
  {
    id: 'tripoli',
    name: 'طرابلس',
    nameEn: 'Tripoli',
    region: 'المنطقة الغربية',
    lat: 32.8550, // وسط الكتلة العمرانية لطرابلس جنوب الساحل
    lng: 13.1850,
    aliases: ['طرابلس', 'ميدان الشهداء', 'طريق الشط', 'سوق الجمعة', 'فشلوم', 'حي الأندلس', 'الدريبي', 'غرغور', 'تاجوراء', 'جنزور']
  },
  {
    id: 'abu_salim',
    name: 'أبو سليم',
    nameEn: 'Abu Salim',
    region: 'المنطقة الغربية',
    lat: 32.8250, // جنوب طرابلس على اليابسة
    lng: 13.1720,
    aliases: ['أبو سليم', 'ابوسليم', 'طريق المطار', 'عين زارة', 'صلاح الدين', 'مشروع الهضبة', 'خلة الفرجان', 'قصر بن غشير']
  },
  {
    id: 'zawiya',
    name: 'الزاوية',
    nameEn: 'Zawiya',
    region: 'الساحل الغربي والجبل',
    lat: 32.7400, // مركز مدينة الزاوية على اليابسة
    lng: 12.7275,
    aliases: ['الزاوية', 'الزاويه', 'حرشة', 'مصفاة الزاوية', 'جوددائم', 'أبو عيسى', 'مطرد', 'الساحل الغربي']
  },
  {
    id: 'zuwara',
    name: 'زوارة',
    nameEn: 'Zuwara',
    region: 'الساحل الغربي والجبل',
    lat: 32.9050, // مركز زوارة على اليابسة جنوب الساحل
    lng: 12.0815,
    aliases: ['زوارة', 'زواره', 'الجميل', 'رقدالين', 'أبي كماش', 'معبر رأس جدير', 'رأس جدير', 'منفذ رأس جدير']
  },
  {
    id: 'misrata',
    name: 'مصراتة',
    nameEn: 'Misrata',
    region: 'المنطقة الغربية',
    lat: 32.3550, // وسط مدينة مصراتة العمراني على اليابسة
    lng: 15.0920,
    aliases: ['مصراتة', 'مصراته', 'قصر أحمد', 'الدافنية', 'الرويسات', 'طريق النهر', 'منطقة الحديد والصلب']
  },
  {
    id: 'benghazi',
    name: 'بنغازي',
    nameEn: 'Benghazi',
    region: 'المنطقة الشرقية',
    lat: 32.0950, // مركز بنغازي العمراني على اليابسة (الكيش والبركة)
    lng: 20.0850,
    aliases: ['بنغازي', 'الصابري', 'البركة', 'الهواري', 'قاريونس', 'سيدي حسين', 'الليثي', 'السلماني', 'بوعطني', 'ميدان الكيش']
  },
  {
    id: 'derna',
    name: 'درنة',
    nameEn: 'Derna',
    region: 'المنطقة الشرقية',
    lat: 32.7450, // وادي ومركز مدينة درنة على اليابسة
    lng: 22.6350,
    aliases: ['درنة', 'درنه', 'وادي درنة', 'البلاد', 'الساحل الشرقي', 'سوسة', 'شحات', 'البيضاء', 'القبة']
  },
  {
    id: 'ras_lanuf',
    name: 'رأس لانوف',
    nameEn: 'Ras Lanuf',
    region: 'المنطقة الوسطى والخليج',
    lat: 30.4600, // المنطقة السكنية والعمرانية على اليابسة
    lng: 18.5550,
    aliases: ['رأس لانوف', 'راس لانوف', 'السدرة', 'السدره', 'ميناء السدرة', 'ميناء رأس لانوف', 'البريقة', 'الزويتينة', 'الهلال النفطي']
  },
  {
    id: 'sirte',
    name: 'سرت',
    nameEn: 'Sirte',
    region: 'المنطقة الوسطى والخليج',
    lat: 31.1850, // وسط مدينة سرت على اليابسة
    lng: 16.5880,
    aliases: ['سرت', 'خليج سرت', 'مجمع واغادوغو', 'أبو هادي', 'هراوة', 'القبيبة', 'الجفرة', 'هون', 'ودان', 'سوكنة']
  },
  {
    id: 'sabha',
    name: 'سبها',
    nameEn: 'Sabha',
    region: 'الجنوب وفزان',
    lat: 27.0377, // مركز سبها
    lng: 14.4283,
    aliases: ['سبها', 'فزان', 'المنشية', 'القرضة', 'المهدية', 'سكرة', 'حجارة', 'تمنهنت', 'مطار سبها']
  },
  {
    id: 'ubari',
    name: 'أوباري',
    nameEn: 'Ubari',
    region: 'الجنوب وفزان',
    lat: 26.5917, // أوباري وحقل الشرارة
    lng: 12.7778,
    aliases: ['أوباري', 'اوباري', 'حقل الشرارة', 'الشرارة', 'حقل الفيل', 'مرزق', 'العوينات', 'القطرون']
  },
  {
    id: 'gharyan',
    name: 'غريان',
    nameEn: 'Gharyan',
    region: 'الساحل الغربي والجبل',
    lat: 32.1722, // مركز مدينة غريان بالجبل
    lng: 13.0203,
    aliases: ['غريان', 'بوعيلان', 'الزنتان', 'يفرن', 'نالوت', 'جبل نفوسة', 'الجبل الغربي', 'ككلة', 'جادو']
  },
  {
    id: 'tobruk',
    name: 'طبرق',
    nameEn: 'Tobruk',
    region: 'المنطقة الشرقية',
    lat: 32.0550, // وسط مدينة طبرق على اليابسة جنوب الخليج
    lng: 23.9740,
    aliases: ['طبرق', 'أمساعد', 'امساعد', 'منفذ أمساعد', 'البردي', 'ميناء الحريقة']
  },
  {
    id: 'kufra',
    name: 'الكفرة',
    nameEn: 'Kufra',
    region: 'الجنوب وفزان',
    lat: 24.1833, // الكفرة
    lng: 23.3000,
    aliases: ['الكفرة', 'الكفره', 'تازربو', 'ربيانة', 'منفذ السارة', 'العوينات الجنوبية', 'المثلث الحدودي']
  },
  {
    id: 'bayda',
    name: 'البيضاء',
    nameEn: 'Bayda',
    region: 'المنطقة الشرقية',
    lat: 32.7500, // مدينة البيضاء بالجبل الأخضر
    lng: 21.7550,
    aliases: ['البيضاء', 'شحات', 'سوسة', 'الجبل الأخضر', 'مراوة', 'مسة']
  }
];

export interface CityTensionSummary {
  city: LibyanCity;
  posts: PopularMoodPost[];
  postCount: number;
  prevailingTone: StreetToneType;
  tensionLevel: PublicTensionLevelType;
  tensionScore: number; // 0 to 100
  toneBreakdown: {
    inciting: number; // تحريضي
    opposing: number; // معارض
    supportive: number; // داعم
    neutral: number; // محايد
  };
  keyTopics: string[];
}

/**
 * Associates a PopularMoodPost with a Libyan city based on text analysis
 */
export function matchPostToLibyanCity(post: PopularMoodPost): LibyanCity {
  const searchCorpus = [
    post.title || '',
    post.content || '',
    post.executiveSummary || '',
    post.summary || '',
    post.publisher || '',
    post.accountName || '',
    post.accountHandle || '',
    ...(post.tags || []),
    ...(post.mentionedEntities || [])
  ].join(' ').toLowerCase();

  // Try direct alias match
  for (const city of LIBYAN_CITIES) {
    for (const alias of city.aliases) {
      if (searchCorpus.includes(alias.toLowerCase())) {
        return city;
      }
    }
  }

  // Default to Tripoli if no specific city matches
  return LIBYAN_CITIES[0];
}

/**
 * Calculates tension summary for all cities based on posts
 */
export function computeCitiesTensionSummaries(posts: PopularMoodPost[]): CityTensionSummary[] {
  const cityMap = new Map<string, PopularMoodPost[]>();

  // Group posts by matched city
  for (const post of posts) {
    const city = matchPostToLibyanCity(post);
    const existing = cityMap.get(city.id) || [];
    existing.push(post);
    cityMap.set(city.id, existing);
  }

  return LIBYAN_CITIES.map((city) => {
    const cityPosts = cityMap.get(city.id) || [];
    
    let inciting = 0;
    let opposing = 0;
    let supportive = 0;
    let neutral = 0;

    let highestTensionWeight = 1; // 1 to 5 scale

    const topicSet = new Set<string>();

    for (const p of cityPosts) {
      // Tones
      const t = p.tone || 'محايد';
      if (t === 'تحريضي') inciting++;
      else if (t === 'معارض') opposing++;
      else if (t === 'داعم') supportive++;
      else neutral++;

      // Tension level
      const level = p.publicTensionLevel;
      if (level === 'احتقان شديد') highestTensionWeight = Math.max(highestTensionWeight, 5);
      else if (level === 'توتر مرتفع') highestTensionWeight = Math.max(highestTensionWeight, 4);
      else if (level === 'توتر متوسط') highestTensionWeight = Math.max(highestTensionWeight, 3);
      else if (level === 'هادئ / متزن') highestTensionWeight = Math.max(highestTensionWeight, 2);
      else if (level === 'إيجابي') highestTensionWeight = Math.max(highestTensionWeight, 1);

      // Topics & Entities
      if (p.mentionedEntities) {
        p.mentionedEntities.slice(0, 2).forEach(e => topicSet.add(e));
      }
      if (p.tags) {
        p.tags.slice(0, 2).forEach(t => topicSet.add(t));
      }
    }

    // Determine prevailing tone
    let prevailingTone: StreetToneType = 'محايد';
    if (inciting > 0 && inciting >= opposing && inciting >= supportive) {
      prevailingTone = 'تحريضي';
    } else if (opposing >= supportive && opposing > neutral) {
      prevailingTone = 'معارض';
    } else if (supportive > opposing && supportive > neutral) {
      prevailingTone = 'داعم';
    } else {
      prevailingTone = 'محايد';
    }

    // Map highest tension weight to tension level
    let tensionLevel: PublicTensionLevelType = 'هادئ / متزن';
    let tensionScore = 20;

    if (cityPosts.length === 0) {
      tensionLevel = 'هادئ / متزن';
      tensionScore = 15;
    } else if (inciting > 0 || highestTensionWeight >= 5) {
      tensionLevel = 'احتقان شديد';
      tensionScore = 95;
    } else if (opposing > supportive || highestTensionWeight === 4) {
      tensionLevel = 'توتر مرتفع';
      tensionScore = 75;
    } else if (highestTensionWeight === 3) {
      tensionLevel = 'توتر متوسط';
      tensionScore = 50;
    } else if (supportive >= opposing && supportive > 0) {
      tensionLevel = 'إيجابي';
      tensionScore = 10;
    }

    return {
      city,
      posts: cityPosts,
      postCount: cityPosts.length,
      prevailingTone,
      tensionLevel,
      tensionScore,
      toneBreakdown: {
        inciting,
        opposing,
        supportive,
        neutral
      },
      keyTopics: Array.from(topicSet).slice(0, 4)
    };
  });
}

/**
 * Color metadata by tension level
 */
export function getTensionColorMeta(level: PublicTensionLevelType) {
  switch (level) {
    case 'احتقان شديد':
      return {
        hex: '#e11d48',
        bg: 'bg-rose-600',
        text: 'text-rose-200',
        border: 'border-rose-500',
        glow: 'shadow-rose-600/60',
        pinBg: '#e11d48',
        badge: 'احتقان شديد',
        riskLevel: 'مرتفع جداً'
      };
    case 'توتر مرتفع':
      return {
        hex: '#ea580c',
        bg: 'bg-orange-600',
        text: 'text-orange-200',
        border: 'border-orange-500',
        glow: 'shadow-orange-600/60',
        pinBg: '#ea580c',
        badge: 'توتر مرتفع',
        riskLevel: 'مرتفع'
      };
    case 'توتر متوسط':
      return {
        hex: '#f59e0b',
        bg: 'bg-amber-500/20',
        text: 'text-amber-200',
        border: 'border-amber-500/40',
        glow: 'shadow-amber-500/20',
        pinBg: '#f59e0b',
        badge: 'توتر متوسط',
        riskLevel: 'متوسط'
      };
    case 'إيجابي':
      return {
        hex: '#10b981',
        bg: 'bg-emerald-500/20',
        text: 'text-emerald-200',
        border: 'border-emerald-500/40',
        glow: 'shadow-emerald-500/20',
        pinBg: '#10b981',
        badge: 'إيجابي',
        riskLevel: 'مستقر وإيجابي'
      };
    default:
      return {
        hex: '#38bdf8',
        bg: 'bg-sky-500/20',
        text: 'text-sky-200',
        border: 'border-sky-500/40',
        glow: 'shadow-sky-500/20',
        pinBg: '#38bdf8',
        badge: 'هادئ / متزن',
        riskLevel: 'مستقر'
      };
  }
}
