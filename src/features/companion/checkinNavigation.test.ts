import { checkinExitHref, citedCheckinHref } from './checkinNavigation';

it('returns to the saved conversation after a cited check-in, and home otherwise', () => {
  expect(citedCheckinHref('care-1', 'thread-1', 'demo-momo')).toBe('/checkin?id=care-1&returnTo=conversation&conversationId=thread-1&petId=demo-momo');
  expect(checkinExitHref({ returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(checkinExitHref({ returnTo: 'conversation', conversationId: 'thread-1' })).toBe('/(tabs)/conversation?conversationId=thread-1');
  expect(checkinExitHref({ returnTo: ['conversation'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(checkinExitHref({})).toBe('/');
  expect(checkinExitHref({ returnTo: 'home' })).toBe('/');
  expect(checkinExitHref({ returnTo: 'history', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/');
  expect(checkinExitHref({ returnTo: 'conversation' })).toBe('/');
  expect(checkinExitHref({ returnTo: 'conversation', conversationId: '   ' })).toBe('/');
  expect(citedCheckinHref('care/1', 'thread 1', 'pet 1')).toBe('/checkin?id=care%2F1&returnTo=conversation&conversationId=thread%201&petId=pet%201');
  expect(checkinExitHref({ returnTo: 'conversation', conversationId: 'thread 1', petId: 'pet 1' })).toBe('/(tabs)/conversation?conversationId=thread%201&petId=pet%201');
});

it('returns to the home question after a citation opened from the home chat', () => {
  expect(citedCheckinHref('care-1', 'thread-1', 'demo-momo', 'home')).toBe('/checkin?id=care-1&returnTo=home&conversationId=thread-1&petId=demo-momo');
  expect(checkinExitHref({ returnTo: 'home', conversationId: 'thread-1', petId: 'demo-momo' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(checkinExitHref({ returnTo: 'home', conversationId: 'thread-1' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1' } });
  expect(checkinExitHref({ returnTo: ['home'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(checkinExitHref({ returnTo: 'home', conversationId: '   ', petId: 'demo-momo' })).toBe('/');
  expect(citedCheckinHref('care/1', 'thread 1', 'pet 1', 'home')).toBe('/checkin?id=care%2F1&returnTo=home&conversationId=thread%201&petId=pet%201');
  expect(checkinExitHref({ returnTo: 'home', conversationId: 'thread 1', petId: 'pet 1' })).toEqual({ pathname: '/', params: { conversationId: 'thread 1', petId: 'pet 1' } });
  expect(citedCheckinHref('care-1', '   ', 'demo-momo', 'home')).toBe('/checkin?id=care-1');
});
