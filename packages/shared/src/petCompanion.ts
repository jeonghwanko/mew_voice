/** Private cat-companion API contract. AI output is always an interpretation, never a diagnosis. */
export const COMPANION_OBSERVATION_STATUS_VALUES = [
  'QUEUED', 'PROCESSING', 'NEEDS_CONTEXT', 'COMPLETED', 'ABSTAINED', 'FAILED', 'CANCELLED',
] as const;
export type CompanionObservationStatus = typeof COMPANION_OBSERVATION_STATUS_VALUES[number];
export const COMPANION_MEDIA_KIND_VALUES = ['PHOTO', 'AUDIO', 'VIDEO'] as const;
export type CompanionMediaKind = typeof COMPANION_MEDIA_KIND_VALUES[number];
export interface CompanionMedia { kind: CompanionMediaKind; mimeType: string; byteSize: number; durationMs: number | null; url: string; }
export interface CompanionPet { id: string; name: string; species: 'CAT'; profilePhotoUrl: string | null; confirmedTraits: Record<string, unknown>; createdAt: string; updatedAt: string; }
export interface CompanionInference { id: string; observationId: string; status: 'COMPLETED' | 'ABSTAINED'; observation: string[]; possibilities: Array<{ label: string; reason: string }>; limitations: string[]; suggestedAction: string | null; utterance: string | null; confidence: 'low' | 'medium' | 'high' | null; reason: string | null; citedObservationIds: string[]; createdAt: string; }
export interface CompanionObservation { id: string; petId: string; kind: CompanionMediaKind; question: string | null; contextTags: string[]; status: CompanionObservationStatus; failureCode: string | null; createdAt: string; completedAt: string | null; media: CompanionMedia[]; inference: CompanionInference | null; feedback: CompanionFeedback[]; }
export interface CompanionFeedbackInput { action: string; reaction: string; happenedAt?: string; note?: string; }
export interface CompanionFeedback { id: string; observationId: string; action: string; reaction: string; note: string | null; happenedAt: string; createdAt: string; }
export interface CompanionConversation { id: string; petId: string; question: string; answer: string | null; status: 'QUEUED' | 'COMPLETED' | 'FAILED'; citedObservationIds: string[]; citedCheckinIds?: string[]; createdAt: string; completedAt: string | null; }
export interface CompanionConsent { serviceStorage: boolean; researchTraining: boolean; updatedAt: string; }
export interface CreateCompanionPetInput { name: string; confirmedTraits?: Record<string, unknown>; }
export interface CreateCompanionObservationInput { petId: string; kind: CompanionMediaKind; question?: string; contextTags?: string[]; durationMs?: number; idempotencyKey: string; }
export interface CompanionListResponse<T> { items: T[]; nextCursor: string | null; }
export interface CompanionDeletion { petId: string; name: string; status: 'PENDING' | 'FAILED'; }
export const COMPANION_CHECKIN_KIND_VALUES = ['PLAY', 'MEAL', 'NOTE', 'CHECKED'] as const;
export type CompanionCheckinKind = typeof COMPANION_CHECKIN_KIND_VALUES[number];
export interface CompanionCheckin { id: string; petId: string; kind: CompanionCheckinKind; note: string | null; occurredAt: string; version: number; createdAt: string; updatedAt: string; }
export interface CreateCompanionCheckinInput { petId: string; kind: CompanionCheckinKind; note?: string; occurredAt: string; idempotencyKey: string; }
export interface UpdateCompanionCheckinInput { version: number; kind?: CompanionCheckinKind; note?: string | null; occurredAt?: string; }
