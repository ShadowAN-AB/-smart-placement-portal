const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const TOKEN_KEY = 'spp_token';

export const apiRequest = async (path, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isNoContent = response.status === 204 || response.status === 205;
  const rawBody = isNoContent ? '' : await response.text();

  let data = null;
  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch (_error) {
      data = null;
    }
  }

  if (!response.ok) {
    const message =
      data?.message ||
      (rawBody && rawBody.trim()) ||
      `Request failed: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  if (isNoContent) {
    return null;
  }

  return data ?? rawBody ?? null;
};
