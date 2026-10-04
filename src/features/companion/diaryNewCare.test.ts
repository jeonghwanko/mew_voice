import { diaryNewCare } from './diaryNewCare';
import { chatCareShortcut } from '../avatar/chatCareShortcut';
import { chatCaptureShortcut } from '../avatar/chatCaptureShortcut';
import { homeQuickActions } from '../avatar/homeQuickActions';

const diaryTab = '기록';
const savedCryPlayback = '울음 다시 듣기';

it('names the diary check-in start as today’s care, not the diary list', () => {
  expect(diaryNewCare.label).toBe('오늘의 돌봄');
  expect(diaryNewCare.label).toBe(chatCareShortcut.label);
  expect(diaryNewCare.label).toMatch(/돌봄/);
  expect(diaryNewCare.label).not.toBe(diaryTab);
  expect(diaryNewCare.label).not.toMatch(/기록|일기|번역|진단|건강/);
});

it('does not change the diary tab or the other action labels', () => {
  expect(diaryTab).toBe('기록');
  expect(chatCaptureShortcut.label).toBe('사진이나 울음 남기기');
  expect([homeQuickActions.talk.label, homeQuickActions.record.label, homeQuickActions.photo.label]).toEqual(['말 걸기', '울음 녹음', '사진 찍기']);
  expect(savedCryPlayback).toBe('울음 다시 듣기');
});
