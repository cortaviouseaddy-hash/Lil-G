import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildThinkingTrace, formatThinkingTrace } from "../src/thinkingEngine.js";
import {
  loadThinkingSettings,
  saveThinkingSettings,
  THINKING_SETTINGS_STORAGE_KEY
} from "../src/thinkingSettings.js";
import { createUserMessage } from "../src/chatEngine.js";

describe("thinking engine helpers", () => {
  it("builds a reasoning trace for troubleshooting questions", () => {
    const trace = buildThinkingTrace("Can you help me fix this error?", [], {
      relevantMemories: ["you like basketball"],
      replyLength: "medium"
    });

    assert.equal(trace.intent, "troubleshoot");
    assert.equal(trace.steps.length, 4);
    assert.match(trace.steps[0], /fix something/i);
    assert.match(trace.steps[1], /basketball/);
    assert.match(formatThinkingTrace(trace), /^1\./);
  });

  it("marks factual questions as search thinking when needed", () => {
    const trace = buildThinkingTrace("What is photosynthesis?", [], {
      willSearch: true,
      replyLength: "long"
    });

    assert.equal(trace.intent, "search");
    assert.match(trace.steps[2], /online sources/i);
    assert.match(trace.steps[3], /fuller answer/i);
  });

  it("uses recent conversation context in the trace", () => {
    const history = [
      createUserMessage("I want to build an app"),
      createUserMessage("How should I start?")
    ];
    const trace = buildThinkingTrace("How should I start?", history, {
      replyLength: "medium"
    });

    assert.match(trace.steps[1], /Recent conversation context/i);
    assert.match(trace.steps[1], /build an app/i);
  });
});

describe("thinking settings helpers", () => {
  it("loads self thinking as off by default", () => {
    const settings = loadThinkingSettings(createMemoryStorage());

    assert.equal(settings.enabled, false);
  });

  it("saves the self thinking toggle", () => {
    const storage = createMemoryStorage();
    const settings = saveThinkingSettings({ enabled: true }, storage);

    assert.equal(settings.enabled, true);
    assert.equal(loadThinkingSettings(storage).enabled, true);
    assert.equal(storage.getItem(THINKING_SETTINGS_STORAGE_KEY).includes("true"), true);
  });
});

function createMemoryStorage() {
  const data = new Map();

  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    }
  };
}
