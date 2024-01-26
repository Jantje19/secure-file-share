import { webcrypto, JsonWebKey } from 'crypto';

import { open } from 'sqlite';
import sqlite3 from 'sqlite3';

const db = await open({
  mode: sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE,
  driver: sqlite3.Database,
  filename: './db.sqlite',
});

await Promise.all([
  db.run(`
		CREATE TABLE IF NOT EXISTS users (
			id varchar(255) PRIMARY KEY,
			name varchar(255) NOT NULL UNIQUE,
			encryptionKey varchar(255) NOT NULL,
			signingKey varchar(255) NOT NULL
		)
	`),
  db.run(`
		CREATE TABLE IF NOT EXISTS user_tokens (
			token varchar(255) PRIMARY KEY,
			userId varchar(255) NOT NULL,
			createdAt timestamp NOT NULL,
			FOREIGN KEY(userId) REFERENCES users(id)
		)
	`),
  db.run(`
		CREATE TABLE IF NOT EXISTS files (
			id varchar(255) PRIMARY KEY,
			name blob NOT NULL,
      type blob NULL,
      originalSize int NULL,
			createdAt timestamp NOT NULL,
      senderUserId varchar(255) NOT NULL,
      receiverUserId varchar(255) NOT NULL,
      FOREIGN KEY(senderUserId) REFERENCES users(id),
      FOREIGN KEY(receiverUserId) REFERENCES users(id)
		)
	`),
]);

export type User = {
  id: string;
  name: string;
  encryptionKey: JsonWebKey;
  signingKey: JsonWebKey;
};

export type File = {
  id: string;
  name: Buffer;
  type: Buffer;
  createdAt: Date;
  originalSize: number;
  senderUserId: string;
  receiverUserId: string;
};

const formatUser = (dbResult: Omit<User, 'encryptionKey' | 'signingKey'> & { encryptionKey: string; signingKey: string }): User => {
  return {
    ...dbResult,
    encryptionKey: JSON.parse(dbResult.encryptionKey),
    signingKey: JSON.parse(dbResult.signingKey),
  };
};

const formatFile = (file: Omit<File, 'createdAt'> & { createdAt: string }) => ({ ...file, createdAt: new Date(file.createdAt) });

export const createUser = async (user: Omit<User, 'id'>): Promise<string> => {
  const id = webcrypto.randomUUID();

  const statement = await db.prepare(
    'INSERT INTO users (id, name, encryptionKey, signingKey) VALUES (?, ?, ?, ?)',
    id,
    user.name,
    JSON.stringify(user.encryptionKey),
    JSON.stringify(user.signingKey)
  );
  await statement.run();

  return id;
};

export const getUserById = async (id: string): Promise<User | null> => {
  const statement = await db.prepare('SELECT * FROM users WHERE id = ?', id);
  const result = await statement.get();

  if (!result) {
    return null;
  }

  return formatUser(result);
};

export const getUserByAuthToken = async (token: string): Promise<User | null> => {
  const statement = await db.prepare('SELECT * FROM user_tokens WHERE token = ?', token);
  const result = await statement.get();

  if (!result) {
    return null;
  }

  return getUserById(result.userId);
};

export const generateAuthToken = async (userId: string): Promise<string> => {
  const token = Buffer.from(webcrypto.getRandomValues(new Uint8Array(12))).toString('hex');

  const statement = await db.prepare('INSERT INTO user_tokens (token, userId, createdAt) VALUES (?, ?, CURRENT_TIMESTAMP)', token, userId);
  await statement.run();

  return token;
};

export const getUsers = async (): Promise<User[]> => {
  const users = await db.all('SELECT * FROM users');

  return users.map((user) => formatUser(user));
};

export const getFilesForUser = async (receiverUserId: string): Promise<File[]> => {
  const files = await db.all('SELECT * FROM files WHERE receiverUserId = ?', receiverUserId);

  return files.map(formatFile);
};

export const storeFile = async (file: Omit<File, 'createdAt'>) => {
  const statement = await db.prepare(
    `
    INSERT INTO files
      (id, name, type, originalSize, senderUserId, receiverUserId, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    file.id,
    file.name,
    file.type,
    file.originalSize,
    file.senderUserId,
    file.receiverUserId
  );

  await statement.run();
};

export const getFileById = async (fileId: string) => {
  const statement = await db.prepare('SELECT * FROM files WHERE id = ?', fileId);
  const file = await statement.get();

  if (!file) {
    return null;
  }

  return formatFile(file);
};

export const removeFile = async (id: string) => {
  const statement = await db.prepare('DELETE FROM files WHERE id = ?', id);

  await statement.run();
};

export const clearFiles = async () => {
  await db.run('DELETE FROM files');
};
