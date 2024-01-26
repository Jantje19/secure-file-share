import { SnackbarProvider } from 'notistack';
import React from 'react';

import { login } from '../lib/auth';
import CryptoStore from '../lib/crypto';
import usePromise from '../lib/usePromise';

import Main from './Main';
import Setup from './Setup';
import ErrorMessage from './base/ErrorMessage';
import Loader from './base/Loader';

function App(): React.JSX.Element {
  const {
    loading,
    data: hasKeys,
    error,
    exec,
  } = usePromise(async () => {
    if (!(await CryptoStore.hasKeys())) {
      return false;
    }

    await login();

    return true;
  }, []);

  const content = (() => {
    if (loading) {
      return (
        <div className="flex items-center justify-center size-full">
          <Loader />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center size-full">
          <ErrorMessage>{error}</ErrorMessage>
        </div>
      );
    }

    return hasKeys ? <Main /> : <Setup onClose={exec} />;
  })();

  return (
    <>
      <SnackbarProvider />
      <div className="bg-white text-black dark:text-white dark:bg-zinc-800 size-full">{content}</div>
    </>
  );
}

export default App;
