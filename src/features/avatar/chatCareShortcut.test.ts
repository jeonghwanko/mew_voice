import { chatCareShortcut } from './chatCareShortcut';
import { chatCaptureShortcut } from './chatCaptureShortcut';
import { homeQuickActions } from './homeQuickActions';

const savedCryPlayback = '울음 다시 듣기';

it('names the conversation shortcut as today’s care, not the diary', () => {
  expect(chatCareShortcut.label).toBe('오늘의 돌봄');
  expect(chatCareShortcut.label).toMatch(/돌봄/);
  expect(chatCareShortcut.label).not.toBe('기록');
  expect(chatCareShortcut.label).not.toMatch(/일기|번역|진단|건강/);
});

it('does not change the other conversation or home labels', () => {
  expect(chatCaptureShortcut.label).toBe('사진이나 울음 남기기');
  expect([homeQuickActions.talk.label, homeQuickActions.record.label, homeQuickActions.photo.label]).toEqual(['말 걸기', '울음 녹음', '사진 찍기']);
  expect(savedCryPlayback).toBe('울음 다시 듣기');
});
