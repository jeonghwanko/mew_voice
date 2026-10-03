import { checkinContinueHref, checkinExitHref, checkinUnavailableHref, citedCheckinHref, diaryCheckinHref, diaryNewCheckinHref, diaryPetTarget } from './checkinNavigation';

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

it('returns to the opening question when leaving a check-in without saving', () => {
  expect(checkinContinueHref({ returnTo: 'home', conversationId: 'thread-1', petId: 'demo-momo' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(checkinContinueHref({ returnTo: 'home', conversationId: 'thread-1' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1' } });
  expect(checkinContinueHref({ returnTo: ['home'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(checkinContinueHref({ returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(checkinContinueHref({ returnTo: 'conversation', conversationId: 'thread-1' })).toBe('/(tabs)/conversation?conversationId=thread-1');
  expect(checkinContinueHref({ returnTo: ['conversation'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(checkinContinueHref({ returnTo: 'home', conversationId: 'thread 1', petId: 'pet 1' })).toEqual({ pathname: '/', params: { conversationId: 'thread 1', petId: 'pet 1' } });
  expect(checkinContinueHref({ returnTo: 'conversation', conversationId: 'thread 1', petId: 'pet 1' })).toBe('/(tabs)/conversation?conversationId=thread%201&petId=pet%201');
  expect(checkinContinueHref({})).toBeNull();
  expect(checkinContinueHref({ returnTo: 'history', conversationId: 'thread-1', petId: 'demo-momo' })).toBeNull();
  expect(checkinContinueHref({ returnTo: 'home' })).toBeNull();
  expect(checkinContinueHref({ returnTo: 'home', conversationId: '   ', petId: 'demo-momo' })).toBeNull();
  expect(checkinContinueHref({ returnTo: 'conversation' })).toBeNull();
  expect(checkinContinueHref({ returnTo: 'conversation', conversationId: '   ' })).toBeNull();
});

it('returns to the opening question when a cited check-in is missing or belongs to another pet', () => {
  expect(checkinUnavailableHref({ returnTo: 'home', conversationId: 'thread-1', petId: 'demo-momo' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(checkinUnavailableHref({ returnTo: 'home', conversationId: 'thread-1' })).toEqual({ pathname: '/', params: { conversationId: 'thread-1' } });
  expect(checkinUnavailableHref({ returnTo: ['home'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toEqual({ pathname: '/', params: { conversationId: 'thread-1', petId: 'demo-momo' } });
  expect(checkinUnavailableHref({ returnTo: 'conversation', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(checkinUnavailableHref({ returnTo: 'conversation', conversationId: 'thread-1' })).toBe('/(tabs)/conversation?conversationId=thread-1');
  expect(checkinUnavailableHref({ returnTo: ['conversation'], conversationId: ['thread-1'], petId: ['demo-momo'] })).toBe('/(tabs)/conversation?conversationId=thread-1&petId=demo-momo');
  expect(checkinUnavailableHref({ returnTo: 'home', conversationId: 'thread 1', petId: 'pet 1' })).toEqual({ pathname: '/', params: { conversationId: 'thread 1', petId: 'pet 1' } });
  expect(checkinUnavailableHref({ returnTo: 'conversation', conversationId: 'thread 1', petId: 'pet 1' })).toBe('/(tabs)/conversation?conversationId=thread%201&petId=pet%201');
  expect(checkinUnavailableHref({})).toBe('/history');
  expect(checkinUnavailableHref({ returnTo: 'history', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/history');
  expect(checkinUnavailableHref({ returnTo: 'home' })).toBe('/history');
  expect(checkinUnavailableHref({ returnTo: 'home', conversationId: '   ', petId: 'demo-momo' })).toBe('/history');
  expect(checkinUnavailableHref({ returnTo: 'conversation' })).toBe('/history');
  expect(checkinUnavailableHref({ returnTo: 'conversation', conversationId: '   ' })).toBe('/history');
});

it('returns to the same pet’s diary after a check-in opened from the diary', () => {
  expect(diaryCheckinHref('care-1', 'demo-momo')).toBe('/checkin?id=care-1&returnTo=diary&petId=demo-momo');
  expect(checkinExitHref({ returnTo: 'diary', petId: 'demo-momo' })).toBe('/(tabs)/history?petId=demo-momo');
  expect(checkinExitHref({ returnTo: ['diary'], petId: ['demo-momo'] })).toBe('/(tabs)/history?petId=demo-momo');
  expect(checkinExitHref({ returnTo: 'diary', petId: 'pet 1', conversationId: 'thread-1' })).toBe('/(tabs)/history?petId=pet%201');
  expect(checkinExitHref({ returnTo: 'diary' })).toBe('/');
  expect(checkinExitHref({ returnTo: 'diary', petId: '   ' })).toBe('/');
  expect(checkinExitHref({ returnTo: 'history', conversationId: 'thread-1', petId: 'demo-momo' })).toBe('/');
  expect(diaryCheckinHref('care/1', 'pet 1')).toBe('/checkin?id=care%2F1&returnTo=diary&petId=pet%201');
  expect(diaryCheckinHref('   ', 'demo-momo')).toBe('/checkin');
  expect(diaryCheckinHref('care-1', '   ')).toBe('/checkin?id=care-1');
  expect(checkinContinueHref({ returnTo: 'diary', petId: 'demo-momo' })).toBe('/(tabs)/history?petId=demo-momo');
  expect(checkinContinueHref({ returnTo: 'diary' })).toBeNull();
  expect(checkinContinueHref({ returnTo: 'diary', petId: '   ' })).toBeNull();
  expect(checkinUnavailableHref({ returnTo: 'diary', petId: 'demo-momo' })).toBe('/(tabs)/history?petId=demo-momo');
  expect(checkinUnavailableHref({ returnTo: 'diary', petId: 'pet 1' })).toBe('/(tabs)/history?petId=pet%201');
  expect(checkinUnavailableHref({ returnTo: 'diary' })).toBe('/history');
  expect(diaryPetTarget({ petId: 'demo-momo' })).toBe('demo-momo');
  expect(diaryPetTarget({ petId: ['pet 1'] })).toBe('pet 1');
  expect(diaryPetTarget({ petId: '   ' })).toBeNull();
  expect(diaryPetTarget({})).toBeNull();
});

it('returns to the same pet’s diary after a new check-in started from that diary', () => {
  expect(diaryNewCheckinHref('demo-momo')).toBe('/checkin?returnTo=diary&petId=demo-momo');
  expect(diaryNewCheckinHref('pet 1')).toBe('/checkin?returnTo=diary&petId=pet%201');
  expect(diaryNewCheckinHref('   ')).toBe('/checkin');
  expect(diaryNewCheckinHref()).toBe('/checkin');
  expect(checkinExitHref({ returnTo: 'diary', petId: 'demo-momo' })).toBe('/(tabs)/history?petId=demo-momo');
  expect(checkinContinueHref({ returnTo: 'diary', petId: 'demo-momo' })).toBe('/(tabs)/history?petId=demo-momo');
  expect(checkinExitHref({})).toBe('/');
  expect(checkinContinueHref({})).toBeNull();
  expect(checkinExitHref({ petId: 'demo-momo' })).toBe('/');
  expect(checkinContinueHref({ petId: 'demo-momo' })).toBeNull();
  expect(diaryCheckinHref('care-1', 'demo-momo')).toBe('/checkin?id=care-1&returnTo=diary&petId=demo-momo');
});
