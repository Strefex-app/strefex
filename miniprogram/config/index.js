/**
 * API base URL — override in WeChat DevTools:详情 → 本地设置 → 不校验合法域名 (dev only).
 * Production: set to your deployed backend, e.g. https://api.yourdomain.com/api/v1/football
 */
const API_BASE_URL = 'http://localhost:8000/api/v1/football'

module.exports = {
  API_BASE_URL,
}
