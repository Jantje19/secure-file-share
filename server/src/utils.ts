import { readdir, unlink } from 'fs/promises';
import { join } from 'path';

import { clearFiles as clearDbFiles, removeFile } from './db.ts';

const baseDir = './files';

export const clearFiles = async () => {
  const files = await readdir(baseDir);

  await Promise.all(
    files.map(async (fileId): Promise<void> => {
      await removeFile(fileId);
      await unlink(join(baseDir, fileId));
    })
  );

  await clearDbFiles();
};
