import axios from 'axios';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { baseUrl } from '../lib/api';
import { getAuthToken } from '../lib/auth';
import CryptoStore, { toHexString } from '../lib/crypto';
import { OpenedFile } from '../lib/files';
import { useUploadFiles } from '../lib/upload';

import { fileSizeFormatter } from './Files';
import { User } from './Users';
import ErrorMessage from './base/ErrorMessage';
import Loader from './base/Loader';

export type UploadStatusProps = {
  store: CryptoStore;
};

const percentageFormatter = Intl.NumberFormat(navigator.language, { style: 'percent' });
const textEncoder = new TextEncoder();

function FileUploadStatus({ store, file, user, onFinish }: { store: CryptoStore; file: OpenedFile; user: User; onFinish: () => void }) {
  const [status, setStatus] = useState<'encrypting' | 'uploading' | 'uploaded'>('encrypting');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const ran = useRef(false);

  const formattedFileName = useMemo(() => `${file.name} (${fileSizeFormatter.format(file.size)})`, [file.name, file.size]);
  const formattedProgress = useMemo(() => percentageFormatter.format(progress ?? 0), [progress]);

  const startUpload = useCallback(() => {
    (async () => {
      setStatus('encrypting');
      const [name, type, content] = await Promise.all([
        store.encrypt(textEncoder.encode(file.name), user.encryptionKey),
        store.encrypt(textEncoder.encode(file.type), user.encryptionKey),
        store.encrypt(file.data, user.encryptionKey),
      ]);

      const encryptedFile = new File([content], toHexString(name), { type: toHexString(type) });
      const formData = new FormData();

      const token = await getAuthToken();

      if (!token) {
        throw new Error('Not authenticated');
      }

      setStatus('uploading');
      setProgress(0);

      formData.set('originalSize', file.size.toString());
      formData.set('type', toHexString(type));
      formData.set('file', encryptedFile);
      formData.set('receiver', user.id);

      const response = await axios.request({
        url: `${baseUrl}/upload`,
        data: formData,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressDetails) => {
          if (typeof progressDetails.progress === 'number') {
            setProgress(progressDetails.progress);
          }
        },
      });

      if (response.status !== 200) {
        throw new Error(response.statusText);
      }

      setStatus('uploaded');

      setTimeout(() => {
        onFinish();
      }, 2000);
    })().catch((err) => {
      console.error(err);
      setError(err);
    });
  }, [file.data, file.name, file.size, file.type, onFinish, store, user.encryptionKey, user.id]);

  useEffect(() => {
    if (ran.current) {
      return;
    }

    ran.current = true;
    startUpload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <label className="flex gap-2 flex-col items-start text-xs mt-3">
      <span className="flex items-center justify-between gap-2 w-full">
        <span className="max-w-80 overflow-hidden text-ellipsis whitespace-nowrap" title={formattedFileName}>
          {formattedFileName}
        </span>
        <span>
          {status !== 'uploading' && !error ? (
            <div className="flex items-center gap-2">
              {status !== 'uploaded' && <Loader className="w-3 h-3" />}
              {(() => {
                switch (status) {
                  case 'encrypting':
                    return 'Encrypting...';
                  case 'uploaded':
                    return 'Done';
                  default:
                    return null;
                }
              })()}
            </div>
          ) : (
            formattedProgress
          )}
        </span>
      </span>
      {error ? (
        <ErrorMessage className="w-full">{error}</ErrorMessage>
      ) : (
        <progress className="min-w-96 w-full rounded-full overflow-hidden" value={progress ? progress * 100 : 0} max={100}>
          {formattedProgress}
        </progress>
      )}
    </label>
  );
}

function UploadStatus({ store }: UploadStatusProps): React.JSX.Element {
  const [open, setOpen] = useState(true);

  const { files, onFinish } = useUploadFiles();

  const filesByUser = useMemo(() => Object.entries(Object.groupBy(files, ({ user }) => user.id)), [files]);
  const usersById = useMemo(
    () =>
      Object.groupBy(
        files.map(({ user }) => user),
        (user) => user.id
      ),
    [files]
  );

  if (files.length <= 0) {
    return <></>;
  }

  return (
    <div className="fixed bottom-2 right-2 py-4 px-6 bg-gray-200 dark:bg-zinc-900 shadow-lg">
      <div className="flex justify-between items-center gap-4">
        <p>Uploads</p>
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-full hover:bg-black/20 focus:bg-black/20 dark:hover:bg-white/20 dark:focus:bg-white/20"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" className={open ? 'rotate-180' : ''}>
            <path d="m296-345-56-56 240-240 240 240-56 56-184-184-184 184Z" fill="currentColor" />
          </svg>
        </button>
      </div>
      {open && (
        <ul className="max-h-[80svh] overflow-y-auto p-4">
          {filesByUser.map(([userId, entries]) => (
            <li className="mt-6" key={userId}>
              <p className="text-sm">{usersById[userId]![0].name}</p>
              <div>
                {entries?.map((entry) => (
                  <FileUploadStatus
                    onFinish={() => onFinish(entry.file.id)}
                    key={entry.file.id}
                    file={entry.file}
                    user={entry.user}
                    store={store}
                  />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UploadStatus;
