/**
 * Lightweight fetch wrapper for the Concept Quest backend.
 */

const DEFAULT_BASE_URL = 'http://localhost:3001';

function getBaseUrl() {
  return process.env.REACT_APP_API_BASE_URL || DEFAULT_BASE_URL;
}

// PUBLIC_INTERFACE
export async function apiFetch(path, options = {}) {
  /** Fetch JSON from backend with basic error handling. */
  const url = `${getBaseUrl()}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message = (data && data.detail) || (data && data.message) || res.statusText || 'Request failed';
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
