/** When true, JWTs live in httpOnly cookies — not localStorage. */
export const AUTH_USE_COOKIES =
  String(import.meta.env.VITE_AUTH_USE_COOKIES ?? 'true').toLowerCase() === 'true'
