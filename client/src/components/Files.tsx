import { trackResponseProgress } from 'fetch-api-progress';
import React, { useState } from 'react';
import { RandomAvatar } from 'react-random-avatars';

import { makeAuthenticatedApiRequest } from '../lib/api';
import CryptoStore, { fromHexString } from '../lib/crypto';
import { saveFile } from '../lib/files';
import { toast } from '../lib/snackbar';
import usePromise from '../lib/usePromise';

import { User } from './Users';
import ErrorMessage from './base/ErrorMessage';
import Loader from './base/Loader';

export type FilesProps = {
  users: User[] | null;
  store: CryptoStore;
};

export const fileSizeFormatter = (() => {
  // https://tc39.es/ecma402/#table-sanctioned-single-unit-identifiers
  const formatters = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte', 'petabyte'].map(
    (unit) => new Intl.NumberFormat(navigator.language, { style: 'unit', unit, maximumFractionDigits: 1 })
  );

  return {
    format(value: number): string {
      let dividedValue = value;

      for (let i = 1; i < formatters.length; i++) {
        const newDividedValue = dividedValue / 1000;

        if (newDividedValue < 1) {
          return formatters[i - 1].format(dividedValue);
        }

        dividedValue = newDividedValue;
      }

      return formatters.at(-1)!.format(dividedValue);
    },
  };
})();

type FormattedFile = {
  id: string;
  sender: User;
  from: string;
  name: string;
  type: string | null;
  date: string;
  size: string | null;
  createdAt: Date;
};

function FileEntry({ file, store, refresh }: { file: FormattedFile; store: CryptoStore; refresh: () => void }) {
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    (async () => {
      const response = await makeAuthenticatedApiRequest(`/download/${file.id}`, { method: 'GET', rawResponse: true });
      const trackedResponse = trackResponseProgress(response, (progress) => {
        const total = progress.total;

        if (!total) {
          return;
        }

        setDownloadProgress((progress.loaded / total) * 100);
      });

      const buffer = await trackedResponse.arrayBuffer();
      const decryptedFile = await store.decrypt(new Uint8Array(buffer), file.sender.signingKey);

      const fileObject = new File([decryptedFile], file.name, { type: file.type ?? undefined, lastModified: file.createdAt.getTime() });

      if (await saveFile(fileObject)) {
        toast('File save successfully', { variant: 'success' });
        makeAuthenticatedApiRequest('/downloaded', { method: 'POST', body: { fileId: file.id } })
          .then(refresh)
          .catch(console.error);
      }
    })()
      .catch((err) => {
        console.error(err);
        toast(err);
      })
      .finally(() => {
        setDownloadProgress(0);
        setLoading(false);
      });
  };

  return (
    <tr
      onClick={!loading ? handleClick : undefined}
      tabIndex={loading ? -1 : 0}
      aria-disabled={loading}
      onKeyDown={(e) => {
        if (e.code === 'Enter' && !loading) {
          handleClick();
        }
      }}
      className={`
        cursor-pointer relative overflow-hidden
        hover:bg-black/10 dark:hover:bg-white/10
        aria-[disabled=true]:pointer-events-none aria-[disabled=true]:opacity-85
      `}
    >
      <td className="p-2 flex gap-4 items-center">
        <RandomAvatar name={file.from} size={30} />
        {file.from}
      </td>
      <td className="p-2 font-bold">{file.name}</td>
      <td className="p-2" align="right">
        {file.size || '?'}
      </td>
      <td className="p-2" align="right">
        {file.type || '?'}
      </td>
      <td className="p-2" align="right">
        {file.date}
      </td>

      {loading && (
        <div className="absolute bottom-0 left-0 mt-2 w-full overflow-hidden">
          <div
            className="w-full h-1 bg-primary-dark rounded-full -translate-x-full transition-transform"
            style={{ transform: `translateX(-${100 - downloadProgress}%)` }}
          />
        </div>
      )}
    </tr>
  );
}

function Files({ users, store }: FilesProps): React.JSX.Element {
  const {
    data,
    loading: dataLoading,
    error: dataError,
    exec: refresh,
  } = usePromise(
    () =>
      makeAuthenticatedApiRequest<
        { id: string; name: string; createdAt: string; senderUserId: string; receiverUserId: string; type?: string; originalSize?: number }[]
      >('/files'),
    []
  );

  const {
    data: files,
    loading,
    error,
  } = usePromise(async () => {
    const textDecoder = new TextDecoder();

    const results = await Promise.all(
      Array.isArray(data)
        ? data.map<Promise<FormattedFile | null>>(async (file) => {
            const sender = users?.find((user) => user.id === file.senderUserId);

            if (!sender) {
              return null;
            }

            const [rawName, rawType] = await Promise.all([
              store.decrypt(fromHexString(file.name), sender.signingKey),
              file.type ? store.decrypt(fromHexString(file.type), sender.signingKey) : null,
            ]);

            const createdAt = new Date(file.createdAt);

            return {
              id: file.id,
              sender,
              createdAt,
              from: sender.name,
              name: textDecoder.decode(rawName),
              date: createdAt.toLocaleString('nl-NL'),
              type: rawType ? textDecoder.decode(rawType) : null,
              size: file.originalSize ? fileSizeFormatter.format(file.originalSize) : null,
            };
          })
        : []
    );

    return results.filter((file): file is FormattedFile => !!file);
  }, [data, store, users]);

  if (dataLoading || loading) {
    return <Loader />;
  }

  if (dataError) {
    return <ErrorMessage>{dataError}</ErrorMessage>;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!files || files.length <= 0) {
    return <p>No data</p>;
  }

  return (
    <table className="w-full">
      <tbody>
        {files.map((file) => (
          <FileEntry key={file.id} file={file} store={store} refresh={refresh} />
        ))}
      </tbody>
    </table>
  );
}

export default Files;
