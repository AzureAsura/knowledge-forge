const REFRESH_KEY = 'knofo.rt'

let accessToken: string | null = null

const read = () => {
  try {
    return localStorage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

export const session = {
  getAccess: () => accessToken,
  getRefresh: read,
  hasSession: () => accessToken !== null || read() !== null,
  set(tokens: { accessToken: string; refreshToken: string }) {
    accessToken = tokens.accessToken
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
  },
  clear() {
    accessToken = null
    localStorage.removeItem(REFRESH_KEY)
  },
}

// Logout in another tab removes the refresh token: drop this tab's access token too.
window.addEventListener('storage', (e) => {
  if (e.key === REFRESH_KEY && e.newValue === null) accessToken = null
})
