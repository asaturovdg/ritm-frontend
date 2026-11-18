import { useCallback, useEffect, useState } from 'react';

export function useResource(load, { refreshOnFocus = true, keepPreviousData = false } = {}) {
  const [version, setVersion] = useState(0);
  const [result, setResult] = useState({ data: null, error: null, loading: true, load: null, version: -1 });
  const reload = useCallback(() => setVersion(v => v + 1), []);
  useEffect(() => {
    let active = true;
    load().then(data => { if (active) setResult({ data, error: null, loading: false, load, version }); })
      .catch(error => { if (active && error.name !== 'AbortError') setResult(previous => ({ data: keepPreviousData && previous.load === load ? previous.data : null, error, loading: false, load, version })); });
    return () => { active = false; };
  }, [load, version, keepPreviousData]);
  useEffect(() => {
    if (!refreshOnFocus) return;
    const onFocus = () => { if (document.visibilityState === 'visible') reload(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [reload, refreshOnFocus]);
  return { ...(result.load === load && result.version === version ? result : { data: keepPreviousData && result.load === load ? result.data : null, error: null, loading: true }), reload };
}
