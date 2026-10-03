import { citedObservationHref, citedPriorObservationHref, diaryObservationHref, observationExitHref, observationLeaveHref } from './observationNavigation';

it('returns to the saved conversation after a cited observation, and stays otherwise', () => {
  expect(citedObservationHref('obs-1', 'thread-1', 'demo-momo')).toBe('/observations/obs-1?returnTo=conversation&conversationId=thread-1&petId=demo-momo');
  expect(observationExitHref({ returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(observationExitHref({ returnTo: 'conversation', conversationId: 'thread-1' })).toBe('/(tabs)/conversation?conversationId=thread-1');
  expect(observationExitHref({ returnTo: ['conversation'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(observationExitHref({})).toBeNull();
  expect(observationExitHref({ returnTo: 'history', conversationId: 'thread-1', petId: 'demo-momo' })).toBeNull();
  expect(observationExitHref({ returnTo: 'conversation' })).toBeNull();
  expect(observationExitHref({ returnTo: 'conversation', conversationId: '   ' })).toBeNull();
  expect(citedObservationHref('obs/1', 'thread 1', 'pet 1')).toBe('/observations/obs%2F1?returnTo=conversation&conversationId=thread%201&petId=pet%201');
  expect(observationExitHref({ returnTo: 'conversation', conversationId: 'thread 1', petId: 'pet 1' })).toBe('/(tabs)/conversation?conversationId=thread%201&petId=pet%201');
  expect(citedObservationHref('obs-1', '   ', 'demo-momo')).toBe('/observations/obs-1');
  expect(citedObservationHref('   ', 'thread-1', 'demo-momo')).toBe('/history');
});

it('returns to the home question after a citation opened from the home chat', () => {
  expect(citedObservationHref('obs-1', 'thread-1', 'demo-momo', 'home')).toBe('/observations/obs-1?returnTo=home&conversationId=thread-1&petId=demo-momo');
  expect(observationExitHref({ returnTo: 'home', conversationId: 'thread-1', petId: 'demo-momo' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(observationExitHref({ returnTo: 'home', conversationId: 'thread-1' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1' } });
  expect(observationExitHref({ returnTo: ['home'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(observationExitHref({ returnTo: 'home' })).toBeNull();
  expect(observationExitHref({ returnTo: 'home', conversationId: '   ' })).toBeNull();
  expect(observationExitHref({ returnTo: 'history', conversationId: 'thread-1', petId: 'demo-momo' })).toBeNull();
  expect(citedObservationHref('obs/1', 'thread 1', 'pet 1', 'home')).toBe('/observations/obs%2F1?returnTo=home&conversationId=thread%201&petId=pet%201');
  expect(observationExitHref({ returnTo: 'home', conversationId: 'thread 1', petId: 'pet 1' })).toEqual({ pathname: '/', params: { conversationId: 'thread 1', petId: 'pet 1' } });
  expect(citedObservationHref('obs-1', '   ', 'demo-momo', 'home')).toBe('/observations/obs-1');
});

it('returns to the opening question when leaving an observation without a new reaction', () => {
  expect(observationLeaveHref({ returnTo: 'home', conversationId: 'thread-1', petId: 'demo-momo' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(observationLeaveHref({ returnTo: 'home', conversationId: 'thread-1' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1' } });
  expect(observationLeaveHref({ returnTo: ['home'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(observationLeaveHref({ returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(observationLeaveHref({ returnTo: 'conversation', conversationId: 'thread-1' })).toBe('/(tabs)/conversation?conversationId=thread-1');
  expect(observationLeaveHref({ returnTo: ['conversation'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(observationLeaveHref({ returnTo: 'home', conversationId: 'thread 1', petId: 'pet 1' })).toEqual({ pathname: '/', params: { conversationId: 'thread 1', petId: 'pet 1' } });
  expect(observationLeaveHref({ returnTo: 'conversation', conversationId: 'thread 1', petId: 'pet 1' })).toBe('/(tabs)/conversation?conversationId=thread%201&petId=pet%201');
  expect(observationLeaveHref({})).toBe('/history');
  expect(observationLeaveHref({ returnTo: 'history', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/history');
  expect(observationLeaveHref({ returnTo: 'home' })).toBe('/history');
  expect(observationLeaveHref({ returnTo: 'home', conversationId: '   ' })).toBe('/history');
  expect(observationLeaveHref({ returnTo: 'conversation' })).toBe('/history');
  expect(observationLeaveHref({ returnTo: 'conversation', conversationId: '   ' })).toBe('/history');
});

it('keeps the opening question when a caregiver reaction opens an earlier observation', () => {
  expect(citedPriorObservationHref('prior-1', { returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/observations/prior-1?returnTo=conversation&conversationId=thread-1&petId=demo-momo');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'home', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/observations/prior-1?returnTo=home&conversationId=thread-1&petId=demo-momo');
  expect(citedPriorObservationHref('prior-1', { returnTo: ['home'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toBe('/observations/prior-1?returnTo=home&conversationId=thread-1&petId=demo-momo');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'conversation', conversationId: 'thread-1' })).toBe('/observations/prior-1?returnTo=conversation&conversationId=thread-1');
  expect(citedPriorObservationHref('prior-1', { returnTo: ['conversation'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toBe('/observations/prior-1?returnTo=conversation&conversationId=thread-1&petId=demo-momo');
  expect(citedPriorObservationHref('prior/1', { returnTo: 'home', conversationId: 'thread 1', petId: 'pet 1' })).toBe('/observations/prior%2F1?returnTo=home&conversationId=thread%201&petId=pet%201');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'conversation', conversationId: 'thread 1', petId: 'pet 1' })).toBe('/observations/prior-1?returnTo=conversation&conversationId=thread%201&petId=pet%201');
  expect(citedPriorObservationHref('prior-1', {})).toBe('/observations/prior-1');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'history', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/observations/prior-1');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'home' })).toBe('/observations/prior-1');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'home', conversationId: '   ', petId: 'demo-momo' })).toBe('/observations/prior-1');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'conversation' })).toBe('/observations/prior-1');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'conversation', conversationId: '   ' })).toBe('/observations/prior-1');
  expect(citedPriorObservationHref('   ', { returnTo: 'home', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/history');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'diary', petId: 'demo-momo' })).toBe('/observations/prior-1?returnTo=diary&petId=demo-momo');
  expect(citedPriorObservationHref('prior-1', { returnTo: ['diary'], petId: ['demo-momo'] })).toBe('/observations/prior-1?returnTo=diary&petId=demo-momo');
  expect(citedPriorObservationHref('prior/1', { returnTo: 'diary', petId: 'pet 1' })).toBe('/observations/prior%2F1?returnTo=diary&petId=pet%201');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'diary', petId: 'demo-momo', conversationId: 'thread-1' })).toBe('/observations/prior-1?returnTo=diary&petId=demo-momo');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'diary' })).toBe('/observations/prior-1');
  expect(citedPriorObservationHref('prior-1', { returnTo: 'diary', petId: '   ' })).toBe('/observations/prior-1');
  expect(citedPriorObservationHref('   ', { returnTo: 'diary', petId: 'demo-momo' })).toBe('/history');
});

it('returns to the same pet’s diary after an observation opened from the diary', () => {
  expect(diaryObservationHref('obs-1', 'demo-momo')).toBe('/observations/obs-1?returnTo=diary&petId=demo-momo');
  expect(observationExitHref({ returnTo: 'diary', petId: 'demo-momo' })).toBe('/(tabs)/history?petId=demo-momo');
  expect(observationExitHref({ returnTo: ['diary'], petId: ['demo-momo'] })).toBe('/(tabs)/history?petId=demo-momo');
  expect(observationExitHref({ returnTo: 'diary', petId: 'pet 1', conversationId: 'thread-1' })).toBe('/(tabs)/history?petId=pet%201');
  expect(observationExitHref({ returnTo: 'diary' })).toBeNull();
  expect(observationExitHref({ returnTo: 'diary', petId: '   ' })).toBeNull();
  expect(observationExitHref({ returnTo: 'history', conversationId: 'thread-1', petId: 'demo-momo' })).toBeNull();
  expect(diaryObservationHref('obs/1', 'pet 1')).toBe('/observations/obs%2F1?returnTo=diary&petId=pet%201');
  expect(diaryObservationHref('   ', 'demo-momo')).toBe('/history');
  expect(diaryObservationHref('obs-1', '   ')).toBe('/observations/obs-1');
  expect(observationLeaveHref({ returnTo: 'diary', petId: 'demo-momo' })).toBe('/(tabs)/history?petId=demo-momo');
  expect(observationLeaveHref({ returnTo: 'diary', petId: 'pet 1' })).toBe('/(tabs)/history?petId=pet%201');
  expect(observationLeaveHref({ returnTo: 'diary' })).toBe('/history');
  expect(observationLeaveHref({ returnTo: 'diary', petId: '   ' })).toBe('/history');
  expect(observationLeaveHref({ returnTo: 'home', conversationId: 'thread-1', petId: 'demo-momo' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(observationLeaveHref({ returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
});
