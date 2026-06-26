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
  OPENAI_API_KEY: env("OPENAI_API_KEY"),
  OPENAI_BASE_URL: env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
  OPENAI_MODEL: env("OPENAI_MODEL", "gpt-4o-mini"),
  ANTHROPIC_API_KEY: env("ANTHROPIC_API_KEY"),
  ANTHROPIC_BASE_URL: env("ANTHROPIC_BASE_URL", "https://api.anthropic.com/v1"),
  ANTHROPIC_MODEL: env("ANTHROPIC_MODEL", "claude-3-haiku-20240307"),
  GEMINI_API_KEY: env("GEMINI_API_KEY"),
  GEMINI_BASE_URL: env("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"),
  GEMINI_MODEL: env("GEMINI_MODEL", "gemini-2.0-flash"),
};
