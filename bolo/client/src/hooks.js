import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

export function useApi(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(() => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true }));
    api(path).then((data) => setState({ data, error: null, loading: false })).catch((error) => setState({ data: null, error, loading: false }));
  }, [path]);
  useEffect(load, [load, ...deps]);
  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) };
}

export function useToast() {
  const [msg, setMsg] = useState(null);
  const show = (m) => { setMsg(m); setTimeout(() => setMsg(null), 3500); };
  return [msg, show];
}
