import { ENV } from "./env";

export class AuraNotConfiguredError extends Error {
  constructor() {
    super("Graph querying requires AuraDB — configure in Settings");
    this.name = "AuraNotConfiguredError";
  }
}

export async function queryAuraAgent(question: string): Promise<string> {
  const { AURA_AGENT_URL, AURA_CLIENT_ID, AURA_CLIENT_SECRET } = ENV;

  if (!AURA_AGENT_URL || !AURA_CLIENT_ID || !AURA_CLIENT_SECRET) {
    throw new AuraNotConfiguredError();
  }

  const response = await fetch(`${AURA_AGENT_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": AURA_CLIENT_ID,
      "X-Client-Secret": AURA_CLIENT_SECRET,
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error(`Aura Agent error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response ?? data.answer ?? JSON.stringify(data);
}
