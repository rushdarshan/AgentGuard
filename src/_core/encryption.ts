import { ENV } from "./env";

export function encrypt(text: string): string {
  if (!ENV.ENCRYPTION_KEY) return text;
  return Buffer.from(text).toString("base64");
}

export function decrypt(encrypted: string): string {
  if (!ENV.ENCRYPTION_KEY) return encrypted;
  return Buffer.from(encrypted, "base64").toString("utf-8");
}
