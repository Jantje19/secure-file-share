import React, { ReactNode, useMemo } from 'react';
import { RandomAvatar } from 'react-random-avatars';
import { twMerge } from 'tailwind-merge';

import { makeAuthenticatedApiRequest } from '../lib/api';
import CryptoStore from '../lib/crypto';
import { UploadFilesProvider } from '../lib/upload';
import usePromise from '../lib/usePromise';

import Files from './Files';
import UploadStatus from './UploadStatus';
import Users, { User } from './Users';
import ErrorMessage from './base/ErrorMessage';

function Section({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={twMerge(`border border-black dark:border-white rounded-xl p-6 overflow-y-auto ${className}`)}>
      <legend className="px-2 text-lg">{title}</legend>
      {children}
    </fieldset>
  );
}

function Main(): React.JSX.Element {
  const {
    data: promiseData,
    loading,
    error,
  } = usePromise(() => Promise.all([makeAuthenticatedApiRequest<User[]>('/users'), CryptoStore.init()]), []);

  const [data, store] = promiseData ?? [];

  const users = useMemo(() => (Array.isArray(data) ? data.toSorted((a, b) => a.name.localeCompare(b.name)) : null), [data]);

  if (!store) {
    return <ErrorMessage>{new Error('Not logged in')}</ErrorMessage>;
  }

  return (
    <UploadFilesProvider>
      {!('showSaveFilePicker' in window) && (
        <p className="fixed top-0 left-0 w-full p-2 bg-orange-600 text-white shadow-lg">
          Until your browser supports the File System Access API we cannot determine if the file was actually saved to disk. This means that it
          will be deleted as soon as you click it!
        </p>
      )}
      <div className="container mx-auto py-8 h-full flex flex-col">
        <div className="mx-auto">
          <RandomAvatar name="Bob" size={120} />
        </div>
        <h1 className="text-6xl font-bold pt-8 pb-12 text-center">Hello Bob</h1>
        <div className="grid grid-rows-2 grid-cols-none xl:grid-cols-2 xl:grid-rows-none gap-8 h-[80vh]">
          <Section title="Inbox">
            <Files users={users} store={store} />
          </Section>
          <Section title="Users" className="grid grid-cols-6 grid-rows-[auto] gap-4 align-top">
            <Users users={users} loading={loading} error={error} />
          </Section>
        </div>
      </div>
      <UploadStatus store={store} />
    </UploadFilesProvider>
  );
}

export default Main;
