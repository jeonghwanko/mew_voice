// ── 다국어 (i18n) ──

export type Locale = 'ko' | 'ja' | 'zh-TW' | 'en';
export const SUPPORTED_LOCALES: Locale[] = ['ko', 'ja', 'zh-TW', 'en'];
export const DEFAULT_LOCALE: Locale = 'ko';

// ── 엔티티 공통 타입 (Prisma enum과 1:1 매핑) ──

export type SubjectType = 'PERSON' | 'DOG' | 'CAT';
export type ReportStatus = 'ACTIVE' | 'FOUND' | 'EXPIRED' | 'SUSPENDED';
export type Gender = 'MALE' | 'FEMALE' | 'UNKNOWN';
export type SightingSource = 'WEB' | 'KAKAO_CHATBOT' | 'ADMIN';
export type SightingStatus = 'PENDING' | 'ANALYZED' | 'CONFIRMED' | 'REJECTED';
export type MatchStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'NOTIFIED';
export type PromoPlatform = 'KAKAO_CHANNEL' | 'TWITTER' | 'INSTAGRAM';
export type PromoStatus = 'PENDING' | 'POSTED' | 'FAILED' | 'DELETED';
export type ChatPlatform = 'WEB' | 'KAKAO';
export type ChatStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
export type AuthProvider = 'LOCAL' | 'KAKAO' | 'NAVER' | 'APPLE';
export type InquiryCategory = 'PAYMENT' | 'REPORT' | 'GENERAL' | 'PARTNERSHIP';
export type InquiryStatus = 'OPEN' | 'REPLIED' | 'CLOSED';
export type CuratedSiteStatus = 'VISIBLE' | 'HIDDEN';

// ── API 응답 타입 ──

export interface UserPublic {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  profileImage?: string | null;
  provider?: AuthProvider;
  createdAt?: string;
  referralCode?: string | null;
  hasReferrer?: boolean;
}

export interface SightingPhotoAnalysis {
  species?: string;
  color?: string;
  size?: string;
  distinctiveFeatures?: string[];
  collarDetected?: boolean;
  collarDescription?: string;
  healthCondition?: string;
  furCondition?: string;
  estimatedAge?: string;
  accessories?: string;
  description?: string;
  /** AI 프로바이더 (예: 'gemini', 'anthropic', 'openai') */
  _provider?: string;
  /** AI 모델명 (예: 'gemini-2.5-flash', 'claude-sonnet-4-5-20250514') */
  _model?: string;
}

/** Unified photo record — reportId or sightingId is set (app-level constraint) */
export interface Photo {
  id: string;
  reportId?: string | null;
  sightingId?: string | null;
  photoUrl: string;
  thumbnailUrl?: string | null;
  isPrimary: boolean;
  isBeauty?: boolean;
  beautyOrder?: number | null;
  aiAnalysis?: SightingPhotoAnalysis | null;
}

/** 미화 이미지 (피드 beautyPhotos 배열 아이템) */
export interface BeautyPhoto {
  id: string;
  photoUrl: string;
  thumbnailUrl: string | null;
  beautyOrder: number;
  isRevealed: boolean;
  /** beautyOrder=1 전용: 첫 변환자 이름 (글로벌 오픈) */
  firstRevealerName?: string | null;
}

export interface ReportSummary {
  id: string;
  subjectType: SubjectType;
  status: ReportStatus;
  name: string;
  species?: string | null;
  features: string;
  lastSeenAt: string;
  lastSeenAddress: string;
  lastSeenLat?: number | null;
  lastSeenLng?: number | null;
  /** 공개 지도용 결정적 익명 좌표. 원본 좌표는 본인 전용 응답에서만 사용한다. */
  mapLat?: number | null;
  mapLng?: number | null;
  coordinatesApproximate?: boolean;
  contactPhone?: string;
  contactName?: string;
  reward?: string | null;
  photos: Photo[];
  createdAt: string;
  _count?: { sightings: number; matches: number; likes: number; comments: number };
}

export interface ReportDetail extends ReportSummary {
  gender?: Gender | null;
  age?: string | null;
  weight?: string | null;
  height?: string | null;
  color?: string | null;
  clothingDesc?: string | null;
  aiDescription?: string | null;
  user?: { id: string; name: string };
  likeCount?: number;
  isLikedByUser?: boolean;
}

export interface Sighting {
  id: string;
  reportId?: string | null;
  description: string;
  sightedAt: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
  status?: SightingStatus;
  photos: Photo[];
  createdAt: string;
  _count?: { likes: number; comments: number };
}

export interface SightingDetail extends Sighting {
  userId?: string | null;
  source?: SightingSource;
  subjectType?: SubjectType | null;
  status?: SightingStatus;
  tipsterName?: string | null;
  tipsterPhone?: string | null;
  aiAnalysis?: unknown;
  user?: { id: string; name: string } | null;
  likeCount?: number;
  isLikedByUser?: boolean;
  /** 비회원 제보가 수정/삭제 비밀번호를 가졌는지 (비번 없으면 수정/삭제 불가) */
  hasEditPassword?: boolean;
  report?: {
    id: string;
    name: string;
    subjectType: SubjectType;
    status: ReportStatus;
    lastSeenAddress: string;
    lastSeenLat?: number | null;
    lastSeenLng?: number | null;
    photos?: { thumbnailUrl?: string | null }[];
  } | null;
  matches?: {
    id: string;
    confidence: number;
    aiReasoning: string;
    status: MatchStatus;
    reportId: string;
  }[];
}

export interface Match {
  id: string;
  reportId: string;
  sightingId: string;
  confidence: number;
  aiReasoning: string;
  status: MatchStatus;
  sighting: Sighting;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export type ReportListResponse = PaginatedResponse<ReportSummary>;

export type SightingListResponse = PaginatedResponse<Sighting>;

export interface AuthResponse {
  user: UserPublic;
  token: string;
}

// ── 챗봇 타입 ──

export type ConversationStep =
  | 'GREETING'
  | 'SUBJECT_TYPE'
  | 'PHOTO'
  | 'DESCRIPTION'
  | 'LOCATION'
  | 'TIME'
  | 'CONTACT'
  | 'CONFIRM'
  | 'SUBMITTED';

export interface ConversationState {
  currentStep: ConversationStep;
}

export interface CollectedInfo {
  subjectType?: SubjectType;
  photoUrls?: string[];
  description?: string;
  address?: string;
  sightedAt?: string;
  tipsterName?: string;
  tipsterPhone?: string;
  reportId?: string;
}

export interface BotResponse {
  text: string;
  quickReplies?: string[];
  completed?: boolean;
}

// ── Job 타입 ──

/** 클라이언트에서 Canvas API로 추출한 이미지 메타데이터 */
export interface ClientImageMeta {
  width: number;
  height: number;
  dominantColors: string[];
  blurScore: number;
  hash: string;
}

export interface ImageJobData {
  type: 'report' | 'sighting';
  reportId?: string;
  sightingId?: string;
  /** 클라이언트 전처리 메타데이터 (사진 순서대로, 있으면 서버 Sharp 스킵) */
  clientImageMeta?: ClientImageMeta[];
}

export interface PromotionJobData {
  reportId: string;
  isRepost?: boolean;
  version?: number;
  platforms?: PromoPlatform[];
  regenerateContent?: boolean;
  reason?: 'scheduled' | 'low_performance' | 'manual';
}

export interface MatchingJobData {
  type: 'sighting' | 'report';
  sightingId?: string;
  reportId?: string;
}

export interface CleanupJobData {
  reportId: string;
}

export interface NotificationJobData {
  matchId: string;
  reportId: string;
}

// ── AI 에이전트 타입 ──

export interface PlatformPromoTexts {
  kakao: string;
  twitter: string;
  instagram: string;
  general: string;
}

export interface MatchResult {
  confidence: number;
  reasoning: string;
  matchingFeatures: string[];
  differingFeatures: string[];
}

export interface PlatformPostResult {
  postId: string | null;
  postUrl: string | null;
}

export interface PlatformAdapter {
  readonly name: string;
  post(text: string, imagePaths: string[]): Promise<PlatformPostResult>;
  deletePost(postId: string): Promise<void>;
  getMetrics?(postId: string): Promise<PromotionMetrics | null>;
}

// ── 홍보 에이전트 타입 ──

export type PromoUrgency = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PromotionMetrics {
  views: number;
  likes: number;
  retweets: number;
  shares: number;
  replies: number;
}

export interface PromotionMonitorJobData {
  reportId: string;
  promotionId: string;
  platform: PromoPlatform;
  postId: string;
  /** Collection round: 0=1h, 1=24h, 2=72h */
  round?: number;
}

export interface PromotionRepostJobData {
  reportId?: string;
  reason: 'scheduled' | 'low_performance' | 'manual';
  platforms?: PromoPlatform[];
  regenerateContent?: boolean;
}

export interface CrawlDispatchJobData {
  // 특정 소스만 실행 (없으면 전체)
  sources?: string[];
}

export interface CrawlSourceJobData {
  source: string;
}

export interface CrawlAgentJobData {
  triggeredBy?: 'scheduler' | 'manual';
  sources?: string[];
}

export interface OutreachJobData {
  type: 'discover-contacts' | 'send-outreach' | 'marketing-discover';
  reportId?: string;
  outreachRequestId?: string;
  /** marketing-discover: 검색 키워드 목록 */
  marketingKeywords?: string[];
}

export interface QaCrawlJobData {
  /** 특정 소스만 크롤 (없으면 전체) */
  sources?: string[];
  triggeredBy?: 'scheduler' | 'manual';
}

export interface ClinicEventJobData {
  triggeredBy?: 'manual' | 'cron';
}

/** 커피 브랜드 혜택 enrichment 1-row-1-job 페이로드.
 *  cron dispatcher 가 row 1개씩 enqueue → row worker 가 fetch + AI + DB 트랜잭션 처리.
 *  jobId = `enrich-${benefitId}` 로 BullMQ가 dedup. */
export interface BenefitEnrichmentRowJobData {
  benefitId: string;
  /** true 시 enrichmentStatus 가드 우회(admin manual 재처리 등). 기본 false. */
  force?: boolean;
}

/** 크롤된 피부과 이벤트 가격 항목 */
export interface ClinicEventPublic {
  id: string;
  clinicName: string;
  procedure: string;
  priceFrom: number | null;
  priceTo: number | null;
  priceNote: string | null;
  priceText: string | null;
  region: string;
  sourceUrl: string;
  sourceTitle: string | null;
  crawledAt: string;
  validUntil: string | null;
}

/** Q&A 크롤러가 반환하는 외부 질문 데이터 */
export interface ExternalQuestion {
  externalId: string;
  title: string;
  content: string;
  sourceUrl: string;
  sourceName: string;
  authorName?: string;
  tags?: string[];
  postedAt: Date;
}

// ── 정보 수집 에이전트 타입 ──

export type EngineVersion = 'v1' | 'v2';

export interface AgentToolCall {
  name: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface AgentResponse {
  text: string;
  completed: boolean;
  toolsUsed: string[];
  photoAnalysis?: {
    description: string;
    features: string[];
    subjectType?: SubjectType;
  };
  similarReports?: {
    id: string;
    name: string;
    features: string;
    photoUrl?: string;
    similarity: string;
  }[];
  sightingId?: string;
}

// ── 운영 에이전트 타입 ──

export type AdminActionSource = 'DASHBOARD' | 'AGENT' | 'API';

export interface QueueStatusSummary {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface AdminOverviewStats {
  reports: {
    total: number;
    active: number;
    found: number;
    suspended: number;
    todayNew: number;
    weekNew: number;
  };
  sightings: {
    total: number;
    todayNew: number;
    weekNew: number;
    bySource: Record<SightingSource, number>;
  };
  matches: {
    total: number;
    confirmed: number;
    pending: number;
    avgConfidence: number;
    highConfidenceCount: number;
  };
  users: {
    total: number;
    todayNew: number;
    blocked: number;
  };
  queues: QueueStatusSummary[];
}

export interface TimelineDataPoint {
  date: string;
  count: number;
}

export interface AdminAgentChatRequest {
  sessionId?: string;
  message: string;
}

export interface AdminAgentToolResult {
  tool: string;
  input: unknown;
  output: unknown;
}

export interface AdminAgentChatResponse {
  sessionId: string;
  reply: string;
  toolResults?: AdminAgentToolResult[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: unknown;
  source: AdminActionSource;
  agentSessionId?: string | null;
  createdAt: string;
}

// ── Community ──

export interface CommunityPostSummary {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'suggestion' | 'walk_request' | 'walk_review' | 'my_pet' | 'neighborhood_share' | 'neighborhood_care';
  isPinned: boolean;
  viewCount: number;
  userId: string | null;
  agentId: string | null;
  user: { id: string; name: string; profileImage?: string | null } | null;
  _count: { comments: number };
  createdAt: string;
  externalAgent?: ExternalAgentPublic | null;
  sourceUrl?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  isAnonymous?: boolean;
  anonymousArea?: string | null;
}

export interface CommunityPostDetail extends CommunityPostSummary {
  comments: CommunityCommentPublic[];
}

export interface CommunityCommentPublic {
  id: string;
  postId: string;
  userId: string | null;
  agentId: string | null;
  content: string;
  user: { id: string; name: string; profileImage?: string | null } | null;
  externalAgent?: ExternalAgentPublic | null;
  createdAt: string;
}

// ── External Agent ──

export interface ExternalAgentPublic {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
}

export interface ExternalAgentAdmin extends ExternalAgentPublic {
  isActive: boolean;
  webhookUrl: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

// ── XP & 레벨 ──

export interface XpStats {
  xp: number;                 // 누적 XP (User.xp)
  level: number;              // 현재 레벨 (User.level)
  currentXP: number;          // 현재 레벨 내 XP
  xpToNextLevel: number;      // 다음 레벨까지 필요 XP (0 = 최고 레벨)
  xpRequiredForLevel: number; // 현재 레벨 총 XP 요구량
  xpBoosterPct: number;       // XP 부스터 % (레퍼럴 1인당 1% 증가, 최대 100%)
}

export interface XpGrantResult {
  xpGained: number;
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
  reward?: { type: string; value: string; label: string };
}

/** XP 획득 액션 (Prisma XpAction enum과 1:1 매핑) */
export type XpAction =
  | 'AD_WATCH'
  | 'SIGHTING'
  | 'COMMUNITY_POST'
  | 'COMMUNITY_COMMENT'
  | 'SHARE'
  | 'REFERRAL'
  | 'SPONSOR'
  | 'GAME'
  | 'LIKE'
  | 'COMMENT'
  | 'PET_REGISTER';

export interface XpLogEntry {
  id: string;
  action: XpAction;
  xpAmount: number;
  sourceId?: string | null;
  createdAt: string;
}

// ── Entity Like & Comment ──

export interface EntityCommentPublic {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; profileImage?: string | null };
}

export interface LikeStatus {
  likeCount: number;
  isLikedByUser: boolean;
}

// ── Pet Profile ──

export interface PetPublic {
  id: string;
  subjectType: 'DOG' | 'CAT';
  name: string;
  species?: string | null;
  gender: Gender;
  age?: string | null;
  weight?: string | null;
  color?: string | null;
  features?: string | null;
  microchipId?: string | null;
  isNeutered?: boolean | null;
  photoUrl?: string | null;
  thumbnailUrl?: string | null;
  registrationNumber?: string | null;
  region?: string | null;
  createdAt: string;
}

// ── Ad Boost ──

export interface BoostStatus {
  boostsUsedToday: number;
  maxBoosts: number;
}

// Legacy internal AI records still use these stable identifiers in audit and policy code.
export type AgentId = 'image-matching' | 'promotion' | 'chatbot-alert';

import type { CuratedSiteCategory } from './constants.js';
export type { CuratedSiteCategory };

// ── Agent Character System ────────────────────────────────────────────────────

/** 성격을 의사결정 벡터로 정의 (0~1 범위) */
export interface AgentPersonality {
  sociability: number;    // 먼저 말 걸 확률
  caution: number;        // 확정 전 신중함
  optimism: number;       // 희망적 해석 성향
  urgency: number;        // 빠른 반응 성향
  empathy: number;        // 감정 공감 강도
  curiosity: number;      // 추가 탐색 성향
  assertiveness: number;  // 단정적 표현 정도
  humor: number;          // 유머/가벼움
  selfReference: number;  // 자기 캐릭터 드러내기
  evidenceBias: number;   // 근거 기반 선호도
}

/** 행동 정책 규칙 */
export interface AgentPolicy {
  mustDo: string[];
  neverDo: string[];
  forbiddenPhrases: string[];
  requiredElements: string[];
}

/** 출력 말투 스타일 */
export interface SpeechStyle {
  avgSentenceLength: 'short' | 'medium' | 'long';
  questionRate: number;
  exclamationRate: number;
  emojiRate: number;
  preferredOpenings: string[];
  preferredClosings: string[];
  tabooExpressions: string[];
}

export type AgentActionType =
  | 'write_post_analytical'   // 분석 보고 글 (클로드 특화)
  | 'write_post_celebratory'  // 축하/확산 글 (헤르미 특화)
  | 'write_post_guide'        // 안내 글 (알리 특화)
  | 'stay_silent';            // 이번엔 행동 안 함

export interface CandidateAction {
  type: AgentActionType;
  score: number;
  reason: string;
}

export type AgentDomainEventType =
  | 'match_detected'
  | 'cluster_match_detected'
  | 'outreach_sent'
  | 'report_created'
  | 'case_resolved'
  | 'sighting_analyzed';

export interface AgentDomainEvent {
  type: AgentDomainEventType;
  reportName: string;
  subjectType: SubjectType;
  lastSeenAddress?: string;
  confidence?: number;      // match_detected 전용
  contactName?: string;     // outreach_sent 전용
  channel?: string;         // outreach_sent 전용
  reportId?: string;
  aiAnalysis?: string;      // sighting_analyzed 전용 — 품종/색상/특징 요약
  clusterInsights?: ClusterInsights;  // cluster_match_detected 전용
  sightingCount?: number;   // cluster_match_detected 전용 — 클러스터 내 제보 수
}

// ── Inquiry ──

export interface InquiryPublic {
  id: string;
  category: InquiryCategory;
  title: string;
  content: string;
  status: InquiryStatus;
  replyContent: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export interface InquiryAdmin extends InquiryPublic {
  userId: string | null;
  user: { id: string; name: string; phone: string } | null;
  updatedAt: string;
}

// ── CuratedSite (큐레이션 페이지) ──

export interface CuratedSitePublic {
  id: string;
  name: string;
  url: string;
  repoUrl: string | null; // GitHub 공개 저장소 — 있으면 상단 오픈소스 섹션 featured
  description: string;
  category: CuratedSiteCategory;
  createdAt: string;
}

export interface CuratedSiteAdmin extends CuratedSitePublic {
  status: CuratedSiteStatus;
  submitterContact: string | null;
  submitterIp: string | null;
  userId: string | null;
  updatedAt: string;
}

// ── Admin list response types ──

export interface AdminMatchItem {
  id: string;
  confidence: number;
  status: MatchStatus;
  aiReasoning: string;
  createdAt: string;
  report: { id: string; name: string };
  sighting: { id: string; description: string };
}

export interface AdminMatchListResponse {
  matches: AdminMatchItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface AdminUserItem extends UserPublic {
  createdAt: string;
  blockedAt?: string | null;
  blockReason?: string | null;
  _count?: { reports: number };
}

export interface AdminUserListResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface InquiryListResponse {
  items: InquiryAdmin[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Lead (local-site 멀티테넌트 상담 리드) ──

export type LeadType = 'consult' | 'diagnosis';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'DONE' | 'SPAM';

export interface LeadAdmin {
  id: string;
  tenant: string;
  type: LeadType;
  name: string;
  phone: string;
  message: string | null;
  /** 체크리스트 응답 등 추가 입력값 (key → value) */
  payload: Record<string, string> | null;
  status: LeadStatus;
  createdAt: string;
}

export interface LeadListResponse {
  items: LeadAdmin[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Agent Activity (Community Scene) ──

export interface AiUsageSummary {
  todayCalls: number;
  todayTokens: number;
  avgLatencyMs: number;
  successRate: number;  // 0~1
  primaryModel?: string;  // 가장 많이 사용된 모델명
}

export interface AgentActivityEvent {
  id: string;
  eventType: AgentDomainEventType;
  selectedAction: string;
  stayedSilent: boolean;
  createdAt: string;
  reportId: string | null;
}

/** 에이전트 세부 활동 (Pixi 씬 말풍선 피드용) */
export interface AgentActivity {
  type: 'outreach_discover' | 'outreach_pending' | 'outreach_sent'
      | 'promotion_posted' | 'match_found' | 'report_received' | 'sighting_analyzed';
  description: string;
  createdAt: string;
  /** 외부 링크 (유튜브/트위터 등, 클릭 시 새 창) */
  url?: string;
  /** 썸네일 이미지 URL */
  thumbnailUrl?: string;
  /** 활동 관련 위도 (지도 마커용, jitter 적용됨) */
  lat?: number;
  /** 활동 관련 경도 (지도 마커용, jitter 적용됨) */
  lng?: number;
  /** match_found 전용 — 매칭 신뢰도 (0~1) */
  confidence?: number;
  /** match_found 전용 — AI 판단 근거 (200자 truncate) */
  aiReasoning?: string;
  /** match_found 전용 — 신고 대상 이름 */
  reportName?: string;
  /** match_found 전용 — 매칭 상태 */
  matchStatus?: string;
}

export interface AgentActivityAgent {
  agentId: string;
  todayPosts: number;
  todayDecisions: number;
  latestPost: { id: string; title: string; createdAt: string } | null;
  recentEvents: AgentActivityEvent[];
  /** BullMQ 큐 대기+처리중 작업 수 (waiting + active) */
  queuePending: number;
  /** 세부 활동 스트림 (최근 10개, 말풍선 피드용) */
  recentActivities: AgentActivity[];
  /** image-matching 전용 — 오늘 AI 사용량 집계 (count가 0이면 undefined) */
  aiUsageSummary?: AiUsageSummary;
}

export interface AgentActivityResponse {
  agents: AgentActivityAgent[];
  serverTime: string;
}

// ── Agent Logs (AiUsageLog 공개 피드) ──

export interface AgentLogEntry {
  id: string;
  agentId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  createdAt: string;
}

export interface AgentLogsResponse {
  items: AgentLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

// ── Ghost CMS ──

export interface GhostPostListItem {
  id: string;
  title: string;
  url: string;
  status: string;
  published_at: string | null;
  updated_at: string;
  excerpt: string | null;
}

export interface GhostPostListResult {
  posts: GhostPostListItem[];
  meta: {
    pagination: {
      page: number;
      limit: number;
      pages: number;
      total: number;
    };
  };
}

// ── 실종 체크 ──

export interface MissingCheckResult {
  analysis: SightingPhotoAnalysis;
  subjectType: 'DOG' | 'CAT';
}

export interface YouTuberHelpResult {
  videos: Array<{ videoId: string; title: string }>;
  commentCount: number;
}

// ── 제보 클러스터링 (AI 탐정 추리) ──

export type ClusterStatus = 'ACTIVE' | 'MERGED' | 'RESOLVED' | 'EXPIRED';
export type SightingRelationship = 'same_subject' | 'companion' | 'unrelated' | 'uncertain';

/** 운영자용 구조화 분석 (SightingLink.analysis JSON) */
export interface SightingLinkAnalysis {
  /** 동일 개체 확률: low / medium / high */
  sameSubject: 'low' | 'medium' | 'high';
  /** 동행 개체 가능성: low / medium / medium-high / high */
  companionPossibility: 'low' | 'medium' | 'medium-high' | 'high';
  /** 위치 연관성: low / medium / high */
  locationRelevance: 'low' | 'medium' | 'high';
  /** 시간 신뢰성 검토 필요 정도: low / medium / high */
  timeReliabilityFlag: 'low' | 'medium' | 'high';
  /** 판단 근거 목록 */
  reasoning: string[];
}

/** 제보 간 관계 (SightingLink) 공개용 */
export interface SightingLinkPublic {
  id: string;
  sightingAId: string;
  sightingBId: string;
  relationship: SightingRelationship;
  confidence: number;
  /** 4줄 추리문 */
  facts: string;
  estimation: string;
  trustIssues: string;
  recommendation: string;
  /** 운영자용 구조화 분석 */
  analysis: SightingLinkAnalysis;
  distanceKm: number | null;
  timeDiffMin: number | null;
  createdAt: string;
  /** 상대방 제보 요약 (조회 방향에 따라 A 또는 B) */
  linkedSighting?: Sighting;
}

/** 클러스터 전체 AI 분석 결과 (SightingCluster.aiSummary JSON) */
export interface ClusterInsights {
  /** 지역 분석: "서울 중구 일대에서 3월 19~22일 5건 목격" */
  areaReport: string;
  /** 이동 패턴 */
  movementPattern?: {
    direction: string;
    estimatedSpeedKmDay?: number;
    description: string;
  };
  /** 시간 패턴 */
  timePattern?: {
    peakHours: number[];
    description: string;
  };
  /** 건강/상태 변화 추이 */
  healthTrend?: {
    trend: 'stable' | 'improving' | 'declining';
    description: string;
  };
  /** 다음 목격 예상 지역 */
  predictedNextArea?: {
    description: string;
    lat?: number;
    lng?: number;
  };
  /** 수색 권장 사항 */
  searchRecommendation?: string;
  /** 동행 개체 그룹 */
  companionGroups?: Array<{
    description: string;
    sightingIds: string[];
  }>;
}

/** 클러스터 요약 (목록용) */
export interface SightingClusterSummary {
  id: string;
  subjectType: SubjectType;
  status: ClusterStatus;
  label: string | null;
  centroidLat: number | null;
  centroidLng: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
  sightingCount: number;
  cohesion: number;
  createdAt: string;
}

/** 클러스터 상세 (제보 목록 + AI 분석 포함) */
export interface SightingClusterDetail extends SightingClusterSummary {
  aiSummary: ClusterInsights | null;
  sightings: Sighting[];
  links: SightingLinkPublic[];
}

/** 클러스터↔신고 매칭 결과 공개용 */
export interface ClusterReportMatchPublic {
  id: string;
  clusterId: string;
  reportId: string;
  confidence: number;
  aiReasoning: string;
  aiInsights: ClusterInsights | null;
  cluster: SightingClusterSummary;
  createdAt: string;
}

/** 클러스터링 BullMQ job 데이터 */
export interface ClusterJobData {
  type: 'cluster-sighting' | 'match-report-clusters' | 'analyze-cluster';
  sightingId?: string;
  reportId?: string;
  clusterId?: string;
}

/** AgentDomainEventType 확장 — 클러스터 매칭 이벤트 */
export type ClusterAgentEventType = 'cluster_match_detected';

// ── DM (1:1 쪽지) ──

export interface MiniProfilePublic {
  id: string;
  name: string;
  profileImage: string | null;
  level: number;
  achievements: string[];
}

export interface DMMessage {
  id: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface DMConversation {
  roomId: string;
  userId: string;
  name: string;
  profileImage: string | null;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
}

// ── 단기 알바 (parttime) ──

/** 알바 정산 타이밍 — Prisma enum PaymentTiming 과 1:1 */
export type PaymentTiming = 'SAME_DAY' | 'NEXT_DAY' | 'WEEKLY' | 'MONTHLY' | 'UNKNOWN';

/** 알바 업종 카테고리 — 워크넷 직종 코드 매핑 결과 */
export type PartTimeJobCategory =
  | '행사'
  | '물류'
  | '카페'
  | '서빙'
  | '전단'
  | '주방'
  | '매장'
  | '기타';

/** GET /parttime/api/jobs 응답 아이템 (공개) */
export interface PartTimeJobPublic {
  id: string;
  title: string;
  category: PartTimeJobCategory;
  address: string;
  region: string;            // 시·도 + 시·군·구 (예: "서울 강남구")
  lat: number;
  lng: number;
  hourlyWage: number | null;
  wageText: string | null;   // 원문 임금 표현 — hourlyWage 가 null 일 때 카드/상세 표시용
  startsAt: string | null;   // ISO
  endsAt: string | null;     // ISO
  durationHours: number | null;
  paymentTiming: PaymentTiming;
  sourceUrl: string;
  source: string;            // 'worknet' | 'seed'
  distance?: number;         // m (검색 시에만)
}

// ── 커피 오가닉 성장 루프 ──

export type CoffeeDecisionPurpose = 'work' | 'stay' | 'budget' | 'hotplace';
export type CoffeeSeoPurpose = Exclude<CoffeeDecisionPurpose, 'hotplace'>;
export type CoffeeBrandKey =
  | 'starbucks'
  | 'mega'
  | 'compose'
  | 'ediya'
  | 'twosome'
  | 'coffeebean';

export type DiscountProvider =
  | 'telecom_skt'
  | 'telecom_kt'
  | 'telecom_lgu'
  | 'card_samsung'
  | 'card_hyundai'
  | 'card_shinhan'
  | 'card_kb'
  | 'card_lotte'
  | 'card_bc'
  | 'card_woori'
  | 'card_hana';

export type CoffeeLandingType =
  | 'coffeemap_home'
  | 'coffeemap_area_purpose'
  | 'coffeemap_station_purpose'
  | 'coffeemap_cafe'
  | 'benefits_home'
  | 'benefits_brand_provider'
  | 'benefits_detail';

export type CoffeeCrossDirection = 'coffeemap_to_benefits' | 'benefits_to_coffeemap';

export interface CoffeeOrganicPreferencesV1 {
  version: 1;
  purpose?: CoffeeDecisionPurpose;
  region?: string;
  station?: string;
  telecoms: DiscountProvider[];
  cards: DiscountProvider[];
  preferredBrands: CoffeeBrandKey[];
  savedAt: string;
  lastUsedAt: string;
}

export interface CoffeeBenefitSnapshotItemV1 {
  id: string;
  updatedAt: string;
  status: string;
  endDate: string | null;
}

export interface CoffeeBenefitSnapshotV1 {
  version: 1;
  capturedAt: string;
  items: CoffeeBenefitSnapshotItemV1[];
}

export interface CoffeeBenefitSummary extends CoffeeBenefitSnapshotItemV1 {
  brand: CoffeeBrandKey;
  discountProvider: DiscountProvider | null;
  slug: string | null;
  startDate: string | null;
  checkedAt: string | null;
}

export type CoffeeBenefitChangeType = 'new' | 'updated' | 'expired';

export interface CoffeeBenefitChange {
  type: CoffeeBenefitChangeType;
  item: CoffeeBenefitSnapshotItemV1;
}

// ── 커피콩 프로모 / 토스 오늘의 특가 어드민 ──

export type CoffeecongPromoContentType = 'generic' | 'toss_product';
export type CoffeecongTossShoppingFeed = 'todayDeal' | 'bestSelling';
export type CoffeecongPromoTargetPlatform = 'android' | 'ios' | null;
export type CoffeecongPromoLifecycle = 'draft' | 'scheduled' | 'live' | 'superseded' | 'ended';

/** 서버의 공유 토스 카탈로그에서 어드민이 선택할 수 있는 상품. */
export interface CoffeecongTossProductAdmin {
  tacaItemId: number;
  displayName: string;
  thumbnailUrl: string;
  shortUrl: string;
  displayPrice: number;
  originalPrice: number | null;
  discountRate: number | null;
  rank: number;
  feed: CoffeecongTossShoppingFeed;
  endAt: string | null;
}

/** 프로모 생성 시 저장되는 상품별 스냅샷. 배열 순서가 앱 스와이프 순서다. */
export interface CoffeecongTossPromoProductSnapshot {
  tacaItemId: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  displayPrice: number;
  originalPrice: number | null;
  discountRate: number | null;
  feed: CoffeecongTossShoppingFeed;
  rank: number;
  endAt: string | null;
}

/** CoffeecongPromo 관리자 목록 응답. 날짜는 JSON 직렬화된 ISO 문자열이다. */
export interface CoffeecongPromoAdmin {
  promoKey: string;
  contentType: CoffeecongPromoContentType;
  displayName: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  dailyDismissible: boolean;
  active: boolean;
  /** active/기간으로 서버가 계산한 운영 상태. UI는 raw active 대신 이 값을 표시한다. */
  lifecycle: CoffeecongPromoLifecycle;
  /** 최신 계약 지원 앱에서 지금 실제 선택되는 플랫폼. 빈 배열이면 예약/초안/종료/다른 프로모에 대체된 상태다. */
  effectivePlatforms: Array<'android' | 'ios'>;
  startsAt: string | null;
  endsAt: string | null;
  targetPlatform: CoffeecongPromoTargetPlatform;
  minAppVersion: string | null;
  sortOrder: number;
  tacaItemId: number | null;
  displayPrice: number | null;
  originalPrice: number | null;
  discountRate: number | null;
  productFeed: CoffeecongTossShoppingFeed | null;
  productRank: number | null;
  productEndsAt: string | null;
  tossProducts: CoffeecongTossPromoProductSnapshot[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoffeecongPromoListResponse {
  promos: CoffeecongPromoAdmin[];
}

export interface CoffeecongTossProductCatalogResponse {
  items: CoffeecongTossProductAdmin[];
  fetchedAt: string;
}

export interface CoffeecongTossPromoCreateRequest {
  /** 배열 순서가 앱 스와이프 순서다. */
  tacaItemIds: number[];
  active: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  targetPlatform?: CoffeecongPromoTargetPlatform;
  minAppVersion: string;
  dailyDismissible?: boolean;
}

