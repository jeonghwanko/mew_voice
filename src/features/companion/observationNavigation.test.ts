import { citedObservationHref, observationExitHref, observationLeaveHref } from './observationNavigation';

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
