import { useCallback, useEffect, useState } from "react";
import { parseApiError } from "../utils/format.js";

// Runs `fetcher` whenever `deps` change and tracks loading / error state.
// The `ignore` flag stops a slow, outdated response from overwriting a newer one (race condition).
export function useFetch(fetcher, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcher()
      .then((data) => !ignore && setState({ data, loading: false, error: null }))
      .catch((err) => !ignore && setState({ data: null, loading: false, error: parseApiError(err).message }));

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  return { ...state, reload };
}
