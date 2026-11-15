const { test } = require('node:test');
const assert = require('node:assert/strict');
process.env.TS_NODE_PROJECT = require('node:path').join(__dirname, '../apps/api/tsconfig.json');
require('ts-node/register/transpile-only');
const Fastify = require('fastify');
const { OAuth2Client } = require('google-auth-library');
const { authRoutes } = require('../apps/api/src/fastify/routes/auth.routes.ts');

test('Google endpoint rejects forged tokens and requires a configured audience', async () => {
  const originalVerify = OAuth2Client.prototype.verifyIdToken;
  const originalClient = process.env.GOOGLE_CLIENT_ID;
  const originalAndroid = process.env.GOOGLE_ANDROID_CLIENT_ID;
  const app = Fastify();
  app.decorate('authenticate', async () => {});
  let lookedUpUser = false;
  app.decorate('prisma', { user: { findFirst: async () => { lookedUpUser = true; throw new Error('Unexpected database call'); } } });
  try {
    process.env.GOOGLE_CLIENT_ID = 'expected-web-client';
    OAuth2Client.prototype.verifyIdToken = async ({ audience }) => {
      assert.ok(audience.includes('expected-web-client'));
      throw new Error('Invalid signature');
    };
    await app.register(authRoutes);
    const forgedToken = require('jsonwebtoken').sign({
      sub: 'forged', email: 'forged@example.com', email_verified: true, iss: 'https://accounts.google.com',
    }, 'attacker-key');
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/google', payload: { idToken: forgedToken } });
    assert.equal(response.statusCode, 401);
    assert.equal(lookedUpUser, false);
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_ANDROID_CLIENT_ID;
    const missingConfig = await app.inject({ method: 'POST', url: '/api/v1/auth/google', payload: { idToken: forgedToken } });
    assert.equal(missingConfig.statusCode, 503);
    process.env.GOOGLE_CLIENT_ID = 'expected-web-client';
    OAuth2Client.prototype.verifyIdToken = async () => ({ getPayload: () => ({ sub: 'user', email: 'unverified@example.com', email_verified: false }) });
    const unverified = await app.inject({ method: 'POST', url: '/api/v1/auth/google', payload: { idToken: 'token' } });
    assert.equal(unverified.statusCode, 401);
    assert.equal(lookedUpUser, false);
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerify;
    if (originalClient === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = originalClient;
    if (originalAndroid === undefined) delete process.env.GOOGLE_ANDROID_CLIENT_ID; else process.env.GOOGLE_ANDROID_CLIENT_ID = originalAndroid;
    await app.close();
  }
});
