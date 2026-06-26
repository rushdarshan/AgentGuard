function env(key: string, fallback = ""): string {
  return (typeof process !== "undefined" && process.env?.[key]) || fallback;
}

export const ENV = {
  DATABASE_URL: env("DATABASE_URL"),
  LLM_API_KEY: env("LLM_API_KEY"),
  LLM_BASE_URL: env("LLM_BASE_URL", "https://api.openai.com/v1"),
  LLM_MODEL: env("LLM_MODEL", "gpt-4o-mini"),
  NEO4J_URI: env("NEO4J_URI"),
  NEO4J_USER: env("NEO4J_USER"),
  NEO4J_PASSWORD: env("NEO4J_PASSWORD"),
  SARVAM_API_KEY: env("SARVAM_API_KEY"),
  ENCRYPTION_KEY: env("ENCRYPTION_KEY"),
  COOKIE_SECRET: env("COOKIE_SECRET", "dev-secret-change-in-prod"),
  ownerOpenId: env("OWNER_OPEN_ID"),
};
