import React from 'react';
import {
  Baby,
  Backpack,
  Banknote,
  BedDouble,
  Briefcase,
  Camera,
  ClipboardList,
  CloudRain,
  Coffee,
  CreditCard,
  Droplets,
  FileText,
  Footprints,
  HeartPulse,
  Landmark,
  Laptop,
  Layers,
  Luggage,
  Mountain,
  Package,
  Plane,
  PlugZap,
  ShoppingBag,
  Shirt,
  Smartphone,
  Ticket,
  Train,
  Utensils,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import type {
  AppTab,
  CrewMember,
  ExpenseBucket,
  ExpenseRecord,
  PackingGroup,
  PaymentAccount,
  SmartBagId,
  StopType,
  TripTaskCategory,
} from '../types';

/**
 * Canonical crew & module anchor palette (`peach` | `lavender` | `teal`).
 * Used for solid avatars and as the core color DNA for 10%-opacity Lucide icon badges.
 */
export const HERO_AVATAR_BG: Record<CrewMember['accent'], string> = {
  peach: 'tk-accent-av-4 text-white',
  lavender: 'tk-accent-av-2 text-white',
  teal: 'tk-accent-av-1 text-white',
};

export type AccentKey =
  | CrewMember['accent']
  | PackingGroup['colorKey']
  | 'ocean';

export interface AccentToken {
  hex: string;
  /** Solid fill avatar class (derived from HERO_AVATAR_BG for core accents) */
  avatarClass: string;
  /** 10% translucent background + WCAG AA foreground icon color + subtle 20% inset ring */
  badge10Class: string;
  /** 10% translucent background + WCAG AA foreground icon color without border ring */
  soft10Class: string;
  /** Interactive hoverable 10% translucent surface */
  interactive10Class: string;
  /** Crisp icon / text foreground color */
  textClass: string;
  /** Small solid color indicator dot */
  dotClass: string;
}

/**
 * Dynamic accent color tokens anchored on `HERO_AVATAR_BG` (swatch luminance steps)
 * plus extended category harmonies (`lemon`, `rose`, `mint`, `ocean`).
 * Uses 10% translucent backgrounds (tk-accent-badge-N / tk-accent-soft-N) for layered hierarchy.
 */
export const HERO_ACCENT_PALETTE: Record<AccentKey, AccentToken> = {
  peach: {
    hex: 'var(--tk-swatch-4)',
    avatarClass: HERO_AVATAR_BG.peach,
    badge10Class: 'tk-accent-badge-4',
    soft10Class: 'tk-accent-soft-4',
    interactive10Class: 'tk-accent-interactive-4',
    textClass: 'tk-accent-text-4',
    dotClass: 'tk-accent-dot-4',
  },
  lavender: {
    hex: 'var(--tk-swatch-2)',
    avatarClass: HERO_AVATAR_BG.lavender,
    badge10Class: 'tk-accent-badge-2',
    soft10Class: 'tk-accent-soft-2',
    interactive10Class: 'tk-accent-interactive-2',
    textClass: 'tk-accent-text-2',
    dotClass: 'tk-accent-dot-2',
  },
  teal: {
    hex: 'var(--tk-swatch-1)',
    avatarClass: HERO_AVATAR_BG.teal,
    badge10Class: 'tk-accent-badge-1',
    soft10Class: 'tk-accent-soft-1',
    interactive10Class: 'tk-accent-interactive-1',
    textClass: 'tk-accent-text-1',
    dotClass: 'tk-accent-dot-1',
  },
  lemon: {
    hex: 'var(--tk-swatch-3)',
    avatarClass: 'tk-accent-av-3 text-white',
    badge10Class: 'tk-accent-badge-3',
    soft10Class: 'tk-accent-soft-3',
    interactive10Class: 'tk-accent-interactive-3',
    textClass: 'tk-accent-text-3',
    dotClass: 'tk-accent-dot-3',
  },
  rose: {
    hex: 'var(--tk-swatch-3)',
    avatarClass: 'tk-accent-av-3 text-white',
    badge10Class: 'tk-accent-badge-3',
    soft10Class: 'tk-accent-soft-3',
    interactive10Class: 'tk-accent-interactive-3',
    textClass: 'tk-accent-text-3',
    dotClass: 'tk-accent-dot-3',
  },
  mint: {
    hex: 'var(--tk-swatch-2)',
    avatarClass: 'tk-accent-av-1 text-white',
    badge10Class: 'tk-accent-badge-2',
    soft10Class: 'tk-accent-soft-2',
    interactive10Class: 'tk-accent-interactive-2',
    textClass: 'tk-accent-text-2',
    dotClass: 'tk-accent-dot-2',
  },
  ocean: {
    hex: 'var(--tk-swatch-1)',
    avatarClass: 'tk-accent-av-2 text-white',
    badge10Class: 'tk-accent-badge-1',
    soft10Class: 'tk-accent-soft-1',
    interactive10Class: 'tk-accent-interactive-1',
    textClass: 'tk-accent-text-1',
    dotClass: 'tk-accent-dot-1',
  },
};

export type AccentBadgeSize = '2xs' | 'xs' | 'sm' | 'md' | 'lg';

const BADGE_SIZE_CLASSES: Record<
  AccentBadgeSize,
  { box: string; rounded: string; icon: string }
> = {
  '2xs': { box: 'w-5 h-5', rounded: 'rounded-md', icon: 'w-3 h-3' },
  xs: { box: 'w-6 h-6', rounded: 'rounded-lg', icon: 'w-3.5 h-3.5' },
  sm: { box: 'w-7 h-7', rounded: 'rounded-lg', icon: 'w-3.5 h-3.5' },
  md: { box: 'w-9 h-9', rounded: 'rounded-[16px]', icon: 'w-4 h-4' },
  lg: { box: 'w-11 h-11', rounded: 'rounded-[20px]', icon: 'w-5 h-5' },
};

export interface AccentIconBadgeProps {
  accent?: AccentKey;
  icon: LucideIcon;
  size?: AccentBadgeSize;
  shape?: 'rounded' | 'circle';
  ring?: boolean;
  strokeWidth?: number;
  className?: string;
  iconClassName?: string;
  title?: string;
}

/**
 * Reusable dynamic Lucide icon container with 10% translucent accent background (`bg-opacity-10`).
 */
export const AccentIconBadge: React.FC<AccentIconBadgeProps> = ({
  accent = 'teal',
  icon: Icon,
  size = 'md',
  shape = 'rounded',
  ring = true,
  strokeWidth = 2,
  className = '',
  iconClassName = '',
  title,
}) => {
  const token = HERO_ACCENT_PALETTE[accent] ?? HERO_ACCENT_PALETTE.teal;
  const sizeSpec = BADGE_SIZE_CLASSES[size];
  const radiusClass = shape === 'circle' ? 'rounded-full' : sizeSpec.rounded;
  const colorClass = ring ? token.badge10Class : token.soft10Class;

  return (
    <span
      title={title}
      className={`[font-family:'Inter_Variable',Inter,system-ui,'PingFang_SC',sans-serif] [--font-serif:'Playfair_Display',Georgia,'Songti_SC',serif] inline-flex items-center justify-center shrink-0 transition-colors ${sizeSpec.box} ${radiusClass} ${colorClass} ${className}`}
    >
      <Icon
        className={`${sizeSpec.icon} shrink-0 ${iconClassName}`}
        strokeWidth={strokeWidth}
        aria-hidden="true"
      />
    </span>
  );
};

/**
 * Cross-module navigation accent mapping:
 * - Packing -> `teal` (`HERO_AVATAR_BG.teal`)
 * - Itinerary -> `ocean` (route & spatial blue)
 * - Budget -> `lavender` (`HERO_AVATAR_BG.lavender`)
 * - AI Copilot -> `peach` (`HERO_AVATAR_BG.peach`)
 */
export const TAB_ACCENT_MAP: Record<AppTab | 'ai', AccentKey> = {
  packing: 'teal',
  itinerary: 'ocean',
  budget: 'lavender',
  memories: 'rose',
  ai: 'peach',
};

/**
 * Resolves dynamic Lucide icon & `accent` key for a PackingGroup based on `colorKey`, `id`, and `title`.
 */
export function resolvePackingGroupIconMeta(
  grp: Pick<PackingGroup, 'id' | 'title' | 'colorKey'>
): { accent: AccentKey; Icon: LucideIcon } {
  const accent: AccentKey = HERO_ACCENT_PALETTE[grp.colorKey] ? grp.colorKey : 'teal';
  const key = `${grp.id} ${grp.title}`.toLowerCase();

  if (/baby|kid|infant|toddler|母婴|婴儿|宝宝|儿童|亲子/.test(key)) {
    return { accent, Icon: Baby };
  }
  if (/photo|camera|lens|drone|optic|摄影|相机|镜头|航拍|影像/.test(key)) {
    return { accent, Icon: Camera };
  }
  if (/remote|work|office|business_gear|laptop|办公|商务设备|电脑/.test(key)) {
    return { accent, Icon: Laptop };
  }
  if (/shop|taxfree|vat|souvenir|血拼|退税|购物|代购|伴手礼/.test(key)) {
    return { accent, Icon: ShoppingBag };
  }
  if (/theme_park|disney|universal|amusement|乐园|迪士尼|环球影城/.test(key)) {
    return { accent, Icon: Ticket };
  }
  if (/hike|hiking|trail|outdoor|trek|camp|ski|snow|徒步|登山|山野|户外|露营|滑雪|冰雪/.test(key)) {
    return { accent, Icon: Mountain };
  }
  if (/beach|swim|pool|onsen|spa|water|海滨|海滩|游泳|温泉|泡汤|亲水|浮潜/.test(key)) {
    return { accent, Icon: Waves };
  }
  if (/foot|shoe|boot|sandal|fitness|gym|run|鞋|靴|拖鞋|运动|健身|晨跑/.test(key)) {
    return { accent, Icon: Footprints };
  }
  if (/doc|passport|visa|qr|pass|证|护|签|票|卡|通关/.test(key)) {
    return { accent, Icon: FileText };
  }
  if (/cloth|wear|apparel|top|bottom|underwear|formal|衣|服|穿搭|外套|上装|下装|内衣|裤|袜|正装|礼服/.test(key)) {
    return { accent, Icon: Shirt };
  }
  if (/tech|elec|power|gear|数码|电|充|转换/.test(key)) {
    return { accent, Icon: PlugZap };
  }
  if (/toil|wash|cosmetic|skin|洗|护|妆|卫|浴|敏/.test(key)) {
    return { accent, Icon: Droplets };
  }
  if (/med|health|pill|first|药|急|健|医|防/.test(key)) {
    return { accent, Icon: HeartPulse };
  }
  if (/carry|edc|daypack|随身|登机|包/.test(key)) {
    return { accent, Icon: Backpack };
  }
  return { accent, Icon: Package };
}

/**
 * Resolves dynamic Lucide icon & `accent` key for the 9 Smart Organizer Bags.
 */
export function resolveSmartBagIconMeta(bagId: SmartBagId): {
  accent: AccentKey;
  Icon: LucideIcon;
} {
  switch (bagId) {
    case 'doc_pouch':
      return { accent: 'peach', Icon: FileText };
    case 'pill_box':
      return { accent: 'rose', Icon: HeartPulse };
    case 'edc_bag':
      return { accent: 'teal', Icon: Briefcase };
    case 'cube_xl':
      return { accent: 'teal', Icon: Luggage };
    case 'cube_l':
      return { accent: 'lavender', Icon: Layers };
    case 'cube_m':
      return { accent: 'mint', Icon: Shirt };
    case 'cube_s':
      return { accent: 'lemon', Icon: Package };
    case 'shoe_bag':
      return { accent: 'peach', Icon: Footprints };
    case 'toiletry_bag':
      return { accent: 'ocean', Icon: Droplets };
    default:
      return { accent: 'teal', Icon: Package };
  }
}

/**
 * Resolves dynamic Lucide icon & `accent` key for Expense Ledger items & Budget Buckets.
 * Anchored directly on `HERO_AVATAR_BG` (`daily` -> `teal`, `shopping` -> `lavender`, `prepaid` -> `peach`).
 */
export function resolveBucketAccent(bucket: ExpenseBucket): AccentKey {
  switch (bucket) {
    case 'shopping':
      return 'lavender';
    case 'prepaid':
      return 'peach';
    case 'daily':
    default:
      return 'teal';
  }
}

export function resolveExpenseIconMeta(
  expense: Pick<ExpenseRecord, 'bucket' | 'account' | 'title' | 'vatEligible'>
): { accent: AccentKey; Icon: LucideIcon } {
  const accent = resolveBucketAccent(expense.bucket);
  const titleLower = (expense.title || '').toLowerCase();

  if (expense.bucket === 'shopping') {
    return { accent, Icon: ShoppingBag };
  }

  if (expense.bucket === 'prepaid') {
    if (/flight|air|plane|航|机票|飞/.test(titleLower)) {
      return { accent, Icon: Plane };
    }
    if (/train|rail|eurostar|thalys|sncf|高铁|火车|列车|车票/.test(titleLower)) {
      return { accent, Icon: Train };
    }
    if (/ticket|museum|pass|门票|预约|通票/.test(titleLower)) {
      return { accent, Icon: Ticket };
    }
    return { accent, Icon: BedDouble };
  }

  // daily bucket ('teal')
  if (
    expense.account === 'transit' ||
    /metro|subway|bus|tram|train|uber|taxi|bolt|rer|navigo|ov-chip|地铁|公交|打车|交通|车票/.test(
      titleLower
    )
  ) {
    return { accent, Icon: Train };
  }
  if (/coffee|cafe|café|bakery|croissant|tea|gelato|bar|咖啡|烘焙|早餐|甜点|下午茶|酒/.test(titleLower)) {
    return { accent, Icon: Coffee };
  }
  if (/museum|louvre|canal|cruise|ticket|tour|门票|游船|展|馆/.test(titleLower)) {
    return { accent, Icon: Ticket };
  }
  return { accent, Icon: Utensils };
}

/**
 * Resolves dynamic Lucide icon & `accent` key for Live Wallets (`cash` | `card` | `transit`).
 */
export function resolveWalletIconMeta(account: PaymentAccount): {
  accent: AccentKey;
  Icon: LucideIcon;
} {
  switch (account) {
    case 'cash':
      return { accent: 'teal', Icon: Banknote };
    case 'card':
      return { accent: 'lavender', Icon: CreditCard };
    case 'transit':
      return { accent: 'peach', Icon: Train };
    default:
      return { accent: 'teal', Icon: CreditCard };
  }
}

/**
 * Resolves dynamic Lucide icon & `accent` key for Itinerary Timeline Stop Types.
 */
export function resolveStopTypeIconMeta(
  stopType?: StopType,
  isRainSwapped?: boolean
): { accent: AccentKey; Icon: LucideIcon } {
  if (isRainSwapped) {
    return { accent: 'peach', Icon: CloudRain };
  }
  switch (stopType) {
    case 'dining':
      return { accent: 'peach', Icon: Utensils };
    case 'shopping':
      return { accent: 'lavender', Icon: ShoppingBag };
    case 'hotel':
      return { accent: 'ocean', Icon: BedDouble };
    case 'transit':
      return { accent: 'mint', Icon: Train };
    case 'attraction':
    default:
      return { accent: 'teal', Icon: Landmark };
  }
}

/**
 * Resolves dynamic Lucide icon & `accent` key for Pre-Trip Task Categories.
 */
export function resolveTaskCategoryIconMeta(category: TripTaskCategory): {
  accent: AccentKey;
  Icon: LucideIcon;
} {
  switch (category) {
    case '门票预约':
      return { accent: 'teal', Icon: Ticket };
    case '交通接送':
      return { accent: 'ocean', Icon: Train };
    case '住宿餐饮':
      return { accent: 'peach', Icon: Utensils };
    case '通讯金融':
      return { accent: 'lavender', Icon: Smartphone };
    case '其他事务':
    default:
      return { accent: 'lemon', Icon: ClipboardList };
  }
}
