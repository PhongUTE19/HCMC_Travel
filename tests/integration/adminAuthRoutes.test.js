import assert from 'node:assert/strict';
import { test } from 'node:test';
import adminRouter from '../../server/src/routes/adminRoute.js';
import { errorHandler } from '../../server/src/shared/middleware/errorHandler.js';
import { setTokenVerifierForTests } from '../../server/src/shared/middleware/authenticate.js';

function dispatch({ headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = { method: 'GET', url: '/not-a-real-admin-resource', originalUrl: '/api/admin/not-a-real-admin-resource', headers, query: {}, params: {} };
    const res = {
      headersSent: false,
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { this.headersSent = true; resolve({ status: this.statusCode, payload }); },
    };
    adminRouter.handle(req, res, (error) => {
      if (!error) return resolve({ status: res.statusCode });
      errorHandler(error, req, res, reject);
    });
  });
}

test('legacy admin routes require a verified admin role', { concurrency: false }, async (t) => {
  t.after(() => setTokenVerifierForTests(null));

  setTokenVerifierForTests(async () => null);
  const unauthenticated = await dispatch();
  assert.equal(unauthenticated.status, 401);

  setTokenVerifierForTests(async () => ({ id: 'user-1', app_metadata: { role: 'user' } }));
  const ordinaryUser = await dispatch({ headers: { authorization: 'Bearer ordinary-user-token' } });
  assert.equal(ordinaryUser.status, 403);
});
