import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectAssistantRenameCommand,
  formatAssistantRenameReply,
  formatOrbWakeHint,
  mentionsAssistantName,
  stripAssistantNamePrefix
} from "../src/assistantName.js";
import { detectWakePhrase, isWakePhrase } from "../src/wakeWord.js";

describe("assistant name helpers", () => {
  it("detects rename commands", () => {
    assert.deepEqual(detectAssistantRenameCommand("call yourself Jarvis"), {
      isRename: true,
      name: "Jarvis"
    });
    assert.deepEqual(detectAssistantRenameCommand("change your name to Star Helper"), {
      isRename: true,
      name: "Star Helper"
    });
    assert.equal(detectAssistantRenameCommand("hello there").isRename, false);
  });

  it("formats rename and orb wake hints", () => {
    assert.match(formatAssistantRenameReply("Nova"), /Call me Nova/);
    assert.match(formatOrbWakeHint("Nova"), /"Nova"/);
  });

  it("detects and strips custom assistant names in speech", () => {
    assert.equal(mentionsAssistantName("hey Nova what time is it", "Nova"), true);
    assert.equal(
      stripAssistantNamePrefix("hey Nova what time is it", "Nova"),
      "what time is it"
    );
  });
});

describe("wake word helpers", () => {
  it("detects Lil-G wake phrases", () => {
    assert.equal(isWakePhrase("hey Lil G"), true);
    assert.equal(isWakePhrase("Lil-G"), true);
    assert.equal(isWakePhrase("little gee"), true);
  });

  it("detects custom assistant wake phrases", () => {
    assert.equal(isWakePhrase("hey Jarvis", { assistantName: "Jarvis" }), true);
    assert.equal(
      detectWakePhrase("hey Star Helper tell me a joke", { assistantName: "Star Helper" }).command,
      "tell me a joke"
    );
  });

  it("extracts a spoken command after the wake phrase", () => {
    const result = detectWakePhrase("hey Lil G tell me a joke");

    assert.equal(result.isWakePhrase, true);
    assert.equal(result.command, "tell me a joke");
  });

  it("leaves non-wake transcripts available as normal commands", () => {
    const result = detectWakePhrase("tell me a joke");

    assert.equal(result.isWakePhrase, false);
    assert.equal(result.command, "tell me a joke");
  });
});
