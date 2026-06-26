import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  loadScreenControlSettings,
  saveScreenControlSettings,
  SCREEN_CONTROL_SETTINGS_STORAGE_KEY
} from "../src/screenControlSettings.js";
import { formatScreenControlDisabledReply } from "../src/screenCommands.js";

describe("screen control settings helpers", () => {
  it("loads voice screen control as off by default", () => {
    const settings = loadScreenControlSettings(createMemoryStorage());

    assert.equal(settings.enabled, false);
  });

  it("saves the enabled toggle", () => {
    const storage = createMemoryStorage();
    const settings = saveScreenControlSettings({ enabled: true }, storage);

    assert.equal(settings.enabled, true);
    assert.equal(loadScreenControlSettings(storage).enabled, true);
    assert.equal(storage.getItem(SCREEN_CONTROL_SETTINGS_STORAGE_KEY).includes("true"), true);
  });

  it("explains when voice screen control is turned off", () => {
    assert.match(formatScreenControlDisabledReply(), /turned off/i);
    assert.match(formatScreenControlDisabledReply(), /Settings/i);
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
