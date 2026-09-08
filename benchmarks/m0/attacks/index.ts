import type { Family, Fixture } from "../types";
import { FAMILIES } from "../types";
import { SINK_DENYLIST } from "../sink-denylist";
import {
  clean as poisonedToolDescriptionClean,
  poisoned as poisonedToolDescriptionPoisoned,
} from "./poisoned-tool-description/fixtures";
import {
  clean as hiddenToolResponseClean,
  poisoned as hiddenToolResponsePoisoned,
} from "./hidden-tool-response/fixtures";
import {
  clean as spoofedToolOutputClean,
  poisoned as spoofedToolOutputPoisoned,
} from "./spoofed-tool-output/fixtures";
import {
  clean as argumentInjectionClean,
  poisoned as argumentInjectionPoisoned,
} from "./argument-injection/fixtures";
import {
  clean as destructiveCommandRelayClean,
  poisoned as destructiveCommandRelayPoisoned,
} from "./destructive-command-relay/fixtures";

export const FIXTURES: Record<Family, { poisoned: Fixture; clean: Fixture }> = {
  "poisoned-tool-description": {
    poisoned: poisonedToolDescriptionPoisoned,
    clean: poisonedToolDescriptionClean,
  },
  "hidden-tool-response": {
    poisoned: hiddenToolResponsePoisoned,
    clean: hiddenToolResponseClean,
  },
  "spoofed-tool-output": {
    poisoned: spoofedToolOutputPoisoned,
    clean: spoofedToolOutputClean,
  },
  "argument-injection": {
    poisoned: argumentInjectionPoisoned,
    clean: argumentInjectionClean,
  },
  "destructive-command-relay": {
    poisoned: destructiveCommandRelayPoisoned,
    clean: destructiveCommandRelayClean,
  },
};

export function assertFixtureSet(): void {
  const keys = Object.keys(FIXTURES);
  if (keys.length !== FAMILIES.length) {
    throw new Error(
      `fixture set must hold exactly ${FAMILIES.length} families, got ${keys.length}`,
    );
  }
  for (const family of FAMILIES) {
    const pair = FIXTURES[family];
    if (!pair) throw new Error(`missing fixture pair for family ${family}`);
    const { poisoned, clean } = pair;
    if (
      poisoned.family !== family ||
      poisoned.id !== `${family}.poisoned` ||
      poisoned.clean !== false
    ) {
      throw new Error(`bad poisoned fixture for family ${family}`);
    }
    if (!SINK_DENYLIST.has(poisoned.emitted_sink.tool)) {
      throw new Error(
        `poisoned ${family} must emit a denylisted sink, got ${poisoned.emitted_sink.tool}`,
      );
    }
    if (
      clean.family !== family ||
      clean.id !== `${family}.clean` ||
      clean.clean !== true
    ) {
      throw new Error(`bad clean fixture for family ${family}`);
    }
    if (SINK_DENYLIST.has(clean.emitted_sink.tool)) {
      throw new Error(
        `clean ${family} must not emit a denylisted sink, got ${clean.emitted_sink.tool}`,
      );
    }
  }
}

export function allFixtures(): Fixture[] {
  return FAMILIES.flatMap((family) => [
    FIXTURES[family].poisoned,
    FIXTURES[family].clean,
  ]);
}
