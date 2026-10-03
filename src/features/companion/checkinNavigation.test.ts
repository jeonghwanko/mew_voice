import { checkinExitHref, citedCheckinHref } from './checkinNavigation';

it('returns to the saved conversation after a cited check-in, and home otherwise', () => {
  expect(citedCheckinHref('care-1', 'thread-1', 'demo-momo')).toBe('/checkin?id=care-1&returnTo=conversation&conversationId=thread-1&petId=demo-momo');
  expect(checkinExitHref({ returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(checkinExitHref({ returnTo: 'conversation', conversationId: 'thread-1' })).toBe('/(tabs)/conversation?conversationId=thread-1');
  expect(checkinExitHref({ returnTo: ['conversation'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(checkinExitHref({})).toBe('/');
  expect(checkinExitHref({ returnTo: 'home', conversationId: 'thread-1' })).toBe('/');
  expect(checkinExitHref({ returnTo: 'conversation' })).toBe('/');
  expect(checkinExitHref({ returnTo: 'conversation', conversationId: '   ' })).toBe('/');
  expect(citedCheckinHref('care/1', 'thread 1', 'pet 1')).toBe('/checkin?id=care%2F1&returnTo=conversation&conversationId=thread%201&petId=pet%201');
  expect(checkinExitHref({ returnTo: 'conversation', conversationId: 'thread 1', petId: 'pet 1' })).toBe('/(tabs)/conversation?conversationId=thread%201&petId=pet%201');
});
