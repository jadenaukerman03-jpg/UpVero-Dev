export const STRONG_PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;

export function isStrongPassword(password: string) {
  return STRONG_PASSWORD_PATTERN.test(password);
}

function containsControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

/**
 * Accept only same-origin path redirects. Backslashes are rejected because
 * browsers can normalize them into authority separators in navigation URLs.
 */
export function safeRequestedDestination(search: string, fallback = "/dashboard") {
  const destination = new URLSearchParams(search).get("next");
  if (
    !destination ||
    !destination.startsWith("/") ||
    destination.startsWith("//") ||
    destination.includes("\\") ||
    containsControlCharacter(destination)
  ) {
    return fallback;
  }
  return destination;
}
