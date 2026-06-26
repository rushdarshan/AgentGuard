import { ENV } from "./env";

const SARVAM_LANGUAGES = [
  "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "or",
  "as", "mai", "sat", "ur", "ks", "sd", "ne", "si", "kok", "doi",
  "mni", "lus",
] as const;

export type SarvamLanguage = (typeof SARVAM_LANGUAGES)[number];

export async function translatePrompt(
  prompt: string,
  targetLanguage: string
): Promise<string> {
  if (!ENV.SARVAM_API_KEY) return prompt;

  const response = await fetch(
    "https://api.sarvam.ai/v1/translate",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": ENV.SARVAM_API_KEY,
      },
      body: JSON.stringify({
        input: prompt,
        source_language: "en",
        target_language: targetLanguage,
        mode: "formal",
      }),
    }
  );

  if (!response.ok) {
    console.warn(`[Sarvam] Translation failed for ${targetLanguage}: ${response.status}`);
    return prompt;
  }

  const data = await response.json();
  return data.translated_text || data.output || prompt;
}

export async function translatePrompts(
  prompts: string[],
  languages: string[]
): Promise<Array<{ language: string; prompts: string[] }>> {
  if (languages.length === 0) return [];

  const results = await Promise.allSettled(
    languages.map(async (lang) => {
      const translated = await Promise.all(
        prompts.map((p) => translatePrompt(p, lang))
      );
      return { language: lang, prompts: translated };
    })
  );

  return results
    .filter((r) => r.status === "fulfilled")
    .map((r) => (r as PromiseFulfilledResult<{ language: string; prompts: string[] }>).value);
}
