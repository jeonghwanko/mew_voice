import { checkinSave } from './checkinSave';
import { diaryNewCare } from './diaryNewCare';
import { chatCareShortcut } from '../avatar/chatCareShortcut';
import { chatCaptureShortcut } from '../avatar/chatCaptureShortcut';
import { homeQuickActions } from '../avatar/homeQuickActions';

const diaryTab = '기록';
const savedCryPlayback = '울음 다시 듣기';
const editSave = '수정 저장하기';

it('names a new care check-in save as leaving care, not a diary entry', () => {
  expect(checkinSave.label).toBe('돌봄 남기기');
  expect(checkinSave.label).toMatch(/돌봄/);
  expect(checkinSave.label).not.toBe('기록 남기기');
  expect(checkinSave.label).not.toBe(diaryTab);
  expect(checkinSave.label).not.toBe(editSave);
  expect(checkinSave.label).not.toMatch(/일기|번역|진단|건강|사진|울음|영상|대화/);
});

it('does not change the diary tab or the other save and action labels', () => {
  expect(diaryTab).toBe('기록');
  expect(diaryNewCare.label).toBe('오늘의 돌봄');
  expect(chatCareShortcut.label).toBe('오늘의 돌봄');
  expect(chatCaptureShortcut.label).toBe('사진이나 울음 남기기');
  expect([homeQuickActions.talk.label, homeQuickActions.record.label, homeQuickActions.photo.label]).toEqual(['말 걸기', '울음 녹음', '사진 찍기']);
  expect(savedCryPlayback).toBe('울음 다시 듣기');
  expect(editSave).toBe('수정 저장하기');
});
