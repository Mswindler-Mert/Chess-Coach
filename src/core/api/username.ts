// Chess.com usernames: 3–25 characters, letters, digits, underscore and hyphen.
const USERNAME_PATTERN = /^[a-z0-9_-]{3,25}$/

/**
 * Trims and lowercases a Chess.com username. Returns null when it cannot be a valid username,
 * so the UI can reject it before making any request.
 */
export function normalizeUsername(input: string): string | null {
  const username = input.trim().toLowerCase()
  return USERNAME_PATTERN.test(username) ? username : null
}
