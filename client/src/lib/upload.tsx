import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import { User } from '../components/Users';

import { OpenedFile } from './files';

const UploadFilesContext = createContext<{
  files: { file: OpenedFile; user: User }[];
  addFiles: (files: OpenedFile[], user: User) => void;
  removeFile: (id: string) => void;
}>({
  files: [],
  addFiles: () => {
    throw new Error('Not yet initialized');
  },
  removeFile: () => {
    throw new Error('Not yet initialized');
  },
});

export const useUploadFiles = () => {
  const { files, removeFile } = useContext(UploadFilesContext);

  return useMemo(() => ({ files, onFinish: removeFile }), [files, removeFile]);
};

export const useAddUploadFiles = () => {
  const { addFiles } = useContext(UploadFilesContext);

  return addFiles;
};

export function UploadFilesProvider({ children }: { children: ReactNode }) {
  const [files, setFiles] = useState<{ user: User; file: OpenedFile }[]>([]);

  const addFiles = useCallback(
    (newFiles: OpenedFile[], user: User) => setFiles((prev) => [...prev, ...newFiles.map((file) => ({ file, user }))]),
    []
  );

  const removeFile = useCallback((id: string) => setFiles((prev) => prev.filter((entry) => entry.file.id !== id)), []);

  const value = useMemo(() => ({ files, addFiles, removeFile }), [addFiles, files, removeFile]);

  return <UploadFilesContext.Provider value={value}>{children}</UploadFilesContext.Provider>;
}
