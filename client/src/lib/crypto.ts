import localforage from 'localforage';

const store = localforage.createInstance({
  storeName: 'crypto',
});

const asymmetricEncryptionAlgorithm = Object.freeze({
  name: 'RSA-OAEP',
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-512',
});
const symmetricEncryptionAlgorithm = Object.freeze({
  name: 'AES-GCM',
  length: 256,
});
const signatureAlgorithm = Object.freeze({
  name: 'ECDSA',
  namedCurve: 'P-256',
  hash: {
    name: 'SHA-512',
  },
});

const encryptedDataKeyLength = 512;
const signatureLength = 64;
const ivLength = 12;

const concatArrayBuffers = (...buffers: ArrayBuffer[]): Uint8Array => {
  const outputBuffer = new Uint8Array(buffers.reduce((acc, buffer) => acc + buffer.byteLength, 0));

  let offset = 0;
  buffers.forEach((buffer) => {
    outputBuffer.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  });

  return outputBuffer;
};

const sliceArrayBuffers = (buffer: Uint8Array, lengths: number[]): Uint8Array[] => {
  const outputArray: Uint8Array[] = [];

  let lastOffset = 0;
  lengths.forEach((length) => {
    outputArray.push(buffer.slice(lastOffset, lastOffset + length));
    lastOffset += length;
  });

  outputArray.push(buffer.slice(lastOffset));

  return outputArray;
};

export const toHexString = (bytes: Uint8Array) => bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');

export const fromHexString = (hexString: string) => {
  const matches = hexString.match(/.{1,2}/g);

  if (!matches) {
    throw new Error('Invalid hex data');
  }

  return Uint8Array.from(matches.map((byte) => parseInt(byte, 16)));
};

export default class CryptoStore {
  private static instance?: CryptoStore;

  #encryptionKey: CryptoKey;
  #signingKey: CryptoKey;

  private constructor(encryptionKey: CryptoKey, signingKey: CryptoKey) {
    this.#encryptionKey = encryptionKey;
    this.#signingKey = signingKey;
  }

  async encrypt(data: ArrayBuffer, receiverPublicKey: JsonWebKey) {
    const [symmetricEncryptionKey, importedReceiverPublicKey] = await Promise.all([
      crypto.subtle.generateKey(symmetricEncryptionAlgorithm, true, ['encrypt']),
      crypto.subtle.importKey('jwk', receiverPublicKey, asymmetricEncryptionAlgorithm, false, ['encrypt']),
    ]);
    const exportedSymmetricEncryptionKey = await crypto.subtle.exportKey('raw', symmetricEncryptionKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(ivLength));
    const [encryptedData, encryptedDataKey] = await Promise.all([
      crypto.subtle.encrypt({ ...symmetricEncryptionAlgorithm, iv }, symmetricEncryptionKey, data),
      crypto.subtle.encrypt(asymmetricEncryptionAlgorithm, importedReceiverPublicKey, exportedSymmetricEncryptionKey),
    ]);
    const dataBlob = concatArrayBuffers(encryptedDataKey, iv, encryptedData);
    const signature = await crypto.subtle.sign(signatureAlgorithm, this.#signingKey, dataBlob);

    return concatArrayBuffers(signature, dataBlob);
  }

  async decrypt(data: Uint8Array, senderKey: JsonWebKey) {
    const [signature, dataBlob] = sliceArrayBuffers(data, [signatureLength]);
    const importedSenderKey = await crypto.subtle.importKey('jwk', { ...senderKey, key_ops: ['verify'] }, signatureAlgorithm, false, [
      'verify',
    ]);

    // We don't actually need to check this, since we trust that the server does this
    const signatureValid = await crypto.subtle.verify(signatureAlgorithm, importedSenderKey, signature, dataBlob);

    if (!signatureValid) {
      throw new Error('Invalid signature');
    }

    const [encryptedDataKey, iv, encryptedData] = sliceArrayBuffers(dataBlob, [encryptedDataKeyLength, ivLength]);
    const decryptedKey = await crypto.subtle.decrypt(asymmetricEncryptionAlgorithm, this.#encryptionKey, encryptedDataKey);
    const importedKey = await crypto.subtle.importKey('raw', decryptedKey, symmetricEncryptionAlgorithm, false, ['decrypt']);

    return crypto.subtle.decrypt({ ...symmetricEncryptionAlgorithm, iv }, importedKey, encryptedData);
  }

  async sign(data: Uint8Array) {
    const buffer = await crypto.subtle.sign(signatureAlgorithm, this.#signingKey, data);

    return new Uint8Array(buffer);
  }

  static async hasKeys() {
    const [rawEncryptionKey, rawSigningKey] = await Promise.all([
      store.getItem<JsonWebKey>('encryptionKey'),
      store.getItem<JsonWebKey>('signingKey'),
    ]);

    return rawEncryptionKey && rawSigningKey;
  }

  static async init(): Promise<CryptoStore | null> {
    if (CryptoStore.instance) {
      return CryptoStore.instance;
    }

    const [rawEncryptionKey, rawSigningKey] = await Promise.all([
      store.getItem<JsonWebKey>('encryptionKey'),
      store.getItem<JsonWebKey>('signingKey'),
    ]);

    if (!rawEncryptionKey || !rawSigningKey) {
      return null;
    }

    const [encryptionKey, signingKey] = await Promise.all([
      crypto.subtle.importKey('jwk', rawEncryptionKey, asymmetricEncryptionAlgorithm, false, ['decrypt']),
      crypto.subtle.importKey('jwk', rawSigningKey, signatureAlgorithm, false, ['sign']),
    ]);

    CryptoStore.instance = new CryptoStore(encryptionKey, signingKey);

    return CryptoStore.instance;
  }

  static async generateKeys() {
    if (await CryptoStore.hasKeys()) {
      throw new Error('Already has keys!');
    }

    const [rsaKeys, ecdsaKey] = await Promise.all([
      crypto.subtle.generateKey(asymmetricEncryptionAlgorithm, true, ['encrypt', 'decrypt']),
      crypto.subtle.generateKey(signatureAlgorithm, true, ['sign']),
    ]);

    const [exportedPrivateEncryptionKey, exportedPublicEncryptionKey, exportedPrivateSigningKey, exportedPublicSigningKey] = await Promise.all([
      crypto.subtle.exportKey('jwk', rsaKeys.privateKey),
      crypto.subtle.exportKey('jwk', rsaKeys.publicKey),
      crypto.subtle.exportKey('jwk', ecdsaKey.privateKey),
      crypto.subtle.exportKey('jwk', ecdsaKey.publicKey),
    ]);

    await Promise.all([store.setItem('encryptionKey', exportedPrivateEncryptionKey), store.setItem('signingKey', exportedPrivateSigningKey)]);

    return { encryption: exportedPublicEncryptionKey, signing: exportedPublicSigningKey };
  }

  static async reset() {
    await Promise.all([store.removeItem('encryptionKey'), store.removeItem('signingKey')]);
  }
}
