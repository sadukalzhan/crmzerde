import axios from 'axios';

// В деве VITE_API_URL=http://localhost:4000; в проде (один сервис на Render) —
// пусто, значит относительный путь (тот же домен, что и фронтенд).
export const API_URL = import.meta.env.VITE_API_URL ?? '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
});

const TOKEN_KEY = 'crm_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && getToken()) {
      setToken(null);
      // Жёсткий редирект, чтобы сбросить состояние при истёкшей сессии.
      if (!location.pathname.startsWith('/login')) location.href = '/login';
    }
    return Promise.reject(error);
  },
);

/** Достаёт человекочитаемое сообщение об ошибке из ответа API. */
export function apiError(error: unknown, fallback = 'Произошла ошибка'): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || error.message || fallback;
  }
  return fallback;
}

/** Абсолютный URL файла (для скачивания через защищённый эндпоинт). */
/**
 * Скачивание защищённого файла. Обычная ссылка <a href> сюда не годится:
 * браузер не шлёт заголовок Authorization, и сервер отвечает 401. Поэтому
 * забираем файл запросом с токеном и отдаём его как blob.
 */
export async function downloadFile(fileUrl: string, filename: string): Promise<void> {
  // fileUrl приходит как /api/files/..., а базовый адрес axios уже содержит /api.
  const path = fileUrl.replace(/^\/api/, '');
  const res = await api.get(path, { responseType: 'blob' });
  const objectUrl = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
