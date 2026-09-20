import axios from "axios";

export const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "";

export const http = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  withCredentials: true, // send the httpOnly refresh cookie
});

// The access token lives only in memory: it disappears on reload (the refresh cookie restores it)
// and is not reachable by an XSS payload reading localStorage.
let accessToken = null;
let onSessionExpired = () => {};

export const setAccessToken = (token) => {
  accessToken = token;
};
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

http.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Several requests can fail at once with 401. They must share ONE refresh call,
// because refresh tokens are single-use (rotation) and a second call would be rejected.
let refreshPromise = null;

export function refreshSession() {
  refreshPromise ??= axios
    .post(`${API_ORIGIN}/api/auth/refresh`, null, { withCredentials: true })
    .then((res) => {
      accessToken = res.data.data.accessToken;
      return res.data.data;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

const isAuthEndpoint = (url = "") => url.startsWith("/auth/");

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const shouldRefresh = response?.status === 401 && config && !config._retried && !isAuthEndpoint(config.url);

    if (!shouldRefresh) return Promise.reject(error);

    config._retried = true;
    try {
      await refreshSession();
    } catch (refreshError) {
      // Only a rejected refresh token means the session is really over. A network blip or a server
      // error while refreshing must not log the user out; they can simply try again.
      if (refreshError.response?.status === 401) {
        accessToken = null;
        onSessionExpired();
      }
      return Promise.reject(error);
    }
    return http(config);
  },
);
