import { webcrypto } from 'crypto';

import Router from '@koa/router';
import { isObject, isString, maybeString } from 'validata';
import { body, validate } from 'validata-koa';

import { validateAuth } from './auth.ts';
import { createUser, generateAuthToken, getFilesForUser, getUserById, getUsers } from './db.ts';
import handleUploads from './upload.ts';

export default () => {
  const router = new Router({
    prefix: '/api',
  });

  const signInRequestTokens = new Map<string, { token: Buffer; createdAt: Date }>();

  router.post('/register', validate(), async (ctx) => {
    const jwkValidator = isObject(
      {
        crv: maybeString(),
        d: maybeString(),
        dp: maybeString(),
        dq: maybeString(),
        e: maybeString(),
        k: maybeString(),
        kty: maybeString(),
        n: maybeString(),
        p: maybeString(),
        q: maybeString(),
        qi: maybeString(),
        x: maybeString(),
        y: maybeString(),
      },
      { ignoreExtraProperties: true }
    );

    const { username, encryptionKey, signingKey } = body(
      ctx,
      isObject({
        username: isString({ trim: 'both', minLength: 1 }),
        encryptionKey: jwkValidator,
        signingKey: jwkValidator,
      })
    );

    const newId = await createUser({
      name: username,
      encryptionKey,
      signingKey,
    });

    ctx.body = newId;
  });

  router.post('/login-token', validate(), async (ctx) => {
    const { id } = body(
      ctx,
      isObject({
        id: isString({ trim: 'both', minLength: 1 }),
      })
    );

    const user = await getUserById(id);

    if (!user) {
      ctx.status = 404;

      return;
    }

    const existing = signInRequestTokens.get(user.id);

    if (existing && Date.now() - existing.createdAt.getTime() < 1000 * 60 * 5) {
      ctx.body = existing.token;

      return;
    }

    const token = Buffer.from(webcrypto.getRandomValues(new Uint8Array(12)));

    signInRequestTokens.set(user.id, { token, createdAt: new Date() });

    ctx.body = token.toString('hex');
  });

  router.post('/login', validate(), async (ctx) => {
    const { id, signature } = body(
      ctx,
      isObject({
        signature: isString({ trim: 'both', minLength: 1 }),
        id: isString({ trim: 'both', minLength: 1 }),
      })
    );

    const user = await getUserById(id);

    if (!user) {
      ctx.status = 404;

      return;
    }

    const signInTokenEntry = signInRequestTokens.get(user.id);

    if (!signInTokenEntry) {
      ctx.status = 404;

      return;
    }

    signInRequestTokens.delete(user.id);

    if (Date.now() - signInTokenEntry.createdAt.getTime() >= 1000 * 60 * 5) {
      ctx.status = 400;
      ctx.body = 'Expired';

      return;
    }

    const signatureAlgorithm = {
      name: 'ECDSA',
      namedCurve: 'P-256',
      hash: {
        name: 'SHA-512',
      },
    };

    const key = await webcrypto.subtle.importKey('jwk', { ...user.signingKey, key_ops: ['verify'] }, signatureAlgorithm, false, ['verify']);

    const isValid = await webcrypto.subtle.verify(signatureAlgorithm, key, Buffer.from(signature, 'hex'), signInTokenEntry.token);

    if (!isValid) {
      ctx.status = 400;
      ctx.body = 'Invalid signature';

      return;
    }

    ctx.body = await generateAuthToken(user.id);
  });

  router.get('/users', validateAuth(), async (ctx) => {
    ctx.body = await getUsers();
  });

  router.get('/files', validateAuth(), async (ctx) => {
    const files = await getFilesForUser(ctx.user.id);

    ctx.body = files.map((file) => ({
      ...file,
      name: file.name.toString('hex'),
      type: file.type.toString('hex'),
      createdAt: file.createdAt.toUTCString(),
    }));
  });

  return handleUploads(router);
};
