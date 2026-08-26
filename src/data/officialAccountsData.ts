import { OfficialAccount, OfficialStatement } from '../types';

export const INITIAL_OFFICIAL_ACCOUNTS: OfficialAccount[] = [
  {
    id: 'acc-unsmil',
    name: 'بعثة الأمم المتحدة للدعم في ليبيا (UNSMIL)',
    handle: '@UNSMILibya',
    role: 'منظمة أممية رسمية',
    entityType: 'un_mission',
    avatar: '🇺🇳',
    verified: true,
    platform: 'X / Twitter'
  },
  {
    id: 'acc-eu-libya',
    name: 'بعثة الاتحاد الأوروبي لدى ليبيا',
    handle: '@EUinLibya',
    role: 'بعثة دبلوماسية إقليمية',
    entityType: 'eu_mission',
    avatar: '🇪🇺',
    verified: true,
    platform: 'X / Twitter'
  },
  {
    id: 'acc-nicola-eu',
    name: 'السفير نيكولا أورلاندو - سفير الاتحاد الأوروبي',
    handle: '@NicolaOrlandoEU',
    role: 'سفير الاتحاد الأوروبي لدى ليبيا',
    entityType: 'embassy_diplomat',
    avatar: '🇪🇺',
    verified: true,
    platform: 'X / Twitter'
  },
  {
    id: 'acc-lna-spox',
    name: 'الناطق باسم القوات المسلحة الليبية',
    handle: '@LNAspox',
    role: 'شعبة الإعلام الحربي - القيادة العامة',
    entityType: 'libyan_leader',
    avatar: '⚔️',
    verified: true,
    platform: 'X / Twitter'
  },
  {
    id: 'acc-haftar-office',
    name: 'المكتب الإعلامي للمشير خليفة حفتر',
    handle: '@GeneralHaftar_Off',
    role: 'القائد العام للقوات المسلحة الليبية',
    entityType: 'libyan_leader',
    avatar: '🎖️',
    verified: true,
    platform: 'X / Twitter'
  },
  {
    id: 'acc-hor-spox',
    name: 'مجلس النواب الليبي (المتحدث الرسمي)',
    handle: '@HouseOfRepLy',
    role: 'السلطة التشريعية - بنغازي',
    entityType: 'sovereignty_body',
    avatar: '🏛️',
    verified: true,
    platform: 'بيان صحفي'
  },
  {
    id: 'acc-us-embassy',
    name: 'سفارة الولايات المتحدة في ليبيا',
    handle: '@USAinLibya',
    role: 'بعثة دبلوماسية أجنبية',
    entityType: 'embassy_diplomat',
    avatar: '🇺🇸',
    verified: true,
    platform: 'X / Twitter'
  },
  {
    id: 'acc-noc-libya',
    name: 'المؤسسة الوطنية للنفط (NOC)',
    handle: '@NOCLibya',
    role: 'المؤسسة السيادية لقطاع النفط',
    entityType: 'sovereignty_body',
    avatar: '🛢️',
    verified: true,
    platform: 'X / Twitter'
  }
];

export const INITIAL_OFFICIAL_STATEMENTS: OfficialStatement[] = [];

