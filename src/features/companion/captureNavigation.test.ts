import { captureHomeHref, captureLeaveHref, captureSavedHref, homeCaptureHref, replacedCaptureHref } from './captureNavigation';

it('starts a new photo, cry, or video from home with the existing home return', () => {
  expect(homeCaptureHref('photo')).toBe('/capture?mode=photo&returnTo=home');
  expect(homeCaptureHref('audio')).toBe('/capture?mode=audio&returnTo=home');
  expect(homeCaptureHref('video')).toBe('/capture?mode=video&returnTo=home');
  expect(homeCaptureHref()).toBe('/capture?returnTo=home');
});

it('returns home after a new capture saved from home, and keeps diary and the record list on the observation', () => {
  expect(captureSavedHref('obs-1', { returnTo: 'home' })).toBe('/');
  expect(captureSavedHref('obs-1', { returnTo: ['home'] })).toBe('/');
  expect(captureSavedHref('obs-1', { returnTo: 'home', conversationId: '   ', petId: 'demo-momo' })).toBe('/');
  expect(captureSavedHref('obs-1', { returnTo: 'home', conversationId: 'thread-1', petId: 'demo-momo' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(captureSavedHref('obs-1', { returnTo: ['home'], conversationId: ['thread-1'] })).toEqual({ pathname: '/', params: { conversationId: 'thread-1' } });
  expect(captureSavedHref('obs-1', { returnTo: 'diary', petId: 'demo-momo' })).toBe('/observations/obs-1');
  expect(captureSavedHref('obs-1', { returnTo: ['diary'], petId: ['demo-momo'] })).toBe('/observations/obs-1');
  expect(captureSavedHref('obs-1', {})).toBe('/observations/obs-1');
  expect(captureSavedHref('obs/1', { returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/observations/obs%2F1');
  expect(captureSavedHref('obs-1', { returnTo: 'history' })).toBe('/observations/obs-1');
  expect(captureSavedHref('   ', { returnTo: 'diary', petId: 'demo-momo' })).toBe('/history');
  expect(captureSavedHref('   ', {})).toBe('/history');
  expect(captureHomeHref({ returnTo: 'diary', petId: 'demo-momo' })).toBeNull();
  expect(captureHomeHref({})).toBeNull();
});

it('returns home when a new home capture is closed without saving, and leaves other starts on the previous screen', () => {
  expect(captureLeaveHref({ returnTo: 'home' })).toBe('/');
  expect(captureLeaveHref({ returnTo: ['home'], petId: ['demo-momo'] })).toBe('/');
  expect(captureLeaveHref({ returnTo: 'home', conversationId: 'thread 1', petId: 'pet 1' })).toEqual({ pathname: '/', params: { conversationId: 'thread 1', petId: 'pet 1' } });
  expect(captureLeaveHref({ returnTo: 'diary', petId: 'demo-momo' })).toBeNull();
  expect(captureLeaveHref({ returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBeNull();
  expect(captureLeaveHref({})).toBeNull();
  expect(captureLeaveHref({ returnTo: 'history', conversationId: 'thread-1' })).toBeNull();
});

it('keeps the observation return path when media is replaced, including a home open', () => {
  expect(replacedCaptureHref('obs-1', { returnTo: 'home' })).toBe('/observations/obs-1?returnTo=home');
  expect(replacedCaptureHref('obs-1', { returnTo: ['home'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toBe('/observations/obs-1?returnTo=home&conversationId=thread-1&petId=demo-momo');
  expect(replacedCaptureHref('obs-1', { returnTo: 'home', conversationId: '   ', petId: 'demo-momo' })).toBe('/observations/obs-1?returnTo=home&petId=demo-momo');
  expect(replacedCaptureHref('obs-1', { returnTo: 'diary', petId: 'demo-momo' })).toBe('/observations/obs-1?returnTo=diary&petId=demo-momo');
  expect(replacedCaptureHref('obs-1', { returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/observations/obs-1?returnTo=conversation&conversationId=thread-1&petId=demo-momo');
  expect(replacedCaptureHref('obs/1', { returnTo: 'diary', petId: 'pet 1' })).toBe('/observations/obs%2F1?returnTo=diary&petId=pet%201');
  expect(replacedCaptureHref('obs-1', {})).toBe('/observations/obs-1');
  expect(replacedCaptureHref('obs-1', { returnTo: '   ', conversationId: '   ' })).toBe('/observations/obs-1');
  expect(replacedCaptureHref('   ', { returnTo: 'home' })).toBe('/history');
});
