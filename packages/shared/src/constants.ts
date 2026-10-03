import type { SubjectType, ConversationStep, Locale } from './types.js';

// ── 대상 유형 라벨 (다국어) ──

export const SUBJECT_TYPE_LABELS: Record<Locale, Record<SubjectType, string>> = {
  ko: { PERSON: '사람', DOG: '강아지', CAT: '고양이' },
  en: { PERSON: 'Person', DOG: 'Dog', CAT: 'Cat' },
  ja: { PERSON: '人', DOG: '犬', CAT: '猫' },
  'zh-TW': { PERSON: '人', DOG: '狗', CAT: '貓' },
};

// ── 시간 ──

export const MS_PER_DAY = 86_400_000;

// ── 매칭 임계값 ──

export const MATCH_THRESHOLD = 0.6;
export const NOTIFY_THRESHOLD = 0.8;
export const MAX_CANDIDATES = 20;
export const MATCH_RADIUS_KM = 50;

// ── 페이지네이션 ──

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 50;
export const MAX_COMMENT_PAGE_SIZE = 100;

// ── 파일 업로드 ──

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_REPORT_PHOTOS = 5;
export const MAX_SIGHTING_PHOTOS = 5;
export const MAX_ADDITIONAL_PHOTOS = 3;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PET_PHOTOS = 1;
export const MAX_PETS_PER_USER = 10;

// ── 챗봇 단계별 메시지 (다국어) ──

export const STEP_MESSAGES: Record<Locale, Record<ConversationStep, string>> = {
  ko: {
    GREETING:
      '안녕하세요! 실종자/반려동물 목격 제보 챗봇입니다. 🔍\n어떤 종류를 목격하셨나요?',
    SUBJECT_TYPE: '목격하신 대상을 선택해주세요.',
    PHOTO: '목격하신 사진이 있으면 보내주세요. 없으면 "없음"이라고 입력해주세요.',
    DESCRIPTION: '어떤 모습이었나요? 색상, 크기, 특징 등을 알려주세요.',
    LOCATION: '어디에서 목격하셨나요? (예: 서울시 강남구 역삼역 3번출구 앞)',
    TIME: '언제 목격하셨나요? (예: 오늘 오후 3시, 어제 저녁)',
    CONTACT: '연락처를 남겨주시면 매칭 시 알려드립니다. (선택사항, "건너뛰기" 가능)',
    CONFIRM: '',
    SUBMITTED: '제보가 접수되었습니다! AI가 실종 신고들과 비교 분석을 시작합니다. 감사합니다. 🙏',
  },
  en: {
    GREETING:
      'Hello! This is the missing person/pet sighting report chatbot. 🔍\nWhat type did you see?',
    SUBJECT_TYPE: 'Please select the type of subject you saw.',
    PHOTO: 'If you have a photo, please send it. Otherwise, type "none".',
    DESCRIPTION: 'What did they look like? Please describe color, size, features, etc.',
    LOCATION: 'Where did you see them? (e.g., 123 Main St, near the park)',
    TIME: 'When did you see them? (e.g., today at 3pm, yesterday evening)',
    CONTACT: 'Leave your contact info to be notified of matches. (Optional, type "skip")',
    CONFIRM: '',
    SUBMITTED: 'Your report has been submitted! AI will start comparing with missing reports. Thank you. 🙏',
  },
  ja: {
    GREETING:
      'こんにちは！行方不明者・ペットの目撃情報チャットボットです。🔍\nどの種類を目撃しましたか？',
    SUBJECT_TYPE: '目撃した対象を選択してください。',
    PHOTO: '目撃した写真があれば送ってください。なければ「なし」と入力してください。',
    DESCRIPTION: 'どのような姿でしたか？色、大きさ、特徴などを教えてください。',
    LOCATION: 'どこで目撃しましたか？（例：東京都渋谷区渋谷駅前）',
    TIME: 'いつ目撃しましたか？（例：今日の午後3時、昨日の夜）',
    CONTACT: '連絡先を残していただければ、マッチング時にお知らせします。（任意、「スキップ」可）',
    CONFIRM: '',
    SUBMITTED: '情報が受理されました！AIが行方不明届と比較分析を開始します。ありがとうございます。🙏',
  },
  'zh-TW': {
    GREETING:
      '您好！這是失蹤人口/寵物目擊報告聊天機器人。🔍\n您目擊了什麼類型？',
    SUBJECT_TYPE: '請選擇您目擊的對象類型。',
    PHOTO: '如果您有照片，請傳送。沒有的話請輸入「沒有」。',
    DESCRIPTION: '他們看起來是什麼樣子？請描述顏色、大小、特徵等。',
    LOCATION: '您在哪裡目擊的？（例：台北市信義區101大樓附近）',
    TIME: '您什麼時候目擊的？（例：今天下午3點、昨天晚上）',
    CONTACT: '留下聯絡方式，配對時會通知您。（選填，可輸入「跳過」）',
    CONFIRM: '',
    SUBMITTED: '您的報告已提交！AI 將開始與失蹤報告進行比對分析。謝謝您。🙏',
  },
};

export const STEP_QUICK_REPLIES: Record<Locale, Partial<Record<ConversationStep, string[]>>> = {
  ko: {
    GREETING: ['사람', '강아지', '고양이'],
    SUBJECT_TYPE: ['사람', '강아지', '고양이'],
    PHOTO: ['없음'],
    CONTACT: ['건너뛰기'],
  },
  en: {
    GREETING: ['Person', 'Dog', 'Cat'],
    SUBJECT_TYPE: ['Person', 'Dog', 'Cat'],
    PHOTO: ['None'],
    CONTACT: ['Skip'],
  },
  ja: {
    GREETING: ['人', '犬', '猫'],
    SUBJECT_TYPE: ['人', '犬', '猫'],
    PHOTO: ['なし'],
    CONTACT: ['スキップ'],
  },
  'zh-TW': {
    GREETING: ['人', '狗', '貓'],
    SUBJECT_TYPE: ['人', '狗', '貓'],
    PHOTO: ['沒有'],
    CONTACT: ['跳過'],
  },
};

// ── 에러 코드 ──

export const ERROR_CODES = {
  COMPANION_CHECKIN_NOT_FOUND: 'COMPANION_CHECKIN_NOT_FOUND',
  COMPANION_EDIT_CONFLICT: 'COMPANION_EDIT_CONFLICT',
  COMPANION_PET_NOT_FOUND: 'COMPANION_PET_NOT_FOUND',
  COMPANION_OBSERVATION_NOT_FOUND: 'COMPANION_OBSERVATION_NOT_FOUND',
  COMPANION_OWNER_ONLY: 'COMPANION_OWNER_ONLY',
  COMPANION_CONSENT_REQUIRED: 'COMPANION_CONSENT_REQUIRED',
  COMPANION_IDEMPOTENCY_CONFLICT: 'COMPANION_IDEMPOTENCY_CONFLICT',
  COMPANION_MEDIA_REQUIRED: 'COMPANION_MEDIA_REQUIRED',
  COMPANION_UNSUPPORTED_MEDIA: 'COMPANION_UNSUPPORTED_MEDIA',
  COMPANION_MEDIA_TOO_LARGE: 'COMPANION_MEDIA_TOO_LARGE',
  COMPANION_AUDIO_DURATION_REQUIRED: 'COMPANION_AUDIO_DURATION_REQUIRED',
  COMPANION_AUDIO_TOO_LONG: 'COMPANION_AUDIO_TOO_LONG',
  COMPANION_MEDIA_PROCESSOR_BUSY: 'COMPANION_MEDIA_PROCESSOR_BUSY',
  COMPANION_MEDIA_PROCESSOR_UNAVAILABLE: 'COMPANION_MEDIA_PROCESSOR_UNAVAILABLE',
  COMPANION_NOT_RETRYABLE: 'COMPANION_NOT_RETRYABLE',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  PHONE_ALREADY_EXISTS: 'PHONE_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_BLOCKED: 'USER_BLOCKED',
  REPORT_NOT_FOUND: 'REPORT_NOT_FOUND',
  REPORT_OWNER_ONLY: 'REPORT_OWNER_ONLY',
  REPORT_STATUS_INVALID: 'REPORT_STATUS_INVALID',
  PHOTO_REQUIRED: 'PHOTO_REQUIRED',
  MATCH_NOT_FOUND: 'MATCH_NOT_FOUND',
  MATCH_OWNER_ONLY: 'MATCH_OWNER_ONLY',
  SIGHTING_REPORT_NOT_FOUND: 'SIGHTING_REPORT_NOT_FOUND',
  SIGHTING_NOT_FOUND: 'SIGHTING_NOT_FOUND',
  SIGHTING_OWNER_ONLY: 'SIGHTING_OWNER_ONLY',
  SIGHTING_PASSWORD_REQUIRED: 'SIGHTING_PASSWORD_REQUIRED',
  SIGHTING_PASSWORD_MISMATCH: 'SIGHTING_PASSWORD_MISMATCH',
  SIGHTING_PHOTO_REQUIRED: 'SIGHTING_PHOTO_REQUIRED',
  IMAGE_ONLY: 'IMAGE_ONLY',
  /** multer limits.fileSize(=MAX_FILE_SIZE) 초과 — 유저 잘못이므로 4xx 로 말한다. */
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  /** 그 밖의 malformed multipart(예상 밖 필드명·파트 수 초과 등). 실제 multer code 는 details 로 싣는다. */
  INVALID_UPLOAD: 'INVALID_UPLOAD',
  PHOTO_ATTACH_REQUIRED: 'PHOTO_ATTACH_REQUIRED',
  SERVER_ERROR: 'SERVER_ERROR',
  INVALID_JOB_DATA: 'INVALID_JOB_DATA',
  INVALID_QUEUE_NAME: 'INVALID_QUEUE_NAME',
  PATH_TRAVERSAL: 'PATH_TRAVERSAL',
  MESSAGE_TOO_LONG: 'MESSAGE_TOO_LONG',
  SESSION_OVERFLOW: 'SESSION_OVERFLOW',
  SESSION_COMPLETED: 'SESSION_COMPLETED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_OWNER_ONLY: 'SESSION_OWNER_ONLY',
  PLATFORM_NOT_SUPPORTED: 'PLATFORM_NOT_SUPPORTED',
  REPORT_PHOTO_LIMIT: 'REPORT_PHOTO_LIMIT',
  REPORT_EDIT_FORBIDDEN: 'REPORT_EDIT_FORBIDDEN',
  REPORT_DELETE_FORBIDDEN: 'REPORT_DELETE_FORBIDDEN',
  EXTERNAL_REPORT_IMMUTABLE: 'EXTERNAL_REPORT_IMMUTABLE',
  REPORT_NOT_ACTIVE: 'REPORT_NOT_ACTIVE',
  REPORT_STATUS_CONFLICT: 'REPORT_STATUS_CONFLICT',
  TWITTER_POST_FAILED: 'TWITTER_POST_FAILED',
  OUTREACH_NOT_FOUND: 'OUTREACH_NOT_FOUND',
  OUTREACH_ALREADY_PROCESSED: 'OUTREACH_ALREADY_PROCESSED',
  DEVLOG_CONTEXT_REQUIRED: 'DEVLOG_CONTEXT_REQUIRED',
  DEV_TOOL_UNAUTHORIZED: 'DEV_TOOL_UNAUTHORIZED',
  ALREADY_VERIFIED: 'ALREADY_VERIFIED',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_GATEWAY_ERROR: 'PAYMENT_GATEWAY_ERROR',
  QUOTE_EXPIRED: 'QUOTE_EXPIRED',
  QUOTE_NOT_FOUND: 'QUOTE_NOT_FOUND',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  OAUTH_FAILED: 'OAUTH_FAILED',
  OAUTH_INVALID_STATE: 'OAUTH_INVALID_STATE',
  AGENT_AUTH_REQUIRED: 'AGENT_AUTH_REQUIRED',
  AGENT_INVALID_ID: 'AGENT_INVALID_ID',
  COMMUNITY_POST_NOT_FOUND: 'COMMUNITY_POST_NOT_FOUND',
  COMMUNITY_POST_OWNER_ONLY: 'COMMUNITY_POST_OWNER_ONLY',
  COMMUNITY_COMMENT_NOT_FOUND: 'COMMUNITY_COMMENT_NOT_FOUND',
  COMMUNITY_COMMENT_OWNER_ONLY: 'COMMUNITY_COMMENT_OWNER_ONLY',
  NO_FIELDS_TO_UPDATE: 'NO_FIELDS_TO_UPDATE',
  EXTERNAL_AGENT_NOT_FOUND: 'EXTERNAL_AGENT_NOT_FOUND',
  EXTERNAL_AGENT_AUTH_REQUIRED: 'EXTERNAL_AGENT_AUTH_REQUIRED',
  EXTERNAL_AGENT_INACTIVE: 'EXTERNAL_AGENT_INACTIVE',
  BOOST_LIMIT_REACHED: 'BOOST_LIMIT_REACHED',
  GAME_PLAY_LIMIT_REACHED: 'GAME_PLAY_LIMIT_REACHED',
  INVALID_GAME_CHARACTER: 'INVALID_GAME_CHARACTER',
  AD_REWARD_COOLDOWN: 'AD_REWARD_COOLDOWN',
  XP_DAILY_LIMIT_REACHED: 'XP_DAILY_LIMIT_REACHED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INQUIRY_NOT_FOUND: 'INQUIRY_NOT_FOUND',
  CURATED_SITE_NOT_FOUND: 'CURATED_SITE_NOT_FOUND',
  ADMIN_AUTH_FAILED: 'ADMIN_AUTH_FAILED',
  INVALID_CRON_SETTINGS: 'INVALID_CRON_SETTINGS',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  AI_KEY_NOT_CONFIGURED: 'AI_KEY_NOT_CONFIGURED',
  AI_TEXT_NOT_FOUND: 'AI_TEXT_NOT_FOUND',
  COMMENT_NOT_FOUND: 'COMMENT_NOT_FOUND',
  COMMENT_OWNER_ONLY: 'COMMENT_OWNER_ONLY',
  OUTREACH_ALREADY_REQUESTED: 'OUTREACH_ALREADY_REQUESTED',
  MISSING_CHECK_NO_PHOTO: 'MISSING_CHECK_NO_PHOTO',
  MISSING_CHECK_ANALYSIS_FAILED: 'MISSING_CHECK_ANALYSIS_FAILED',
  YOUTUBER_HELP_DAILY_LIMIT: 'YOUTUBER_HELP_DAILY_LIMIT',
  YOUTUBER_HELP_NO_VIDEOS: 'YOUTUBER_HELP_NO_VIDEOS',
  CLUSTER_NOT_FOUND: 'CLUSTER_NOT_FOUND',
  PET_NOT_FOUND: 'PET_NOT_FOUND',
  PET_LIMIT_REACHED: 'PET_LIMIT_REACHED',
  PET_OWNER_ONLY: 'PET_OWNER_ONLY',
  CANNOT_REPORT_OWN: 'CANNOT_REPORT_OWN',
  CANNOT_BLOCK_SELF: 'CANNOT_BLOCK_SELF',
  POST_NOT_FOUND: 'POST_NOT_FOUND',
  INVALID_AGENT_ID: 'INVALID_AGENT_ID',
  ALREADY_CHEERED: 'ALREADY_CHEERED',
  ALREADY_VOTED: 'ALREADY_VOTED',
  BEAUTY_TOKEN_DEPLETED: 'BEAUTY_TOKEN_DEPLETED',
  NARRATIVE_GENERATION_FAILED: 'NARRATIVE_GENERATION_FAILED',
  NARRATIVE_NOT_FOUND: 'NARRATIVE_NOT_FOUND',
  WIKI_NOT_FOUND: 'WIKI_NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  DM_SELF_MESSAGE: 'DM_SELF_MESSAGE',
  DM_NOT_FOUND: 'DM_NOT_FOUND',
  DM_ROOM_NOT_FOUND: 'DM_ROOM_NOT_FOUND',
  DM_ROOM_ALREADY_DELETED: 'DM_ROOM_ALREADY_DELETED',
  ALERT_BLAST_LIMIT_REACHED: 'ALERT_BLAST_LIMIT_REACHED',
  IAP_VALIDATION_FAILED: 'IAP_VALIDATION_FAILED',
  IAP_ALREADY_PROCESSED: 'IAP_ALREADY_PROCESSED',
  IAP_INVALID_PRODUCT: 'IAP_INVALID_PRODUCT',
  // coffeemap
  CAFE_NOT_FOUND: 'CAFE_NOT_FOUND',
  CAFE_INVALID_ID: 'CAFE_INVALID_ID',
  CAFE_KAKAO_NOT_SAVED: 'CAFE_KAKAO_NOT_SAVED',
  CAFE_REPORT_EMPTY: 'CAFE_REPORT_EMPTY',
  KAKAO_SEARCH_FAILED: 'KAKAO_SEARCH_FAILED',
  KAKAO_NOT_CONFIGURED: 'KAKAO_NOT_CONFIGURED',
  INVALID_REGION: 'INVALID_REGION',
  OG_RENDER_FAILED: 'OG_RENDER_FAILED',
  // local-site (멀티테넌트 로컬 상담 홈페이지)
  SITE_NOT_FOUND: 'SITE_NOT_FOUND',
  PAGE_NOT_FOUND: 'PAGE_NOT_FOUND',
  LEAD_NOT_FOUND: 'LEAD_NOT_FOUND',
  TOSS_PRODUCT_NOT_AVAILABLE: 'TOSS_PRODUCT_NOT_AVAILABLE',
  PROMO_NOT_FOUND: 'PROMO_NOT_FOUND',
} as const;

// ── DM ──

export const DM_OPEN_COST = 20; // 방 개설 비용 (뷰티 토큰)

// ── BullMQ 큐 이름 ──

export const QUEUE_NAMES = {
  IMAGE_PROCESSING: 'image-processing',
  PROMOTION: 'promotion',
  MATCHING: 'matching',
  NOTIFICATION: 'notification',
  CLEANUP: 'cleanup',
  PROMOTION_MONITOR: 'promotion-monitor',
  PROMOTION_REPOST: 'promotion-repost',
  CRAWL_SCHEDULER: 'crawl-scheduler',
  CRAWL: 'crawl',
  CRAWL_AGENT: 'crawl-agent',
  OUTREACH: 'outreach',
  QA_CRAWL: 'qa-crawl',
  SIGHTING_CLUSTER: 'sighting-cluster',
  LOCAL_ALERT: 'local-alert',
  MALGEUM_CONTENT: 'malgeum-content',
  MALGEUM_OWL_POSTMASTER: 'malgeum-owl-postmaster',
  PART_TIME_CRAWL: 'part-time-crawl',
  CLINIC_EVENT_CRAWL: 'clinic-event-crawl',
  BENEFIT_ENRICHMENT: 'benefit-enrichment',         // cron dispatcher
  BENEFIT_ENRICHMENT_ROW: 'benefit-enrichment-row', // per-row worker (1-row-1-job)
  // ⚠️ 값 변경 금지 — Redis 에 이 이름으로 기존 큐 키가 있어 바꾸면 대기 잡이 고아가 된다.
  COFFEECONG_GAME_RANKING_REWARD: 'coffeecong-game-ranking-reward',
  PET_COMPANION_ANALYSIS: 'pet-companion-analysis',
  PET_COMPANION_CONVERSATION: 'pet-companion-conversation',
  PET_COMPANION_DELETION: 'pet-companion-deletion',
} as const;

// ── 제보 클러스터링 (AI 탐정 추리) ──

/** 클러스터링 대상 반경 (km) — 인접 제보 검색 */
export const CLUSTER_RADIUS_KM = 5;
/** 클러스터링 시간 윈도우 (일) — 최근 N일 내 제보만 */
export const CLUSTER_TIME_WINDOW_DAYS = 14;
/** 클러스터 내 동일 개체 최소 확신도 */
export const CLUSTER_MIN_COHESION = 0.6;
/** 클러스터↔신고 매칭 반경 (km) */
export const CLUSTER_MATCH_RADIUS_KM = 50;
/** 클러스터 만료 (일) — 새 제보 없으면 EXPIRED */
export const CLUSTER_EXPIRE_DAYS = 30;
/** 클러스터링 시 인접 제보 최대 비교 수 */
export const CLUSTER_MAX_NEARBY_SIGHTINGS = 10;

// ── Instagram ──

export const INSTAGRAM_POST_DAILY_LIMIT = 25;

// ── 아웃리치 ──

export const OUTREACH_EMAIL_DAILY_LIMIT = 20;
export const OUTREACH_COMMENT_DAILY_LIMIT = 10;

// ── 수집 에이전트 ──

export const CRAWL_AGENT_MAX_ROUNDS = 20;

// ── JWT ──

export const TOKEN_STORAGE_KEY = 'ft_token';
export const ADMIN_KEY_STORAGE_KEY = 'ft_admin_key';
export const FCM_TOKEN_STORAGE_KEY = 'fcm_token';

// ── 에이전트 공통 ──

export const AGENT_MAX_TOOL_ROUNDS = 5;
export const AGENT_MAX_HISTORY_MESSAGES = 40;
/** 세션 메시지 수 상한 — 초과 시 SESSION_OVERFLOW (admin: 100, sighting: 50) */
export const ADMIN_SESSION_MAX_MESSAGES = 100;
export const SIGHTING_SESSION_MAX_MESSAGES = 50;

// ── 홍보 에이전트 ──

export const REPOST_INTERVAL_HIGH = 24;
export const REPOST_INTERVAL_MEDIUM = 72;
export const REPOST_INTERVAL_LOW = 168;
export const REPOST_MAX_DEFAULT = 3;
export const METRICS_COLLECT_INTERVAL_H = 6;
export const MIN_VIEWS_FOR_GOOD_PERFORMANCE = 100;

// ── 광고 부스트 ──

export const MAX_BOOSTS_PER_DAY = 3;

// ── 좋아요 & 댓글 ──

export const ENTITY_COMMENT_MAX_LENGTH = 2000;

// ── 크롤/에이전트 ──

/** 네이버 검색 API 1회 요청 당 반환 결과 수 */
export const NAVER_SEARCH_DISPLAY_SIZE = 20;
/** AI 소셜 파싱 동시 처리 제한 */
export const AI_PARSING_CONCURRENCY = 3;
/** 관리자 에이전트 도구의 기본 검색 결과 수 */
export const AGENT_SEARCH_LIMIT = 5;
/** 공공 API 기본 페이지 행 수 */
export const PUBLIC_API_DEFAULT_ROWS = 50;

// ── 후원 XP & 레벨 ──

export const XP_PER_AD = 50;
export const AD_REWARD_COOLDOWN_SECS = 60;

/** 활동별 XP 설정 */
export const XP_ACTIONS = {
  AD_WATCH:           { xp: 50,  dailyLimit: null, cooldownSecs: 60 }, // 웹 전용 (모바일 미사용)
  SIGHTING:           { xp: 500, dailyLimit: 3,    cooldownSecs: 0 },
  COMMUNITY_POST:     { xp: 80,  dailyLimit: 5,    cooldownSecs: 0 },
  COMMUNITY_COMMENT:  { xp: 20,  dailyLimit: 15,   cooldownSecs: 0 },
  SHARE:              { xp: 30,  dailyLimit: 10,   cooldownSecs: 0 },
  REFERRAL:           { xp: 500, dailyLimit: 10,   cooldownSecs: 0 },
  REFERRAL_WELCOME:   { xp: 500, dailyLimit: 1,    cooldownSecs: 0 }, // 레퍼리 웰컴 보너스 (생애 1회)
  SPONSOR:            { xp: 0,   dailyLimit: null, cooldownSecs: 0 }, // 웹 전용
  GAME:               { xp: 0,   dailyLimit: null, cooldownSecs: 0 }, // 미사용
  LIKE:               { xp: 5,   dailyLimit: 30,   cooldownSecs: 0 },
  COMMENT:            { xp: 20,  dailyLimit: 15,   cooldownSecs: 0 },
  PET_REGISTER:       { xp: 300, dailyLimit: 1,    cooldownSecs: 0 },
  AGENT_CHEER:        { xp: 10,  dailyLimit: 3,    cooldownSecs: 0 }, // 미출시
  MATCH_VOTE:         { xp: 15,  dailyLimit: 10,   cooldownSecs: 0 }, // 미출시
  PHOTO_REVEAL:       { xp: 20,  dailyLimit: 10,   cooldownSecs: 0 }, // 미화 사진 탭 오픈 완료
  FIRST_REVEAL:       { xp: 100, dailyLimit: 1,    cooldownSecs: 0 }, // 해당 사진 최초 오픈자 보너스 (일 1회 한도)
  NARRATIVE_BASIC:    { xp: 50,  dailyLimit: 3,    cooldownSecs: 0 }, // 스토리 생성 기본 (30 토큰)
  NARRATIVE_PREMIUM:  { xp: 150, dailyLimit: 3,    cooldownSecs: 0 }, // 스토리 생성 프리미엄 (300 토큰)
} as const;

export type XpActionType = keyof typeof XP_ACTIONS;

/** 후원 XP 변환: 1 USD cent = 1 XP */
export const XP_PER_USD_CENT = 1;
/** 후원 XP 변환: 100 KRW = 1 XP */
export const XP_PER_KRW_100 = 1;

/**
 * 레벨업 요구 XP.
 * Lv1→2: 300, Lv2→3: 600, Lv3+: 이전 × 1.35, 100단위 반올림
 */
export function requirementForSponsorLevel(level: number): number {
  if (level <= 1) return 300;
  if (level === 2) return 600;
  // level 3 이상: 800 * 1.35^(level-3), 100단위 반올림
  const base = 800 * Math.pow(1.35, level - 3);
  return Math.round(base / 100) * 100;
}

export const LEVEL_REWARDS: Record<number, { type: string; value: string; label: string }> = {
  2:  { type: 'BADGE', value: 'supporter', label: '서포터 배지' },
  3:  { type: 'BADGE', value: 'helper',    label: '도우미 배지' },
  4:  { type: 'BADGE', value: 'explorer',  label: '탐색자 배지' },
  5:  { type: 'TITLE', value: 'champion',  label: '챔피언 칭호' },
  6:  { type: 'BADGE', value: 'searcher',  label: '수색대 배지' },
  7:  { type: 'BADGE', value: 'hero',      label: '영웅 배지' },
  8:  { type: 'TITLE', value: 'shining',   label: '빛나는 영웅 칭호' },
  10: { type: 'TITLE', value: 'legend',    label: '전설 칭호' },
  15: { type: 'BADGE', value: 'master',    label: '마스터 배지' },
};

// ── 게임 ──

/** 일일 무료 플레이 횟수 (계단 게임) */
export const MAX_FREE_PLAYS_PER_DAY = 1;

/** 광고 시청으로 추가 가능한 최대 플레이 횟수/일 (계단 게임) */
export const MAX_AD_PLAYS_PER_DAY = 2;

/** 점수 1점당 적립 XP (나중에 XP 지급 시 사용) */
export const XP_PER_GAME_SCORE = 1;

// ── 찾기 미니게임 ──

/** 숨은 에이전트 찾기: 일일 무료 플레이 */
export const FIND_GAME_FREE_PLAYS_PER_DAY = 1;

/** 숨은 에이전트 찾기: 광고로 추가 가능한 최대 플레이/일 */
export const FIND_GAME_AD_PLAYS_PER_DAY = 9;

/** 찾기 게임 라운드 시간 (초) */
export const FIND_GAME_ROUND_SECS = 25;

/** 찾기 게임 기본 대상 수 */
export const FIND_GAME_TARGET_COUNT = 3;

/** 찾기 게임 최대 대상 수 */
export const FIND_GAME_MAX_TARGETS = 5;

/** 찾기 게임 최대 점수 (서버 검증용): FIND_GAME_MAX_TARGETS * 100 + ROUND_SECS * 50 */
export const FIND_GAME_MAX_SCORE = FIND_GAME_MAX_TARGETS * 100 + FIND_GAME_ROUND_SECS * 50; // 1750

/** 게임 타입 상수 */
export const GAME_TYPES = { STAIR: 'stair', FIND: 'find' } as const;
export type GameType = typeof GAME_TYPES[keyof typeof GAME_TYPES];

/** 게임 타입별 플레이 한도 */
export const GAME_LIMITS: Record<GameType, { free: number; ad: number }> = {
  stair: { free: MAX_FREE_PLAYS_PER_DAY, ad: MAX_AD_PLAYS_PER_DAY },
  find: { free: FIND_GAME_FREE_PLAYS_PER_DAY, ad: FIND_GAME_AD_PLAYS_PER_DAY },
};

// ── Zod enum 배열 상수 (SSOT) ──

export const SUBJECT_TYPE_VALUES = ['PERSON', 'DOG', 'CAT'] as const;
export const PET_SUBJECT_TYPE_VALUES = ['DOG', 'CAT'] as const;
export const GENDER_VALUES = ['MALE', 'FEMALE', 'UNKNOWN'] as const;
export const REPORT_STATUS_VALUES = ['ACTIVE', 'FOUND', 'EXPIRED', 'SUSPENDED'] as const;
export const MATCH_STATUS_VALUES = ['PENDING', 'CONFIRMED', 'REJECTED', 'NOTIFIED'] as const;
/** 사용자/관리자가 직접 설정 가능한 매칭 상태 (PENDING·NOTIFIED는 시스템 전용) */
export const MATCH_STATUS_SETTABLE_VALUES = ['CONFIRMED', 'REJECTED'] as const;
export const REPORT_PHASE_VALUES = ['searching', 'sighting_received', 'analysis_done', 'found'] as const;
export const ADMIN_ACTION_SOURCE_VALUES = ['DASHBOARD', 'AGENT', 'API'] as const;
export const LOCALE_VALUES = ['ko', 'ja', 'zh-TW', 'en'] as const;
export const INQUIRY_CATEGORY_VALUES = ['PAYMENT', 'REPORT', 'GENERAL', 'PARTNERSHIP'] as const;
export const INQUIRY_STATUS_VALUES = ['OPEN', 'REPLIED', 'CLOSED'] as const;
// 큐레이션 페이지 (union.pryzm.gg /) — 사용 목적 기반 카테고리 (앱스토어 스타일).
// 자사 카드 + 외부 등록 공용 SSOT. 렌더 순서 = 이 배열 순서. 빈 카테고리 섹션은 렌더 생략.
export const CURATED_SITE_CATEGORY_VALUES = [
  'FOOD',        // 음식·음료 (커피 앱, grove, coffeemap, seoul-coffee, subway-coffee)
  'HEALTH',      // 건강·의료 (derma/plastic/dental/eye)
  'NAVIGATION',  // 지도·내비 (seoul-toilet)
  'BUSINESS',    // 비즈니스·금융 (parttime, business-risk)
  'NEWS',        // 뉴스·정치 (lawmaker, local-gov, assembly)
  'LIFESTYLE',   // 라이프스타일
  'WEATHER',     // 날씨 (malgeum)
  'GAMES',       // 게임 (grove, stair)
  'UTILITIES',   // 도구·유틸 (internet)
  'EDUCATION',   // 교육
  'SOCIAL',      // 소셜·커뮤니티 (findthem)
  'SHOPPING',    // 쇼핑·혜택 (benefits)
  'OTHER',       // 기타 (폴백)
] as const;
export const CURATED_SITE_STATUS_VALUES = ['VISIBLE', 'HIDDEN'] as const;
export type CuratedSiteCategory = (typeof CURATED_SITE_CATEGORY_VALUES)[number];
// local-site 상담 리드 (Lead 모델)
export const LEAD_TYPE_VALUES = ['consult', 'diagnosis'] as const;
export const LEAD_STATUS_VALUES = ['NEW', 'CONTACTED', 'DONE', 'SPAM'] as const;

// ── 커뮤니티 카테고리 ──

export const COMMUNITY_CATEGORY_VALUES = [
  'general',
  'suggestion',
  'walk_request',
  'walk_review',
  'my_pet',
  'neighborhood_share', // 🎁 나눔 (용품·사료)
  'neighborhood_care',  // 🐾 돌봄 (잠깐 맡아주세요)
] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORY_VALUES)[number];

// 동네 나눔터 카테고리 (browse 탭 근처 글 조회용)
export const NEIGHBORHOOD_CATEGORIES = ['neighborhood_share', 'neighborhood_care', 'walk_request'] as const;
export type NeighborhoodCategory = (typeof NEIGHBORHOOD_CATEGORIES)[number];

// ── 운영 에이전트 ──

export const ADMIN_AGENT_MAX_TURNS = 10;
export const ADMIN_AGENT_MAX_TOKENS = 4096;
export const ADMIN_STATS_CACHE_TTL = 60;
export const ADMIN_API_KEY_HEADER = 'x-api-key';

/** 커피콩 토스 특가 운영 정책 SSOT. API와 웹 어드민이 직접 소비한다. */
export const COFFEECONG_TOSS_PROMO_POLICY = Object.freeze({
  minAppVersion: '1.9.9',
  maxProducts: 10,
  defaultDurationHours: 24,
  maxDurationHours: 24 * 7,
});
export const AGENT_API_KEY_HEADER = 'x-agent-key';
export const AGENT_ID_HEADER = 'x-agent-id';
export const VALID_AGENT_IDS = ['image-matching', 'promotion', 'chatbot-alert'] as const;

/** 에이전트 메타데이터 SSOT — 프론트/백엔드 공통 참조. skillKeys/mottoKey는 i18n 파일에 반드시 등록 필요 */
export interface AgentMeta {
  folkId: number;
  nameKey: string;
  roleKey: string;
  descKey: string;
  color: string;         // hex (레이더 차트, 테마 색상)
  /** 성격 벡터 (레이더 차트 표시용 5축) */
  personality: { evidenceBias: number; sociability: number; empathy: number; curiosity: number; humor: number };
  skillKeys: string[];
  mottoKey: string;
}

export const AGENT_META: Record<string, AgentMeta> = {
  'image-matching': {
    folkId: 1,
    nameKey: 'team.agentImageMatching.name', roleKey: 'team.agentImageMatching.role', descKey: 'team.agentImageMatching.desc',
    color: '#818cf8',
    personality: { evidenceBias: 0.97, sociability: 0.35, empathy: 0.55, curiosity: 0.95, humor: 0.1 },
    skillKeys: ['agentPanel.skill.imageAnalysis', 'agentPanel.skill.patternRecognition', 'agentPanel.skill.similarityMeasure'],
    mottoKey: 'agentPanel.motto.claude',
  },
  'promotion': {
    folkId: 6,
    nameKey: 'team.agentPromotion.name', roleKey: 'team.agentPromotion.role', descKey: 'team.agentPromotion.desc',
    color: '#f472b6',
    personality: { evidenceBias: 0.45, sociability: 0.95, empathy: 0.82, curiosity: 0.6, humor: 0.72 },
    skillKeys: ['agentPanel.skill.snsPromotion', 'agentPanel.skill.trendDetection', 'agentPanel.skill.communityActivation'],
    mottoKey: 'agentPanel.motto.heimi',
  },
  'chatbot-alert': {
    folkId: 3,
    nameKey: 'team.agentChatbotAlert.name', roleKey: 'team.agentChatbotAlert.role', descKey: 'team.agentChatbotAlert.desc',
    color: '#4ade80',
    personality: { evidenceBias: 0.5, sociability: 0.65, empathy: 0.75, curiosity: 0.4, humor: 0.05 },
    skillKeys: ['agentPanel.skill.reportGuide', 'agentPanel.skill.locationAnalysis', 'agentPanel.skill.alertDispatch'],
    mottoKey: 'agentPanel.motto.ali',
  },
};

/** 관리자 대시보드에서 사용하는 확장 에이전트 ID 목록 (AI 설정, 사용량 등) */
export const ADMIN_AGENT_IDS = [
  'pet-companion-photo', 'pet-companion-audio', 'pet-companion-conversation',
  'image-matching', 'promotion', 'chatbot-alert', 'outreach', 'crawl', 'admin', 'devlog', 'social-parsing',
  'feed-narrative', 'feed-wiki', 'parttime-parsing',
] as const;

/** AiUsageLog에 기록되는 전체 에이전트 ID 목록 (커뮤니티 로그 피드 필터용) */
export const ALL_AGENT_IDS = [
  'image-matching', 'promotion', 'chatbot-alert',
  'outreach', 'crawl', 'admin', 'devlog', 'social-parsing', 'sighting', 'parttime-parsing',
  // Coffee Grove "살아있는 농장" 에이전트 — askClaude(agentId) 자유 문자열, AgentId union 미포함(관측 전용)
  'grove-grandma', 'grove-worker', 'grove-villager',
] as const;

export type AllAgentId = (typeof ALL_AGENT_IDS)[number];

// ── Zod enum 배열 상수 (추가) ──

export const CHAT_PLATFORM_VALUES = ['WEB', 'KAKAO'] as const;
export const SIGHTING_SOURCE_VALUES = ['WEB', 'KAKAO_CHATBOT', 'ADMIN'] as const;
export const SIGHTING_STATUS_VALUES = ['PENDING', 'ANALYZED', 'CONFIRMED', 'REJECTED'] as const;
export const PROMO_PLATFORM_VALUES = ['KAKAO_CHANNEL', 'TWITTER', 'INSTAGRAM'] as const;
/** 재게시/수동 홍보 시 지원하는 플랫폼 (INSTAGRAM은 미지원) */
export const PROMO_PLATFORM_REPOST_VALUES = ['TWITTER', 'KAKAO_CHANNEL'] as const;
export const OUTREACH_REQUEST_STATUS_VALUES = ['PENDING_APPROVAL', 'APPROVED', 'SENDING', 'SENT', 'REJECTED', 'FAILED'] as const;
export const OUTREACH_CONTACT_TYPE_VALUES = ['JOURNALIST', 'YOUTUBER', 'VIDEO'] as const;
export const AI_PROVIDER_VALUES = ['anthropic', 'gemini', 'openai'] as const;
export const CLUSTER_STATUS_VALUES = ['ACTIVE', 'MERGED', 'RESOLVED', 'EXPIRED'] as const;
export const SIGHTING_RELATIONSHIP_VALUES = ['same_subject', 'companion', 'unrelated', 'uncertain'] as const;
export const PAYMENT_TIMING_VALUES = ['SAME_DAY', 'NEXT_DAY', 'WEEKLY', 'MONTHLY', 'UNKNOWN'] as const;
export const PART_TIME_JOB_CATEGORY_VALUES = [
  '행사', '물류', '카페', '서빙', '전단', '주방', '매장', '기타',
] as const;

// ── YouTube ──

export const YT_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;


/** Toss 카드 결제 금액 프리셋 (KRW) */
export const TOSS_PRESET_AMOUNTS = [1000, 3000, 5000, 10000] as const;

// ── coffeemap ──

/**
 * 커피맵 지원 지역 (서울 25개 자치구).
 * URL slug + 화이트리스트 검증 + sitemap 생성에 사용되는 단일 소스.
 * 신규 광역시 자치구 추가 시 이 배열만 확장.
 */
export const COFFEEMAP_SEOUL_GU = [
  '강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구',
  '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구',
  '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구',
  '은평구', '종로구', '중구', '중랑구',
] as const;

export const COFFEE_DECISION_PURPOSE_VALUES = ['work', 'stay', 'budget', 'hotplace'] as const;
export const COFFEE_SEO_PURPOSE_VALUES = ['work', 'stay', 'budget'] as const;
export const COFFEE_SEO_PURPOSE_META = {
  work: {
    label: '작업하기', longLabel: '작업하기 좋은', colLabel: '작업 적합',
    criterion: '집중도·와이파이·콘센트·좌석 근거를 함께 비교합니다.',
  },
  stay: {
    label: '오래 있기', longLabel: '오래 있기 좋은', colLabel: '체류 적합',
    criterion: '예상 체류시간·눈치 부담·좌석 여유 근거를 함께 비교합니다.',
  },
  budget: {
    label: '적게 쓰기', longLabel: '적게 쓰기 좋은', colLabel: '가격',
    criterion: '아메리카노 가격과 시간당 체류 환산 근거를 함께 비교합니다.',
  },
} as const;
export const COFFEE_BRAND_KEYS = [
  'starbucks', 'mega', 'compose', 'ediya', 'twosome', 'coffeebean',
] as const;
export const DISCOUNT_PROVIDER_VALUES = [
  'telecom_skt', 'telecom_kt', 'telecom_lgu',
  'card_samsung', 'card_hyundai', 'card_shinhan', 'card_kb',
  'card_lotte', 'card_bc', 'card_woori', 'card_hana',
] as const;

/** Cafe.brand/name의 운영 표기를 혜택 brand key로 연결하는 SSOT. */
export const COFFEE_BRAND_ALIASES = {
  starbucks: ['스타벅스', 'starbucks'],
  mega: ['메가커피', '메가mgc커피', 'mgc커피', 'megamgccoffee'],
  compose: ['컴포즈커피', '컴포즈', 'composecoffee'],
  ediya: ['이디야커피', '이디야', 'ediyacoffee'],
  twosome: ['투썸플레이스', '투썸', 'atwosomeplace'],
  coffeebean: ['커피빈', 'thecoffeebean'],
} as const;

export const COFFEE_ORGANIC_STORAGE_KEYS = {
  preferences: 'coffee-organic-preferences:v1',
  benefitSnapshot: 'coffee-benefit-snapshot:v1',
  flowId: 'coffee-organic-flow-id:v1',
} as const;

export const COFFEE_ORGANIC_PREFERENCES_TTL_DAYS = 180;

export type CoffeemapRegion = (typeof COFFEEMAP_SEOUL_GU)[number];

/** URL slug(decodeURIComponent 결과)가 지원 지역인지 검증 */
export function isCoffeemapRegion(slug: string): slug is CoffeemapRegion {
  return (COFFEEMAP_SEOUL_GU as readonly string[]).includes(slug);
}

/**
 * 커피맵 목적별 랜딩 키 — 7가지 카테고리.
 * URL slug + 사이트맵 + 점수 정렬 기준의 단일 소스.
 * 신규 카테고리 추가 시 이 배열 + COFFEEMAP_PURPOSE_META 둘 다 확장.
 */
export const COFFEEMAP_PURPOSE_KEYS = [
  'survival',     // 8축 종합 버티기 점수
  'outlet',       // 콘센트
  'wifi',         // 와이파이
  'parking',      // 주차 (workability 등급 필터 + parkingScore)
  'study',        // 카공 적합
  'lowPressure',  // 눈치 없는
  'affordable',   // 저렴
] as const;

export type CoffeemapPurpose = (typeof COFFEEMAP_PURPOSE_KEYS)[number];

export function isCoffeemapPurpose(slug: string): slug is CoffeemapPurpose {
  return (COFFEEMAP_PURPOSE_KEYS as readonly string[]).includes(slug);
}

export interface CoffeemapPurposeMeta {
  /** 제목용 짧은 라벨 — 예: '오래 앉기' */
  label: string;
  /** 본문/타이틀용 긴 라벨 — 예: '오래 앉기 좋은' */
  longLabel: string;
  /** 기준 설명 한 줄 (sub, JSON-LD description) */
  criterion: string;
  /** 카드 영역 컬럼 헤더 — score 없을 때도 안전한 상수 */
  colLabel: string;
}

export const COFFEEMAP_PURPOSE_META: Record<CoffeemapPurpose, CoffeemapPurposeMeta> = {
  survival:    { label: '오래 앉기',     longLabel: '오래 앉기 좋은',     criterion: '가격·눈치·콘센트·와이파이·좌석·소음·리필·화장실을 함께 비교해 오래 머물기 편한 순서입니다.', colLabel: '버티기' },
  outlet:      { label: '콘센트',        longLabel: '콘센트 많은',         criterion: '좌석에서 콘센트를 이용하기 편한 카페를 우선해 정리했습니다.',                                  colLabel: '콘센트' },
  wifi:        { label: '와이파이',      longLabel: '와이파이 좋은',       criterion: '와이파이 속도와 연결 안정성이 좋은 카페를 우선해 정리했습니다.',                                colLabel: '와이파이' },
  parking:     { label: '주차 가능',     longLabel: '주차 가능한',         criterion: '무료 또는 유료 주차 정보를 확인할 수 있는 카페를 우선해 정리했습니다.',                         colLabel: '주차' },
  study:       { label: '공부하기 좋은', longLabel: '공부하기 좋은',       criterion: '책상과 좌석 여유, 집중하기 좋은 환경을 함께 비교한 카공 추천 순위입니다.',                       colLabel: '카공' },
  lowPressure: { label: '눈치 없는',     longLabel: '눈치 없이 오래 앉을', criterion: '혼자 방문해 비교적 오래 머물러도 부담이 적은 카페를 우선해 정리했습니다.',                       colLabel: '눈치없음' },
  affordable:  { label: '저가커피',      longLabel: '저렴한',               criterion: '아메리카노 가격이 저렴한 순서로 가성비 좋은 카페를 비교했습니다.',                              colLabel: '아메리카노' },
};

/** 인접 구 매핑 — cross-link 생성용. 5km 이내 / 같은 권역(강남권, 마포권 등). */
export const COFFEEMAP_ADJACENT_GU: Record<CoffeemapRegion, readonly CoffeemapRegion[]> = {
  '강남구': ['서초구', '송파구', '용산구', '성동구'],
  '강동구': ['송파구', '광진구', '성동구'],
  '강북구': ['도봉구', '성북구', '노원구'],
  '강서구': ['양천구', '구로구', '영등포구'],
  '관악구': ['동작구', '구로구', '서초구', '영등포구'],
  '광진구': ['성동구', '강동구', '중랑구', '동대문구'],
  '구로구': ['영등포구', '관악구', '금천구', '양천구'],
  '금천구': ['관악구', '구로구', '동작구'],
  '노원구': ['도봉구', '강북구', '중랑구'],
  '도봉구': ['강북구', '노원구'],
  '동대문구': ['성북구', '중랑구', '광진구', '종로구'],
  '동작구': ['관악구', '영등포구', '서초구', '용산구'],
  '마포구': ['서대문구', '용산구', '영등포구', '은평구'],
  '서대문구': ['마포구', '은평구', '종로구', '중구'],
  '서초구': ['강남구', '동작구', '관악구', '용산구'],
  '성동구': ['광진구', '강남구', '용산구', '동대문구'],
  '성북구': ['종로구', '동대문구', '강북구', '중랑구'],
  '송파구': ['강남구', '강동구'],
  '양천구': ['강서구', '구로구', '영등포구'],
  '영등포구': ['용산구', '마포구', '동작구', '구로구', '양천구'],
  '용산구': ['중구', '마포구', '서초구', '강남구', '성동구', '동작구'],
  '은평구': ['서대문구', '마포구', '종로구'],
  '종로구': ['중구', '서대문구', '성북구', '동대문구', '은평구'],
  '중구': ['종로구', '용산구', '서대문구'],
  '중랑구': ['동대문구', '광진구', '성북구', '노원구'],
};
