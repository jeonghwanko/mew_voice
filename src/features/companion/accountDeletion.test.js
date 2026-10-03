import React from 'react';
import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import { act, create } from 'react-test-renderer';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import Settings from '../../../app/settings';
import { api } from '../../lib/api';
import { useSession } from '../../core/session';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), back: jest.fn() } }));
jest.mock('../../core/session', () => ({ useSession: jest.fn() }));
jest.mock('../../lib/api', () => ({ API_BASE: '', api: { delete: jest.fn() }, errorMessage: e => e.message }));
jest.mock('./useCompanion', () => ({ useCompanion: () => ({ consent: { data: {} } }) }));
jest.mock('../../ui/components', () => Object.fromEntries(['Body', 'Button', 'Card', 'ErrorNote', 'Heading', 'Screen'].map(name => [name, name])));

let tree;
let logout;
beforeEach(() => {
  jest.clearAllMocks();
  logout = jest.fn().mockResolvedValue(undefined);
  useSession.mockReturnValue({ session: { mode: 'api' }, logout });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; });
async function render() { await act(async () => { tree = create(<Settings />); }); }
async function openConfirmation() {
  await render();
  await act(async () => tree.root.findAllByType('Button').find(b => b.props.title === '계정 삭제').props.onPress());
  return Alert.alert.mock.calls[0][2];
}
test('cancel leaves the account and session intact', async () => {
  const buttons = await openConfirmation();
  expect(buttons[0].style).toBe('cancel');
  buttons[0].onPress?.();
  expect(api.delete).not.toHaveBeenCalled();
  expect(logout).not.toHaveBeenCalled();
});
test('confirmed deletion clears the session only after the server succeeds', async () => {
  let resolve;
  api.delete.mockImplementation(() => new Promise(done => { resolve = done; }));
  const buttons = await openConfirmation();
  await act(async () => buttons[1].onPress());
  expect(api.delete).toHaveBeenCalledWith('/auth/me');
  expect(logout).not.toHaveBeenCalled();
  await act(async () => resolve());
  expect(logout).toHaveBeenCalledTimes(1);
  expect(router.replace).toHaveBeenCalledWith('/');
});
test('failed deletion keeps the account session and shows an error', async () => {
  api.delete.mockRejectedValue(new Error('삭제 요청에 실패했어요'));
  const buttons = await openConfirmation();
  await act(async () => buttons[1].onPress());
  expect(logout).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
  expect(tree.root.findByType('ErrorNote').props.message).toBe('삭제 요청에 실패했어요');
});
test('local demo mode has no server account deletion action', async () => {
  useSession.mockReturnValue({ session: { mode: 'demo' }, logout });
  await render();
  expect(tree.root.findAllByType('Button').some(b => b.props.title === '계정 삭제')).toBe(false);
});
