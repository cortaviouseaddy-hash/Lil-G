import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectActionIntent, formatActionReply } from "../src/appActions.js";
import {
  applyAvatarUpdate,
  avatarOptions,
  AVATAR_STORAGE_KEY,
  detectAvatarCommand,
  formatAvatarSummary,
  loadAvatarSettings,
  saveAvatarSettings
} from "../src/avatarSettings.js";
import { createAssistantMessage, createUserMessage, getLilGResponse } from "../src/chatEngine.js";
import {
  extractMemoryFact,
  extractAutomaticMemoryFacts,
  formatMemoryList,
  getRelevantMemoryText,
  isClearMemoryRequest,
  isMemoryRecallRequest,
  loadMemories,
  MEMORY_STORAGE_KEY,
  rememberAutomaticFacts,
  rememberFact,
  saveMemories
} from "../src/memory.js";
import {
  createProfileSyncCode,
  loadProfile,
  parseProfileSyncCode,
  PROFILE_STORAGE_KEY,
  saveProfile
} from "../src/profileSync.js";
import { speakText, stopSpeaking } from "../src/speech.js";
import {
  createPresetSettings,
  createVoiceOptions,
  loadVoiceSettings,
  VOICE_SETTINGS_STORAGE_KEY,
  voicePresets
} from "../src/voiceSettings.js";
import { detectWakePhrase, isWakePhrase } from "../src/wakeWord.js";
import { createWebSearchUrl, detectSearchIntent, formatSearchReply, searchInternet } from "../src/webSearch.js";

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

  it("can include relevant remembered facts in normal replies", () => {
    const response = getLilGResponse("What about basketball?", [], {
      relevantMemories: ["you like basketball"]
    });

    assert.match(response, /I remember you like basketball/);
  });

  it("supports roleplay requests", () => {
    const response = getLilGResponse("Can you roleplay as a space pilot?");

    assert.match(response, /roleplay/i);
    assert.match(response, /stay in character/i);
  });

  it("explains Discord message limits and pasted-message workflow", () => {
    const response = getLilGResponse("Can you read my Discord messages and reply?");

    assert.match(response, /paste the messages/i);
    assert.match(response, /cannot directly read/i);
  });
});

describe("app action helpers", () => {
  it("detects supported app launch requests", () => {
    const action = detectActionIntent("open Discord");

    assert.equal(action.isAction, true);
    assert.equal(action.title, "Discord");
    assert.equal(action.url, "https://discord.com/app");
    assert.match(formatActionReply(action), /Opening Discord/);
  });

  it("detects browser search launch requests", () => {
    const action = detectActionIntent("open browser and search for Lil G");

    assert.equal(action.isAction, true);
    assert.equal(action.kind, "search");
    assert.match(action.url, /google\.com\/search/);
  });
});

describe("avatar settings helpers", () => {
  it("loads defaults for a smooth white orb avatar", () => {
    const settings = loadAvatarSettings(createMemoryStorage());

    assert.equal(settings.color, "white");
    assert.equal(settings.shape, "orb");
    assert.equal(settings.customized, false);
    assert.equal(avatarOptions.identity.includes("boy"), true);
    assert.equal(avatarOptions.identity.includes("girl"), true);
  });

  it("saves explicit avatar choices", () => {
    const storage = createMemoryStorage();
    const settings = saveAvatarSettings(
      applyAvatarUpdate(loadAvatarSettings(storage), {
        identity: "girl",
        color: "purple",
        shape: "star",
        hair: "curls",
        face: "playful",
        body: "soft",
        clothes: "hoodie"
      }),
      storage
    );

    assert.equal(settings.customized, true);
    assert.equal(loadAvatarSettings(storage).hair, "curls");
    assert.equal(storage.getItem(AVATAR_STORAGE_KEY).includes("purple"), true);
    assert.match(formatAvatarSummary(settings), /purple star avatar/);
    assert.match(formatAvatarSummary(settings), /hoodie clothes/);
  });

  it("detects avatar customization commands for voice or chat", () => {
    const colorCommand = detectAvatarCommand("change my avatar color to purple", loadAvatarSettings());
    const hairCommand = detectAvatarCommand("set my avatar hair to curls", colorCommand.settings);
    const clothesCommand = detectAvatarCommand("change my avatar clothes to jacket", hairCommand.settings);

    assert.equal(colorCommand.isAvatarCommand, true);
    assert.equal(colorCommand.settings.color, "purple");
    assert.deepEqual(colorCommand.changedKeys, ["color"]);
    assert.equal(hairCommand.settings.hair, "curls");
    assert.equal(clothesCommand.settings.clothes, "jacket");
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

describe("voice settings helpers", () => {
  it("defines six voice presets including a robotic option", () => {
    assert.equal(voicePresets.length, 6);
    assert.equal(voicePresets.some((preset) => preset.id === "robotic"), true);
  });

  it("loads saved voice settings and builds speech options", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      VOICE_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        presetId: "robotic",
        pitch: 0.7,
        rate: 0.8
      })
    );

    const settings = loadVoiceSettings(storage);
    const options = createVoiceOptions(settings, [
      { name: "Zarvox", lang: "en-US" },
      { name: "Sample German", lang: "de-DE" }
    ]);

    assert.equal(settings.presetId, "robotic");
    assert.equal(options.pitch, 0.7);
    assert.equal(options.rate, 0.8);
    assert.equal(options.voice.name, "Zarvox");
  });

  it("creates preset defaults for the selected style", () => {
    const settings = createPresetSettings("deep");

    assert.equal(settings.presetId, "deep");
    assert.equal(settings.pitch < 1, true);
    assert.equal(settings.rate < 1, true);
  });
});

describe("wake word helpers", () => {
  it("detects Lil-G wake phrases", () => {
    assert.equal(isWakePhrase("hey Lil G"), true);
    assert.equal(isWakePhrase("Lil-G"), true);
    assert.equal(isWakePhrase("little gee"), true);
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

describe("memory helpers", () => {
  it("extracts explicit memories and name memories", () => {
    assert.equal(extractMemoryFact("remember that I like Memphis rap."), "I like Memphis rap");
    assert.equal(extractMemoryFact("my name is Corey"), "your name is Corey");
    assert.equal(extractMemoryFact("what is up"), "");
  });

  it("saves, loads, and formats memories", () => {
    const storage = createMemoryStorage();
    const result = rememberFact("you like basketball", [], {
      id: "memory-1",
      createdAt: "2026-06-17T00:00:00.000Z"
    });

    saveMemories(result.memories, storage);

    assert.deepEqual(loadMemories(storage), result.memories);
    assert.match(formatMemoryList(result.memories), /1\. you like basketball/);
    assert.equal(storage.getItem(MEMORY_STORAGE_KEY).includes("basketball"), true);
  });

  it("detects recall and clear requests", () => {
    assert.equal(isMemoryRecallRequest("what do you remember about me?"), true);
    assert.equal(isClearMemoryRequest("clear memory"), true);
  });

  it("extracts and saves automatic profile memories", () => {
    assert.deepEqual(extractAutomaticMemoryFacts("my favorite music is jazz"), ["your favorite music is jazz"]);
    assert.deepEqual(extractAutomaticMemoryFacts("I talk about basketball a lot"), [
      "your speech pattern includes basketball"
    ]);

    const result = rememberAutomaticFacts("I love Memphis rap.", [], {
      id: "memory-automatic",
      createdAt: "2026-06-17T00:00:00.000Z"
    });

    assert.equal(result.added.length, 1);
    assert.equal(result.memories[0].text, "you love Memphis rap");
  });

  it("finds relevant memory text", () => {
    const memories = [
      { id: "memory-1", text: "you like basketball", createdAt: "now" },
      { id: "memory-2", text: "your dog is named Ace", createdAt: "now" }
    ];

    assert.deepEqual(getRelevantMemoryText("Let's talk basketball", memories), ["you like basketball"]);
  });
});

describe("profile sync helpers", () => {
  it("saves and loads a local profile", () => {
    const storage = createMemoryStorage();
    const profile = saveProfile({ displayName: " Corey  G " }, storage);

    assert.deepEqual(profile, { displayName: "Corey G" });
    assert.deepEqual(loadProfile(storage), profile);
    assert.equal(storage.getItem(PROFILE_STORAGE_KEY).includes("Corey G"), true);
  });

  it("round-trips a profile sync code", () => {
    const code = createProfileSyncCode(
      {
        profile: { displayName: "Corey" },
        memories: [{ id: "memory-1", text: "you like basketball", createdAt: "now" }],
        voiceSettings: { presetId: "robotic", pitch: 0.7, rate: 0.8 },
        avatarSettings: { identity: "boy", color: "blue", shape: "diamond", hair: "short" }
      },
      { createdAt: "2026-06-17T00:00:00.000Z" }
    );
    const payload = parseProfileSyncCode(code);

    assert.equal(payload.profile.displayName, "Corey");
    assert.equal(payload.memories[0].text, "you like basketball");
    assert.equal(payload.voiceSettings.presetId, "robotic");
    assert.equal(payload.avatarSettings.color, "blue");
  });
});

describe("web search helpers", () => {
  it("detects search intent and extracts the query", () => {
    assert.deepEqual(detectSearchIntent("search the internet for Lil G news"), {
      isSearch: true,
      query: "Lil G news"
    });
    assert.deepEqual(detectSearchIntent("tell me a joke"), {
      isSearch: false,
      query: ""
    });
  });

  it("fetches and formats sourced search results", async () => {
    const result = await searchInternet("Lil G", {
      fetchImpl: async (url) => {
        assert.match(url, /wikipedia\.org/);

        return {
          ok: true,
          async json() {
            return [
              "Lil G",
              ["Lil G"],
              ["Lil G is a sample result."],
              ["https://example.com/lil-g"]
            ];
          }
        };
      }
    });

    assert.equal(result.query, "Lil G");
    assert.equal(result.results[0].title, "Lil G");
    assert.equal(result.webSearchUrl, createWebSearchUrl("Lil G"));
    assert.match(formatSearchReply(result), /Lil G is a sample result/);
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
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}
