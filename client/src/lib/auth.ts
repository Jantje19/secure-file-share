import localforage from 'localforage';

import { makeApiRequest } from './api';
import CryptoStore, { fromHexString, toHexString } from './crypto';

const store = localforage.createInstance({
  storeName: 'user',
});

type Account = { username: string; id: string };

export const register = async (username: string) => {
  const keys = await CryptoStore.generateKeys();

  try {
    const id = await makeApiRequest<string>('/register', {
      method: 'POST',
      body: {
        encryptionKey: keys.encryption,
        signingKey: keys.signing,
        username,
      },
    });

    await store.setItem<Account>('account', { username, id });
  } catch (err) {
    await CryptoStore.reset();

    throw err;
  }
};

export const getAuthToken = () => {
  return store.getItem('authToken');
};

export const login = async () => {
  const existingToken = await getAuthToken();

  if (existingToken) {
    return;
  }

  const [crypto, account] = await Promise.all([CryptoStore.init(), store.getItem<Account>('account')]);

  if (!crypto) {
    throw new Error('No store!');
  }

  if (!account) {
    throw new Error('No account!');
  }

  const hexToken = await makeApiRequest<string>('/login-token', {
    method: 'POST',
    body: {
      id: account.id,
    },
  });

  const token = fromHexString(hexToken);
  const signature = await crypto.sign(token);

  const authToken = await makeApiRequest<string>('/login', {
    method: 'POST',
    body: {
      signature: toHexString(signature),
      id: account.id,
    },
  });

  await store.setItem('authToken', authToken);
};

export const getCurrentUser = () => store.getItem<Account>('account');
