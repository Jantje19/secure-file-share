import React, { FormEvent, useState } from 'react';

import { register } from '../lib/auth';
import { toast } from '../lib/snackbar';

import Button from './base/Button';
import Input from './base/Input';
import Loader from './base/Loader';

export type SetupProps = {
  onClose: () => void;
};

function Setup({ onClose }: SetupProps): React.JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const username = data.get('username');

    if (!username || typeof username !== 'string') {
      return;
    }

    setLoading(true);
    register(username)
      .then(() => onClose())
      .catch((err) => {
        console.error(err);
        toast(err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="flex flex-col items-center justify-center size-full">
      <h1 className="text-6xl mb-11 font-bold">Sign up</h1>
      <form className="flex flex-col items-center justify-center gap-6" onSubmit={handleSubmit}>
        <Input label="Username" name="username" type="text" />
        <Button type="submit" className="flex items-center gap-4" disabled={loading}>
          {loading && <Loader className="w-5 h-5" />}
          Create account
        </Button>
      </form>
    </div>
  );
}

export default Setup;
