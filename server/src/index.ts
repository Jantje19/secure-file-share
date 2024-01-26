import Koa from 'koa';
import bodyParser from 'koa-bodyparser';

import api from './api.ts';
import { clearFiles } from './utils.ts';

const app = new Koa();
const router = api();

await clearFiles();

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;

    console.error(err);
    ctx.status = err.status || 500;
    ctx.body = err.message;
  }
});

app.use((ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
  ctx.set('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');

  return next();
});

app.use(bodyParser({ formLimit: '10Mb' }));
app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3000);
