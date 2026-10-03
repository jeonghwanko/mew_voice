import { citedObservationHref, observationExitHref } from './observationNavigation';

it('returns to the saved conversation after a cited observation, and stays otherwise', () => {
  expect(citedObservationHref('obs-1', 'thread-1', 'demo-momo')).toBe('/observations/obs-1?returnTo=conversation&conversationId=thread-1&petId=demo-momo');
  expect(observationExitHref({ returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(observationExitHref({ returnTo: 'conversation', conversationId: 'thread-1' })).toBe('/(tabs)/conversation?conversationId=thread-1');
  expect(observationExitHref({ returnTo: ['conversation'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(observationExitHref({})).toBeNull();
  expect(observationExitHref({ returnTo: 'home', conversationId: 'thread-1' })).toBeNull();
  expect(observationExitHref({ returnTo: 'history', conversationId: 'thread-1', petId: 'demo-momo' })).toBeNull();
  expect(observationExitHref({ returnTo: 'conversation' })).toBeNull();
  expect(observationExitHref({ returnTo: 'conversation', conversationId: '   ' })).toBeNull();
  expect(citedObservationHref('obs/1', 'thread 1', 'pet 1')).toBe('/observations/obs%2F1?returnTo=conversation&conversationId=thread%201&petId=pet%201');
  expect(observationExitHref({ returnTo: 'conversation', conversationId: 'thread 1', petId: 'pet 1' })).toBe('/(tabs)/conversation?conversationId=thread%201&petId=pet%201');
  expect(citedObservationHref('obs-1', '   ', 'demo-momo')).toBe('/observations/obs-1');
  expect(citedObservationHref('   ', 'thread-1', 'demo-momo')).toBe('/history');
});
