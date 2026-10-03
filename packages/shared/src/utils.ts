import {
  DEFAULT_LOCALE,
  type SubjectType,
  type CollectedInfo,
  type Locale,
  type CoffeeBenefitChange,
  type CoffeeBenefitSnapshotItemV1,
  type CoffeeBenefitSnapshotV1,
  type CoffeeBrandKey,
  type CoffeeDecisionPurpose,
  type CoffeeSeoPurpose,
  type CoffeeOrganicPreferencesV1,
  type DiscountProvider,
} from './types.js';
import {
  COFFEE_BRAND_ALIASES,
  COFFEE_BRAND_KEYS,
  COFFEE_DECISION_PURPOSE_VALUES,
  COFFEE_ORGANIC_PREFERENCES_TTL_DAYS,
  COFFEE_SEO_PURPOSE_VALUES,
  DISCOUNT_PROVIDER_VALUES,
  MS_PER_DAY,
  SUBJECT_TYPE_LABELS,
  requirementForSponsorLevel,
} from './constants.js';

/** SubjectType 라벨 반환 (다국어) */
export function getSubjectTypeLabel(type: SubjectType | string, locale: Locale = DEFAULT_LOCALE): string {
  const labels = SUBJECT_TYPE_LABELS[locale] ?? SUBJECT_TYPE_LABELS[DEFAULT_LOCALE];
  return labels[type as SubjectType] || type;
}

// ── parseSubjectType 다국어 키워드 ──

const SUBJECT_KEYWORDS: Record<Locale, { pattern: string[]; type: SubjectType }[]> = {
  ko: [
    { pattern: ['사람', '미아'], type: 'PERSON' },
    { pattern: ['강아지', '개'], type: 'DOG' },
    { pattern: ['고양이'], type: 'CAT' },
  ],
  en: [
    { pattern: ['person', 'human', 'people', 'child', 'kid'], type: 'PERSON' },
    { pattern: ['dog', 'puppy'], type: 'DOG' },
    { pattern: ['cat', 'kitten'], type: 'CAT' },
  ],
  ja: [
    { pattern: ['人', 'ひと', '子供', '子ども'], type: 'PERSON' },
    { pattern: ['犬', 'いぬ', 'わんちゃん'], type: 'DOG' },
    { pattern: ['猫', 'ねこ', 'にゃんこ'], type: 'CAT' },
  ],
  'zh-TW': [
    { pattern: ['人', '小孩', '兒童'], type: 'PERSON' },
    { pattern: ['狗', '犬', '小狗'], type: 'DOG' },
    { pattern: ['貓', '猫', '小貓'], type: 'CAT' },
  ],
};

/** 대상 유형 입력을 SubjectType으로 파싱 (다국어) */
export function parseSubjectType(msg: string, locale: Locale = DEFAULT_LOCALE): SubjectType | null {
  const lower = msg.toLowerCase();

  // 먼저 현재 locale로 시도
  const localeKeywords = SUBJECT_KEYWORDS[locale] ?? SUBJECT_KEYWORDS[DEFAULT_LOCALE];
  for (const { pattern, type } of localeKeywords) {
    if (pattern.some((kw) => lower.includes(kw))) return type;
  }

  // fallback: 모든 locale에서 시도
  for (const [loc, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    if (loc === locale) continue;
    for (const { pattern, type } of keywords) {
      if (pattern.some((kw) => lower.includes(kw))) return type;
    }
  }

  return null;
}

// ── parseTimeExpression 다국어 ──

function parseTimeExpressionKo(msg: string): string {
  const now = new Date();

  if (msg.includes('방금') || msg.includes('지금')) return now.toISOString();

  if (msg.includes('어제')) {
    now.setDate(now.getDate() - 1);
  } else if (msg.includes('그저께') || msg.includes('그제')) {
    now.setDate(now.getDate() - 2);
  }

  const isPM = msg.includes('오후') || msg.includes('저녁') || msg.includes('밤');
  const isAM = msg.includes('오전') || msg.includes('아침') || msg.includes('새벽');

  const hourMatch = msg.match(/(\d{1,2})\s*시/);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1]);
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    now.setHours(hour, 0, 0, 0);
  } else if (msg.includes('저녁') || msg.includes('밤')) {
    now.setHours(19, 0, 0, 0);
  } else if (msg.includes('아침') || msg.includes('새벽')) {
    now.setHours(7, 0, 0, 0);
  } else if (msg.includes('점심')) {
    now.setHours(12, 0, 0, 0);
  }

  const minMatch = msg.match(/(\d{1,2})\s*분/);
  if (minMatch) now.setMinutes(parseInt(minMatch[1]));

  const agoHourMatch = msg.match(/(\d+)\s*시간\s*전/);
  if (agoHourMatch) {
    const result = new Date();
    result.setHours(result.getHours() - parseInt(agoHourMatch[1]));
    return result.toISOString();
  }
  const agoMinMatch = msg.match(/(\d+)\s*분\s*전/);
  if (agoMinMatch) {
    const result = new Date();
    result.setMinutes(result.getMinutes() - parseInt(agoMinMatch[1]));
    return result.toISOString();
  }

  return now.toISOString();
}

function parseTimeExpressionEn(msg: string): string {
  const now = new Date();
  const lower = msg.toLowerCase();

  if (lower.includes('just now') || lower.includes('right now')) return now.toISOString();

  if (lower.includes('yesterday')) {
    now.setDate(now.getDate() - 1);
  } else if (lower.includes('day before yesterday')) {
    now.setDate(now.getDate() - 2);
  }

  const isPM = lower.includes('pm') || lower.includes('evening') || lower.includes('night');
  const isAM = lower.includes('am') || lower.includes('morning');

  const hourMatch = lower.match(/(\d{1,2})\s*(?::|o'clock|pm|am)/);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1]);
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    now.setHours(hour, 0, 0, 0);
  } else if (lower.includes('evening') || lower.includes('night')) {
    now.setHours(19, 0, 0, 0);
  } else if (lower.includes('morning')) {
    now.setHours(7, 0, 0, 0);
  } else if (lower.includes('noon') || lower.includes('lunch')) {
    now.setHours(12, 0, 0, 0);
  }

  const agoHourMatch = lower.match(/(\d+)\s*hours?\s*ago/);
  if (agoHourMatch) {
    const result = new Date();
    result.setHours(result.getHours() - parseInt(agoHourMatch[1]));
    return result.toISOString();
  }
  const agoMinMatch = lower.match(/(\d+)\s*min(?:ute)?s?\s*ago/);
  if (agoMinMatch) {
    const result = new Date();
    result.setMinutes(result.getMinutes() - parseInt(agoMinMatch[1]));
    return result.toISOString();
  }

  return now.toISOString();
}

function parseTimeExpressionJa(msg: string): string {
  const now = new Date();

  if (msg.includes('さっき') || msg.includes('たった今') || msg.includes('今')) return now.toISOString();

  if (msg.includes('昨日') || msg.includes('きのう')) {
    now.setDate(now.getDate() - 1);
  } else if (msg.includes('一昨日') || msg.includes('おととい')) {
    now.setDate(now.getDate() - 2);
  }

  const isPM = msg.includes('午後') || msg.includes('夜') || msg.includes('夕方');
  const isAM = msg.includes('午前') || msg.includes('朝') || msg.includes('早朝');

  const hourMatch = msg.match(/(\d{1,2})\s*時/);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1]);
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    now.setHours(hour, 0, 0, 0);
  } else if (msg.includes('夜') || msg.includes('夕方')) {
    now.setHours(19, 0, 0, 0);
  } else if (msg.includes('朝') || msg.includes('早朝')) {
    now.setHours(7, 0, 0, 0);
  } else if (msg.includes('昼')) {
    now.setHours(12, 0, 0, 0);
  }

  const minMatch = msg.match(/(\d{1,2})\s*分/);
  if (minMatch && !msg.includes('分前')) now.setMinutes(parseInt(minMatch[1]));

  const agoHourMatch = msg.match(/(\d+)\s*時間前/);
  if (agoHourMatch) {
    const result = new Date();
    result.setHours(result.getHours() - parseInt(agoHourMatch[1]));
    return result.toISOString();
  }
  const agoMinMatch = msg.match(/(\d+)\s*分前/);
  if (agoMinMatch) {
    const result = new Date();
    result.setMinutes(result.getMinutes() - parseInt(agoMinMatch[1]));
    return result.toISOString();
  }

  return now.toISOString();
}

function parseTimeExpressionZhTW(msg: string): string {
  const now = new Date();

  if (msg.includes('剛才') || msg.includes('剛剛') || msg.includes('現在')) return now.toISOString();

  if (msg.includes('昨天')) {
    now.setDate(now.getDate() - 1);
  } else if (msg.includes('前天')) {
    now.setDate(now.getDate() - 2);
  }

  const isPM = msg.includes('下午') || msg.includes('晚上') || msg.includes('傍晚');
  const isAM = msg.includes('上午') || msg.includes('早上') || msg.includes('清晨');

  const hourMatch = msg.match(/(\d{1,2})\s*[點点]/);
  if (hourMatch) {
    let hour = parseInt(hourMatch[1]);
    if (isPM && hour < 12) hour += 12;
    if (isAM && hour === 12) hour = 0;
    now.setHours(hour, 0, 0, 0);
  } else if (msg.includes('晚上') || msg.includes('傍晚')) {
    now.setHours(19, 0, 0, 0);
  } else if (msg.includes('早上') || msg.includes('清晨')) {
    now.setHours(7, 0, 0, 0);
  } else if (msg.includes('中午')) {
    now.setHours(12, 0, 0, 0);
  }

  const minMatch = msg.match(/(\d{1,2})\s*分/);
  if (minMatch && !msg.includes('分鐘前')) now.setMinutes(parseInt(minMatch[1]));

  const agoHourMatch = msg.match(/(\d+)\s*(?:小時|個小時)前/);
  if (agoHourMatch) {
    const result = new Date();
    result.setHours(result.getHours() - parseInt(agoHourMatch[1]));
    return result.toISOString();
  }
  const agoMinMatch = msg.match(/(\d+)\s*分鐘前/);
  if (agoMinMatch) {
    const result = new Date();
    result.setMinutes(result.getMinutes() - parseInt(agoMinMatch[1]));
    return result.toISOString();
  }

  return now.toISOString();
}

/** 시간 표현을 ISO 문자열로 파싱 (다국어) */
export function parseTimeExpression(msg: string, locale: Locale = DEFAULT_LOCALE): string {
  switch (locale) {
    case 'ko': return parseTimeExpressionKo(msg);
    case 'en': return parseTimeExpressionEn(msg);
    case 'ja': return parseTimeExpressionJa(msg);
    case 'zh-TW': return parseTimeExpressionZhTW(msg);
    default: return parseTimeExpressionKo(msg);
  }
}

// ── buildSightingSummary 다국어 ──

const SUMMARY_LABELS: Record<Locale, {
  type: string; desc: string; place: string; time: string;
  photo: string; photos: string; reporter: string; contact: string; none: string; noPhoto: string;
}> = {
  ko: { type: '유형', desc: '설명', place: '장소', time: '시간', photo: '사진', photos: '장', reporter: '제보자', contact: '연락처', none: '(없음)', noPhoto: '없음' },
  en: { type: 'Type', desc: 'Description', place: 'Location', time: 'Time', photo: 'Photos', photos: '', reporter: 'Reporter', contact: 'Contact', none: '(none)', noPhoto: 'none' },
  ja: { type: '種類', desc: '説明', place: '場所', time: '時間', photo: '写真', photos: '枚', reporter: '通報者', contact: '連絡先', none: '（なし）', noPhoto: 'なし' },
  'zh-TW': { type: '類型', desc: '描述', place: '地點', time: '時間', photo: '照片', photos: '張', reporter: '報告者', contact: '聯絡方式', none: '（無）', noPhoto: '無' },
};

/** 제보 요약 텍스트 생성 (다국어) */
export function buildSightingSummary(context: CollectedInfo, locale: Locale = DEFAULT_LOCALE): string {
  const l = SUMMARY_LABELS[locale] ?? SUMMARY_LABELS[DEFAULT_LOCALE];
  const typeLabel = getSubjectTypeLabel(context.subjectType || 'DOG', locale);

  const localeTag = locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : locale === 'zh-TW' ? 'zh-TW' : 'en-US';
  const photoCount = context.photoUrls?.length;
  const photoText = photoCount
    ? (locale === 'en' ? `${photoCount}` : `${photoCount}${l.photos}`)
    : l.noPhoto;

  const lines = [
    `${l.type}: ${typeLabel}`,
    `${l.desc}: ${context.description || l.none}`,
    `${l.place}: ${context.address || l.none}`,
    `${l.time}: ${context.sightedAt ? new Date(context.sightedAt).toLocaleString(localeTag) : l.none}`,
    `${l.photo}: ${photoText}`,
  ];
  if (context.tipsterName) lines.push(`${l.reporter}: ${context.tipsterName}`);
  if (context.tipsterPhone) lines.push(`${l.contact}: ${context.tipsterPhone}`);
  return lines.join('\n');
}

// ── formatTimeAgo 다국어 ──

const TIME_AGO_LABELS: Record<Locale, {
  just: string; min: string; hour: string; day: string; month: string; year: string;
}> = {
  ko: { just: '방금 전', min: '분 전', hour: '시간 전', day: '일 전', month: '개월 전', year: '년 전' },
  en: { just: 'just now', min: 'min ago', hour: 'hr ago', day: 'd ago', month: 'mo ago', year: 'yr ago' },
  ja: { just: 'たった今', min: '分前', hour: '時間前', day: '日前', month: 'ヶ月前', year: '年前' },
  'zh-TW': { just: '剛才', min: '分鐘前', hour: '小時前', day: '天前', month: '個月前', year: '年前' },
};

// ── UTC 자정 (일일 한도 집계 기준) ──

/** UTC 기준 오늘 자정 Date 반환 (서버 로컬 타임존 의존 방지) */
export function utcDayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// ── 후원 XP 레벨 계산 (pryzm 동일 공식) ──

export interface SponsorLevelSnapshot {
  level: number;
  currentXP: number;
  xpToNextLevel: number;
}

/** 누적 후원XP → 레벨 + 현재 레벨 내 XP + 다음 레벨까지 필요 XP (pryzm 동일 공식) */
export function computeSponsorLevel(xpTotal: number): SponsorLevelSnapshot {
  const total = Math.max(0, Math.floor(xpTotal || 0));
  let remaining = total;
  for (let i = 1; i <= 500; i++) {
    const need = requirementForSponsorLevel(i);
    if (remaining < need) {
      return { level: i, currentXP: remaining, xpToNextLevel: need - remaining };
    }
    remaining -= need;
  }
  const need = requirementForSponsorLevel(500);
  return { level: 500, currentXP: need, xpToNextLevel: 0 };
}

/** 상대 시간 포맷 (다국어) */
export function formatTimeAgo(dateStr: string, locale: Locale = DEFAULT_LOCALE): string {
  const l = TIME_AGO_LABELS[locale] ?? TIME_AGO_LABELS[DEFAULT_LOCALE];
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return l.just;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}${locale === 'en' ? ' ' : ''}${l.min}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}${locale === 'en' ? ' ' : ''}${l.hour}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}${locale === 'en' ? ' ' : ''}${l.day}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}${locale === 'en' ? ' ' : ''}${l.month}`;
  return `${Math.floor(months / 12)}${locale === 'en' ? ' ' : ''}${l.year}`;
}

// ── 커피 오가닉 성장 루프 ──

export function isCoffeeBrandKey(value: unknown): value is CoffeeBrandKey {
  return typeof value === 'string' && (COFFEE_BRAND_KEYS as readonly string[]).includes(value);
}

export function isDiscountProvider(value: unknown): value is DiscountProvider {
  return typeof value === 'string' && (DISCOUNT_PROVIDER_VALUES as readonly string[]).includes(value);
}

export function isCoffeeDecisionPurpose(value: unknown): value is CoffeeDecisionPurpose {
  return typeof value === 'string' && (COFFEE_DECISION_PURPOSE_VALUES as readonly string[]).includes(value);
}

export function isCoffeeSeoPurpose(value: unknown): value is CoffeeSeoPurpose {
  return typeof value === 'string' && (COFFEE_SEO_PURPOSE_VALUES as readonly string[]).includes(value);
}

function compactBrand(value: string): string {
  return value.toLocaleLowerCase('ko-KR').replace(/[^a-z0-9가-힣]/g, '');
}

export function normalizeCoffeeBrand(value: string | null | undefined): CoffeeBrandKey | null {
  if (!value) return null;
  const compact = compactBrand(value);
  if (!compact) return null;
  for (const brand of COFFEE_BRAND_KEYS) {
    if (compact === brand) return brand;
    if (COFFEE_BRAND_ALIASES[brand].some((alias) => compact.includes(compactBrand(alias)))) {
      return brand;
    }
  }
  return null;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

export function parseCoffeeOrganicPreferences(
  value: unknown,
  nowMs = Date.now(),
): CoffeeOrganicPreferencesV1 | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !isIsoDate(raw.savedAt) || !isIsoDate(raw.lastUsedAt)) return null;
  if (nowMs - Date.parse(raw.lastUsedAt) > COFFEE_ORGANIC_PREFERENCES_TTL_DAYS * MS_PER_DAY) return null;

  const telecoms = Array.isArray(raw.telecoms) ? raw.telecoms.filter(isDiscountProvider) : [];
  const cards = Array.isArray(raw.cards) ? raw.cards.filter(isDiscountProvider) : [];
  const preferredBrands = Array.isArray(raw.preferredBrands)
    ? raw.preferredBrands.filter(isCoffeeBrandKey)
    : [];
  const purpose = isCoffeeDecisionPurpose(raw.purpose) ? raw.purpose : undefined;

  return {
    version: 1,
    ...(purpose ? { purpose } : {}),
    ...(stringOrUndefined(raw.region) ? { region: stringOrUndefined(raw.region) } : {}),
    ...(stringOrUndefined(raw.station) ? { station: stringOrUndefined(raw.station) } : {}),
    telecoms: [...new Set(telecoms)],
    cards: [...new Set(cards)],
    preferredBrands: [...new Set(preferredBrands)],
    savedAt: raw.savedAt,
    lastUsedAt: raw.lastUsedAt,
  };
}

function parseSnapshotItem(value: unknown): CoffeeBenefitSnapshotItemV1 | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== 'string' || !isIsoDate(raw.updatedAt) || typeof raw.status !== 'string') return null;
  if (raw.endDate !== null && !isIsoDate(raw.endDate)) return null;
  return { id: raw.id, updatedAt: raw.updatedAt, status: raw.status, endDate: raw.endDate };
}

export function parseCoffeeBenefitSnapshot(value: unknown): CoffeeBenefitSnapshotV1 | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (raw.version !== 1 || !isIsoDate(raw.capturedAt) || !Array.isArray(raw.items)) return null;
  const items = raw.items.map(parseSnapshotItem);
  if (items.some((item) => item === null)) return null;
  return { version: 1, capturedAt: raw.capturedAt, items: items as CoffeeBenefitSnapshotItemV1[] };
}

export function diffCoffeeBenefitSnapshots(
  previous: CoffeeBenefitSnapshotV1 | null,
  current: CoffeeBenefitSnapshotV1,
): CoffeeBenefitChange[] {
  if (!previous) return [];
  const before = new Map(previous.items.map((item) => [item.id, item]));
  const after = new Map(current.items.map((item) => [item.id, item]));
  const changes: CoffeeBenefitChange[] = [];

  for (const item of current.items) {
    const old = before.get(item.id);
    if (!old) changes.push({ type: 'new', item });
    else if (old.updatedAt !== item.updatedAt || old.status !== item.status || old.endDate !== item.endDate) {
      changes.push({ type: 'updated', item });
    }
  }
  for (const item of previous.items) {
    if (!after.has(item.id)) changes.push({ type: 'expired', item });
  }
  return changes;
}

// ── 커피콩 프로모/특가 시각 계약 ──────────────────────────────────────────────

/**
 * 오프셋이 명시된 ISO 8601 만 통과시키는 패턴.
 *
 * `new Date("2026-08-16T23:59:59")` 는 스펙상 **로컬 시각**이다. 토스 특가 `endAt` 은 벤더
 * 응답을 그대로 실어 나르는 문자열이라, 벤더가 오프셋을 빼는 순간 같은 값을 서버(UTC)와
 * 앱(KST)이 9시간 다르게 읽는다 — 끝난 특가가 계속 노출되거나 살아있는 특가가 사라진다.
 * 앱은 이미 이 규칙으로 fail-closed 하므로(coffee `src/utils/promo.ts`), 서버가 형식을
 * 보증하지 않으면 "특가 프로모가 조용히 전부 안 뜨는" 쪽으로 무너진다.
 */
export const ISO_INSTANT_WITH_OFFSET_RE =
  /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}(:\d{2}(\.\d+)?)?([Zz]|[+-]\d{2}:?\d{2})$/;

/** 오프셋 명시 ISO 8601 → epoch ms. 형식이 어긋나거나 파싱 불가면 null (fail-closed). */
export function parseIsoInstantMs(value: unknown): number | null {
  if (typeof value !== 'string' || !ISO_INSTANT_WITH_OFFSET_RE.test(value)) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * 벤더 시각 문자열을 UTC(Z) ISO 로 정규화한다. 통과하지 못하면 null.
 *
 * 저장 시점에 한 번 정규화해 두면 이후 계층(DB 스냅샷 → config 응답 → 앱)이 전부 같은
 * 문자열을 보게 되어, 오프셋 표기 차이로 판정이 갈릴 여지가 남지 않는다.
 */
export function toIsoInstant(value: unknown): string | null {
  const ms = parseIsoInstantMs(value);
  return ms === null ? null : new Date(ms).toISOString();
}
