type CaptureDraft = { uri: string; kind: 'PHOTO' | 'AUDIO'; durationMs?: number; question: string; tags: string[]; requestId: string };

/** Never restore a different media type into a specifically selected quick action. */
export function readCaptureDraft(raw: string, kind: CaptureDraft['kind']): CaptureDraft | null {
  try {
    const draft = JSON.parse(raw);
    if (!draft || typeof draft !== 'object' || (draft.kind ?? 'PHOTO') !== kind) return null;
    if (typeof draft.uri !== 'string' || typeof draft.question !== 'string' || typeof draft.requestId !== 'string') return null;
    if (!Array.isArray(draft.tags) || !draft.tags.every((tag: unknown) => typeof tag === 'string')) return null;
    if (kind === 'AUDIO' && (typeof draft.durationMs !== 'number' || !Number.isFinite(draft.durationMs) || draft.durationMs <= 0)) return null;
    return { uri: draft.uri, kind, question: draft.question, requestId: draft.requestId, tags: draft.tags, durationMs: kind === 'AUDIO' ? draft.durationMs : undefined };
  } catch { return null; }
}
