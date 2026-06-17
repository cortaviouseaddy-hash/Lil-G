import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createAssistantMessage, createUserMessage, getLilGResponse } from "../src/chatEngine.js";
import { speakText, stopSpeaking } from "../src/speech.js";

describe("getLilGResponse", () => {
  it("answers greetings with an introduction", () => {
    const response = getLilGResponse("hey Lil-G");

    assert.match(response, /I'm Lil-G/);
  });

  it("prompts for input when the user sends a blank message", () => {
    const response = getLilGResponse("   ");

    assert.match(response, /I'm listening/);
  });

  it("answers questions with a next-step response", () => {
    const response = getLilGResponse("How should I start building something?");

    assert.match(response, /Good question/);
  });

  it("uses conversation history for reflective replies", () => {
    const history = [
      createUserMessage("hello"),
      createAssistantMessage("Hey, I'm Lil-G."),
      createUserMessage("I want to practice speaking")
    ];

    const response = getLilGResponse("I want this AI to talk back", history);

    assert.match(response, /You said: "I want this AI to talk back"/);
  });
});

describe("speech helpers", () => {
  it("speaks text with the provided synthesis implementation", () => {
    const spoken = [];
    const synth = {
      cancelCalled: false,
      cancel() {
        this.cancelCalled = true;
      },
      speak(utterance) {
        spoken.push(utterance);
      }
    };

    class FakeUtterance {
      constructor(text) {
        this.text = text;
      }
    }

    const result = speakText("Lil-G can talk back.", {
      synth,
      Utterance: FakeUtterance,
      voice: { rate: 0.9, pitch: 1.1, volume: 0.8 }
    });

    assert.equal(result, true);
    assert.equal(synth.cancelCalled, true);
    assert.equal(spoken.length, 1);
    assert.equal(spoken[0].text, "Lil-G can talk back.");
    assert.equal(spoken[0].rate, 0.9);
    assert.equal(spoken[0].pitch, 1.1);
    assert.equal(spoken[0].volume, 0.8);
  });

  it("does not speak when synthesis is unavailable", () => {
    const result = speakText("No browser support.", {
      synth: undefined,
      Utterance: undefined
    });

    assert.equal(result, false);
  });

  it("stops current speech when synthesis supports cancellation", () => {
    let cancelled = false;
    const result = stopSpeaking({
      cancel() {
        cancelled = true;
      }
    });

    assert.equal(result, true);
    assert.equal(cancelled, true);
  });
});
