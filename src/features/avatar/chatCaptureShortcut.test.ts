import { chatCaptureShortcut } from './chatCaptureShortcut';
import { homeQuickActions } from './homeQuickActions';

const savedCryPlayback = '울음 다시 듣기';

it('names the conversation shortcut as leaving a photo or a cry, not playing one', () => {
  expect(chatCaptureShortcut.label).toBe('사진이나 울음 남기기');
  expect(chatCaptureShortcut.label).toMatch(/남기/);
  expect(chatCaptureShortcut.label).toMatch(/사진/);
  expect(chatCaptureShortcut.label).toMatch(/울음/);
  expect(chatCaptureShortcut.label).not.toMatch(/듣기|재생|다시|분석|번역|%/);
  expect(chatCaptureShortcut.label).not.toBe(savedCryPlayback);
});

it('does not change the home action labels', () => {
  expect([homeQuickActions.talk.label, homeQuickActions.record.label, homeQuickActions.photo.label]).toEqual(['말 걸기', '울음 녹음', '사진 찍기']);
});
