import React, { useMemo, useState } from 'react';
import { RandomAvatar } from 'react-random-avatars';

import { getCurrentUser } from '../lib/auth';
import { openFilePicker } from '../lib/files';
import { toast } from '../lib/snackbar';
import { useAddUploadFiles } from '../lib/upload';
import usePromise from '../lib/usePromise';

import ErrorMessage from './base/ErrorMessage';
import Loader from './base/Loader';

export type User = { id: string; name: string; encryptionKey: JsonWebKey; signingKey: JsonWebKey };

export type UsersProps = {
  users: User[] | null;
  loading: boolean;
  error: Error | null;
};

function Users({ users: allUsers, loading, error }: UsersProps): React.JSX.Element {
  const [filesLoading, setFilesLoading] = useState(false);
  const { data: currentUser } = usePromise(() => getCurrentUser(), []);

  const users = useMemo(() => allUsers?.filter((user) => user.id !== currentUser?.id), [allUsers, currentUser?.id]);
  const addFiles = useAddUploadFiles();

  const handleClick = (user: User) => {
    setFilesLoading(true);
    (async () => {
      const files = await openFilePicker();

      if (files) {
        addFiles(files, user);
      }
    })()
      .catch((err) => {
        console.error(err);
        toast(err);
      })
      .finally(() => {
        setFilesLoading(false);
      });
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorMessage>{error}</ErrorMessage>;
  }

  if (!users || users.length <= 0) {
    return <p>No data</p>;
  }

  return (
    <>
      {users.map((user) => (
        <button
          key={user.id}
          disabled={filesLoading}
          onClick={() => handleClick(user)}
          className={`
            flex flex-col
            items-center gap-4 p-4 h-fit
            bg-slate-400/20 dark:bg-white/10
            disabled:pointer-events-none disabled:opacity-75
          `}
        >
          <div className="w-[60px]">
            <RandomAvatar name={user.name} size={60} />
          </div>
          <p className="text-center">{user.name}</p>
        </button>
      ))}
    </>
  );
}

export default Users;
