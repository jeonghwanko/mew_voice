import { HOME_CHAT_CONTINUE, HOME_CHAT_WRITE, homeChatEntry } from './homeChatEntry';
import { homeQuickActions } from './homeQuickActions';

it('shows continue and a new written question together once a thread exists', () => {
  const entry = homeChatEntry({ thinking: false, saved: true, petName: '모모' });
  expect(entry.title).toBe(HOME_CHAT_CONTINUE);
  expect(entry.detail).toBe(HOME_CHAT_WRITE);
  expect(entry.accessibilityLabel).toBe('이전 대화 이어 읽기, 글로 대화하기');
  expect(entry.accessibilityLabel).toContain(HOME_CHAT_CONTINUE);
  expect(entry.accessibilityLabel).toContain(HOME_CHAT_WRITE);
  expect(entry.title).not.toBe(entry.accessibilityLabel);
  expect(`${entry.title} ${entry.detail}`).not.toMatch(/알아듣|번역|진단|건강|%/);
});

it('keeps the empty invitation when nothing is saved', () => {
  expect(homeChatEntry({ thinking: false, saved: false, petName: '모모' })).toEqual({
    title: '모모에게 궁금한 이야기',
    detail: null,
    accessibilityLabel: HOME_CHAT_WRITE,
  });
  expect(homeChatEntry({ thinking: false, saved: false, petName: null })).toEqual({
    title: '우리 아이와 대화하기',
    detail: null,
    accessibilityLabel: HOME_CHAT_WRITE,
  });
  expect(homeChatEntry({ thinking: true, saved: true, petName: '모모' }).title).toBe('답변을 준비하고 있어요…');
});

it('does not rename the home capture actions', () => {
  expect([homeQuickActions.talk.label, homeQuickActions.record.label, homeQuickActions.photo.label]).toEqual(['말 걸기', '울음 녹음', '사진 찍기']);
});
