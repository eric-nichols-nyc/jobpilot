/** Canonical storage path for a user's base resume. */
export function defaultResumeStoragePath(userId: string): string {
  return `${userId}/resume.pdf`;
}

/**
 * Normalize `profiles.resume_pdf_url` to an InsForge storage object key.
 * Handles legacy rows that stored a full public URL instead of the path.
 */
export function resolveResumeStoragePath(
  stored: string | null | undefined,
  userId: string,
): string | null {
  if (!stored?.trim()) return null;

  const value = stored.trim();

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const url = new URL(value);
      const match = url.pathname.match(/\/objects\/(.+)$/);
      if (match?.[1]) {
        return decodeURIComponent(match[1]);
      }
    } catch {
      // fall through to canonical path
    }
    return defaultResumeStoragePath(userId);
  }

  return value;
}
