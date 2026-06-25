import { useState, useEffect, useCallback } from 'react';

const BASE = '/api';

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export function useApi(endpoint, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!endpoint);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    apiFetch(endpoint)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [endpoint]);

  useEffect(() => {
    if (!endpoint) {
      setData(null);
      setLoading(false);
      return;
    }
    refetch();
  }, [refetch, ...deps]);

  return { data, loading, error, refetch };
}

export const api = {
  get: (endpoint) => apiFetch(endpoint),
  post: (endpoint, body) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: (endpoint, body) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (endpoint, body) => apiFetch(endpoint, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (endpoint) => apiFetch(endpoint, { method: 'DELETE' }),
};
