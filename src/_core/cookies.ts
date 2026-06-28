import { COOKIE_NAME } from "../const";

export interface CookieOptions {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax" | "strict" | "none";
  path: string;
  maxAge?: number;
}

export function getSessionCookieOptions(req?: any): CookieOptions {
  // Check if secure via x-forwarded-proto or connection.encrypted
  const isSecure = 
    req?.headers?.['x-forwarded-proto'] === 'https' || 
    req?.secure || 
    req?.connection?.encrypted || 
    req?.url?.startsWith("https") || 
    false;

  return {
    httpOnly: true,
    secure: !!isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${value}`];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join("; ");
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...rest] = c.trim().split("=");
      return [key, rest.join("=")];
    })
  );
}
