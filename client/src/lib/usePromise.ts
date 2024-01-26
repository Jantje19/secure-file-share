import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default <T>(cb: () => Promise<T>, deps: unknown[] = []) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const isFetching = useRef(false);

  const exec = useCallback(() => {
    if (loading || isFetching.current) {
      return;
    }

    isFetching.current = true;

    setLoading(true);
    setError(null);
    cb()
      .then((result) => setData(result))
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        isFetching.current = false;
        setLoading(false);
      });
  }, [cb, loading]);

  useEffect(() => {
    exec();
  }, deps);

  return useMemo(() => ({ loading, error, data, exec }), [data, error, exec, loading]);
};
