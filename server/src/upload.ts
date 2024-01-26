import { webcrypto } from 'crypto';
import { createReadStream } from 'fs';
import { unlink, stat, writeFile } from 'fs/promises';

import multer from '@koa/multer';
import Router from '@koa/router';
import { isObject, isString } from 'validata';
import { body } from 'validata-koa';

import { validateAuth } from './auth.ts';
import { getFileById, getUserById, removeFile, storeFile } from './db.ts';

const upload = multer();

const signatureAlgorithm = {
  name: 'ECDSA',
  namedCurve: 'P-256',
  hash: {
    name: 'SHA-512',
  },
};

const verifySignature = async (data: Buffer, key: webcrypto.CryptoKey) => {
  const [signature, dataBlob] = [data.subarray(0, 64), data.subarray(64)];

  return webcrypto.subtle.verify(signatureAlgorithm, key, signature, dataBlob);
};

export default (router: Router) => {
  router.post(
    '/upload',
    validateAuth(),
    upload.fields([
      {
        name: 'originalSize',
        maxCount: 1,
      },
      {
        name: 'receiver',
        maxCount: 1,
      },
      {
        name: 'type',
        maxCount: 1,
      },
      {
        name: 'file',
        maxCount: 1,
      },
    ]),
    async (ctx) => {
      const { file: files } = ctx.files as { file?: multer.File[] };
      const {
        receiver: receiverUserId,
        type: rawType,
        originalSize,
      } = body(
        ctx,
        isObject({
          originalSize: isString({ trim: 'both', minLength: 1 }),
          receiver: isString({ trim: 'both', minLength: 1 }),
          type: isString({ trim: 'both', minLength: 1 }),
        })
      );

      const file = files ? files[0] : null;

      if (!file) {
        ctx.status = 400;

        return;
      }

      const parsedOriginalSize = parseInt(originalSize, 10);

      if (Number.isNaN(originalSize)) {
        ctx.status = 400;

        return;
      }

      const receiver = await getUserById(receiverUserId);

      if (!receiver) {
        ctx.status = 400;

        return;
      }

      const name = Buffer.from(file.originalname, 'hex');
      const type = Buffer.from(rawType, 'hex');

      const key = await webcrypto.subtle.importKey('jwk', { ...ctx.user.signingKey, key_ops: ['verify'] }, signatureAlgorithm, false, [
        'verify',
      ]);

      const allValid = (await Promise.all([verifySignature(name, key), verifySignature(type, key), verifySignature(file.buffer, key)])).every(
        (result) => result === true
      );

      if (!allValid) {
        ctx.status = 400;
        ctx.body = 'Invalid signature';

        return;
      }

      const id = webcrypto.randomUUID();

      await writeFile(`./files/${id}`, file.buffer);

      await storeFile({
        originalSize: parsedOriginalSize,
        receiverUserId: receiver.id,
        senderUserId: ctx.user.id,
        name,
        type,
        id,
      });

      ctx.status = 200;
    }
  );

  router.get('/download/:fileId', validateAuth(), async (ctx): Promise<void> => {
    const { fileId } = ctx.params;

    if (!fileId || typeof fileId !== 'string') {
      ctx.status = 400;

      return;
    }

    const file = await getFileById(fileId);

    if (!file) {
      ctx.status = 404;

      return;
    }

    if (file.receiverUserId !== ctx.user.id) {
      ctx.status = 401;

      return;
    }

    const path = `./files/${fileId}`;

    const fileDetails = await stat(path).catch((err) => {
      if (err.code === 'ENOENT') {
        return null;
      }

      throw err;
    });

    if (!fileDetails) {
      ctx.status = 500;
      ctx.body = 'File not found on disk';

      return;
    }

    ctx.status = 200;
    ctx.set('Content-Length', fileDetails.size.toString());
    ctx.body = createReadStream(path);
  });

  router.post('/downloaded', validateAuth(), async (ctx) => {
    const { fileId } = body(
      ctx,
      isObject({
        fileId: isString({ minLength: 1, trim: 'both' }),
      })
    );

    const file = await getFileById(fileId);

    if (!file) {
      ctx.status = 404;

      return;
    }

    if (file.receiverUserId !== ctx.user.id) {
      ctx.status = 401;

      return;
    }

    await removeFile(file.id);
    await unlink(`./files/${file.id}`);

    ctx.status = 200;
  });

  return router;
};
