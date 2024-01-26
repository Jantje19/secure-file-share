import { Middleware, RouterContext } from '@koa/router';
import { DefaultState } from 'koa';

import { User, getUserByAuthToken } from './db.ts';

export const validateAuth = (): Middleware<DefaultState, RouterContext & { user: User }> => async (ctx, next) => {
  const { authorization } = ctx.headers;

  if (!authorization || !authorization.startsWith('Bearer ')) {
    ctx.status = 401;

    return undefined;
  }

  const [, token] = authorization.split(' ');

  if (!token) {
    ctx.status = 401;

    return undefined;
  }

  const user = await getUserByAuthToken(token);

  if (!user) {
    ctx.status = 401;

    return undefined;
  }

  ctx.user = user;

  return next();
};
