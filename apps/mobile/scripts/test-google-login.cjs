const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function load({ expoGo = false, response, failure, webClientId = 'web-client', platform = 'android' } = {}) {
  const calls = [];
  const sdk = {
    GoogleSignin: {
      configure: (value) => calls.push(value),
      hasPlayServices: async () => calls.push('play-services'),
      signIn: async () => { if (failure) throw failure; return response; },
    },
    statusCodes: { SIGN_IN_CANCELLED: 'cancelled', PLAY_SERVICES_NOT_AVAILABLE: 'unavailable' },
    isErrorWithCode: (error) => typeof error.code === 'string',
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/auth/use-google-login.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, {
    exports,
    process: { env: { EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: webClientId } },
    require: (name) => {
      if (name === 'expo-constants') return { default: { executionEnvironment: expoGo ? 'store' : 'standalone' }, ExecutionEnvironment: { StoreClient: 'store' }, __esModule: true };
      if (name === 'react-native') return { Platform: { OS: platform } };
      calls.push('load-sdk');
      return sdk;
    },
  });
  return { signIn: exports.useGoogleLogin(), calls };
}

test('native sign-in checks Play services and returns only the ID token for server verification', async () => {
  const { signIn, calls } = load({ response: { type: 'success', data: { idToken: 'signed-token' } } });
  assert.equal((await signIn()).idToken, 'signed-token');
  assert.equal(calls[1].webClientId, 'web-client');
  assert.equal(calls[2], 'play-services');
});
test('Expo Go is rejected before loading the native module', async () => {
  const { signIn, calls } = load({ expoGo: true });
  await assert.rejects(signIn, /instead of Expo Go/);
  assert.equal(calls.length, 0);
});
test('missing configuration is rejected before starting sign-in', async () => {
  await assert.rejects(load({ webClientId: '' }).signIn, /not configured/);
  await assert.rejects(load({ platform: 'ios' }).signIn, /not configured/);
});
test('cancellation produces no server credentials', async () => {
  assert.equal(await load({ response: { type: 'cancelled' } }).signIn(), null);
  assert.equal(await load({ failure: { code: 'cancelled' } }).signIn(), null);
});
test('missing ID token cannot log in', async () => {
  await assert.rejects(load({ response: { type: 'success', data: { idToken: null } } }).signIn, /did not return/);
});
test('certificate mismatch and missing Play services give actionable errors', async () => {
  await assert.rejects(load({ failure: { code: '10' } }).signIn, /signing SHA-1/);
  await assert.rejects(load({ failure: { code: 'unavailable' } }).signIn, /Update Google Play services/);
});
