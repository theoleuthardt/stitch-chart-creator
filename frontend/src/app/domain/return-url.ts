/** The page to return to after signing in. Only paths inside this app count, never another site. */
export function safeReturnUrl(target: string | null): string {
  return target && /^\/(?![/\\])/.test(target) ? target : '/';
}
