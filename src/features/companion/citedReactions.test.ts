import { citedReactionFromFeedback, citedReactionGoneText, citedReactionsForAnswer, observationCitedReactions, presentCitedReactionAnswer, presentConversationAnswer, resolveCitedReactionMap } from './daily';

const saved = '질문과 같은 문구의 이전 기록은 찾지 못해서, 가장 최근에 저장한 반응만 보여 드려요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.\n\n이 답은 저장된 보호자 기록을 보여 주는 것이며, 실제 AI 분석이 아니에요. 고양이의 말을 번역한 것도 아니에요.';

it('shows the observation’s current reaction and drops a deleted quote', () => {
  const edited = presentCitedReactionAnswer(saved, { status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' });
  expect(edited).toBe('질문과 같은 문구의 이전 기록은 찾지 못해서, 가장 최근에 저장한 반응만 보여 드려요. “창문을 열었어요” 이후 “다가왔어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.\n\n이 답은 저장된 보호자 기록을 보여 주는 것이며, 실제 AI 분석이 아니에요. 고양이의 말을 번역한 것도 아니에요.');
  const gone = presentCitedReactionAnswer(saved, { status: 'gone' });
  expect(gone).toBe(`질문과 같은 문구의 이전 기록은 찾지 못해서, 가장 최근에 저장한 반응만 보여 드려요. ${citedReactionGoneText}. 한 번의 반응으로 이유를 확정할 수는 없어요.\n\n이 답은 저장된 보호자 기록을 보여 주는 것이며, 실제 AI 분석이 아니에요. 고양이의 말을 번역한 것도 아니에요.`);
  expect(gone).not.toContain('놀아줬어요');
  expect(gone).not.toContain('따라왔어요');
  expect(presentCitedReactionAnswer(saved, undefined)).toBe(saved);
  expect(presentCitedReactionAnswer(saved, null)).toBe(saved);
});

it('rewrites only the first reaction sentence', () => {
  const text = `${saved} “지켜봤어요” 이후 “그대로였어요”라고 남겼어요.`;
  const edited = presentCitedReactionAnswer(text, { status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' });
  expect(edited).toContain('“창문을 열었어요” 이후 “다가왔어요”라고 남겼어요');
  expect(edited).toContain('“지켜봤어요” 이후 “그대로였어요”라고 남겼어요');
  expect(edited).not.toContain('따라왔어요');
  const care = '질문과 맞는 저장 기록을 찾았어요. 오늘 돌봄에 “식사를 챙겼어요”라고 남겼어요. 한 번의 기록으로 이유를 확정할 수는 없어요.';
  expect(presentCitedReactionAnswer(care, { status: 'gone' })).toBe(care);
});

it('refreshes every cited reaction sentence and leaves sentences that are not those citations', () => {
  const saved = '질문과 맞는 저장 기록을 찾았어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. “지켜봤어요” 이후 “그대로였어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.\n\n이 답은 저장된 보호자 기록을 보여 주는 것이며, 실제 AI 분석이 아니에요. 고양이의 말을 번역한 것도 아니에요.';
  const edited = presentCitedReactionAnswer(saved, [
    { status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' },
    { status: 'saved', action: '밥을 줬어요', reaction: '먹었어요' },
  ]);
  expect(edited).toBe('질문과 맞는 저장 기록을 찾았어요. “창문을 열었어요” 이후 “다가왔어요”라고 남겼어요. “밥을 줬어요” 이후 “먹었어요”라고 남겼어요. 한 번의 반응으로 이유를 확정할 수는 없어요.\n\n이 답은 저장된 보호자 기록을 보여 주는 것이며, 실제 AI 분석이 아니에요. 고양이의 말을 번역한 것도 아니에요.');
  const goneLater = presentCitedReactionAnswer(saved, [
    { status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' },
    { status: 'gone' },
  ]);
  expect(goneLater).toContain('“창문을 열었어요” 이후 “다가왔어요”라고 남겼어요');
  expect(goneLater).toContain(citedReactionGoneText);
  expect(goneLater).not.toContain('지켜봤어요');
  expect(goneLater).not.toContain('그대로였어요');
  expect(goneLater).not.toContain('따라왔어요');
  const unreadLater = presentCitedReactionAnswer(saved, [
    { status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' },
    undefined,
  ]);
  expect(unreadLater).toContain('“창문을 열었어요” 이후 “다가왔어요”라고 남겼어요');
  expect(unreadLater).toContain('“지켜봤어요” 이후 “그대로였어요”라고 남겼어요');
  expect(unreadLater).not.toContain('따라왔어요');
  const extra = `${saved} “문을 닫았어요” 이후 “숨었어요”라고 남겼어요.`;
  const firstOnly = presentCitedReactionAnswer(extra, { status: 'gone' });
  expect(firstOnly).toContain(citedReactionGoneText);
  expect(firstOnly).toContain('지켜봤어요');
  expect(firstOnly).toContain('문을 닫았어요');
  expect(firstOnly).not.toContain('따라왔어요');
  const moments = new Map([
    ['obs-1', { status: 'saved' as const, action: '창문을 열었어요', reaction: '다가왔어요' }],
    ['obs-2', { status: 'gone' as const }],
  ]);
  expect(citedReactionsForAnswer(['obs-1', 'missing', 'obs-2'], moments)).toEqual([
    moments.get('obs-1'),
    undefined,
    moments.get('obs-2'),
  ]);
  expect(citedReactionsForAnswer(['missing'], moments)).toBeUndefined();
  expect(citedReactionsForAnswer(undefined, moments)).toBeUndefined();
  const three = `${saved.slice(0, saved.indexOf('한 번의 반응'))}“문을 닫았어요” 이후 “숨었어요”라고 남겼어요. ${saved.slice(saved.indexOf('한 번의 반응'))}`;
  const together = presentConversationAnswer(
    three,
    undefined,
    citedReactionsForAnswer(['obs-1', 'missing', 'obs-2'], moments),
  );
  expect(together).toContain('“창문을 열었어요” 이후 “다가왔어요”라고 남겼어요');
  expect(together).toContain('“지켜봤어요” 이후 “그대로였어요”라고 남겼어요');
  expect(together).toContain(citedReactionGoneText);
  expect(together).not.toContain('따라왔어요');
  expect(together).not.toContain('문을 닫았어요');
  expect(together).not.toContain('숨었어요');
});

it('keeps a later reaction on the same observation and ignores a blank one', () => {
  const current = citedReactionFromFeedback([
    { id: 'older', action: '놀아줬어요', reaction: '따라왔어요', createdAt: '2026-09-01T00:00:00Z' },
    { id: 'later', action: '창문을 열었어요', reaction: '다가왔어요', createdAt: '2026-09-02T00:00:00Z' },
    { id: 'blank', action: '   ', reaction: '   ', createdAt: '2026-09-04T00:00:00Z' },
  ]);
  expect(current).toEqual({ status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' });
  expect(citedReactionFromFeedback([])).toEqual({ status: 'gone' });
  expect(citedReactionFromFeedback(null)).toBeNull();
  expect(citedReactionFromFeedback(undefined)).toBeNull();
});

it('refreshes care and reaction quotes without touching a later sentence', () => {
  const text = '질문과 맞는 저장 기록을 찾았어요. 오늘 돌봄에 “메모 남기기”라고 골랐고, “창가”라고 적었어요. “놀아줬어요” 이후 “따라왔어요”라고 남겼어요. 뒤 문장은 그대로 “지켜봤어요” 이후 “그대로였어요”라고 남겼어요.';
  const shown = presentConversationAnswer(
    text,
    { status: 'saved', occurredAt: '2026-09-09T14:59:59Z', kind: 'PLAY', note: '창가를 떠났어요' },
    { status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' },
    new Date('2026-09-10T00:30:00Z'),
  );
  expect(shown).toContain('2026년 9월 9일 돌봄에 “놀아줬어요”라고 골랐고, “창가를 떠났어요”라고 적었어요');
  expect(shown).toContain('“창문을 열었어요” 이후 “다가왔어요”라고 남겼어요');
  expect(shown).toContain('“지켜봤어요” 이후 “그대로였어요”라고 남겼어요');
  expect(shown).not.toContain('따라왔어요');
  expect(shown).not.toContain('“창가”라고 적었어요');
});

it('marks a missing observation gone and keeps a failed read absent', () => {
  const known = new Map([['loaded', { status: 'saved' as const, action: '놀아줬어요', reaction: '따라왔어요' }]]);
  const loadedIds = new Set(['loaded', 'unknown-feedback']);
  const finished = resolveCitedReactionMap({
    ids: ['loaded', 'deleted', 'unknown-feedback'],
    known,
    loadedIds,
    listComplete: true,
    extra: [{ id: 'deleted', record: { status: 'saved', action: '옛 행동', reaction: '옛 반응' } }, { id: 'unknown-feedback', record: null }],
  });
  expect(finished.get('loaded')).toEqual({ status: 'saved', action: '놀아줬어요', reaction: '따라왔어요' });
  expect(finished.get('deleted')).toEqual({ status: 'gone' });
  expect(finished.has('unknown-feedback')).toBe(false);
  const open = resolveCitedReactionMap({
    ids: ['later-page'],
    known: new Map(),
    loadedIds: new Set(),
    listComplete: false,
    extra: [{ id: 'later-page', record: { status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' } }],
  });
  expect(open.get('later-page')).toEqual({ status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' });
});

it('shows the observation screen’s cited reaction as it is saved now', () => {
  const moments = new Map<string, { status: 'saved'; action: string; reaction: string } | { status: 'gone' }>([
    ['kept', { status: 'saved', action: '창문을 열었어요', reaction: '다가왔어요' }],
    ['gone', { status: 'gone' }],
  ]);
  const shown = observationCitedReactions(['kept', 'unread', 'gone'], moments);
  expect(shown).toEqual([
    { id: 'kept', line: '“창문을 열었어요” 이후 “다가왔어요”라고 남겼어요', open: true },
    { id: 'unread', line: null, open: true },
    { id: 'gone', line: citedReactionGoneText, open: false },
  ]);
  expect(shown[2].line).not.toContain('놀아줬어요');
  expect(shown[2].line).not.toContain('따라왔어요');
  expect(observationCitedReactions(undefined, moments)).toEqual([]);
  expect(observationCitedReactions(['kept'], new Map())).toEqual([{ id: 'kept', line: null, open: true }]);
});
