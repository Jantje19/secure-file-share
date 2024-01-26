import isPlainObject from 'lodash.isplainobject';

import { getAuthToken } from './auth';

export const baseUrl = 'http://localhost:3000/api';

type Init = Omit<RequestInit, 'method' | 'body'> & ({ method: 'GET' } | { method: 'POST'; body: BodyInit | Record<string, unknown> });

export const makeApiRequest = async <T, RawResponse extends boolean = false>(
  path: string,
  init: Init & { rawResponse?: RawResponse } = { method: 'GET' }
): Promise<RawResponse extends true ? Response : string | T> => {
  type ReturnType = RawResponse extends true ? Response : string | T;

  const isObject = init.method === 'POST' ? isPlainObject(init.body) : false;
  const headers = new Headers(init.headers);

  if (init.method === 'POST' && isObject) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(
    baseUrl + path,
    init.method === 'GET'
      ? init
      : {
          ...init,
          body: isObject ? JSON.stringify(init.body) : (init.body as BodyInit),
          headers,
        }
  );

  if (!response.ok) {
    const text = await response.text();

    throw new Error(text ? `${response.statusText}: ${text}` : response.statusText);
  }

  if (init.rawResponse === true) {
    return response as ReturnType;
  }

  const text = await response.text();

  const json = (() => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  })();

  if (json) {
    return json as ReturnType;
  }

  return text as ReturnType;
};

export const makeAuthenticatedApiRequest = async <T, RawResponse extends boolean = false>(
  path: string,
  init: Init & { rawResponse?: RawResponse } = { method: 'GET' }
) => {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  return makeApiRequest<T, RawResponse>(path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
};
