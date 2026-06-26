import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyOrbTheme, getOrbTheme, orbThemes } from "../src/orbTheme.js";
import {
  loadFloatingOrbSettings,
  saveFloatingOrbSettings
} from "../src/floatingOrbSettings.js";
import { supportsDocumentPictureInPicture } from "../src/floatingOrb.js";

describe("orb theme helpers", () => {
  it("defines glow themes for each avatar color", () => {
    assert.equal(Object.keys(orbThemes).length, 7);
    assert.match(getOrbTheme("purple").gradient, /gradient/);
    assert.equal(getOrbTheme("unknown").gradient, orbThemes.white.gradient);
  });

  it("applies theme styles to an orb element", () => {
    const orb = {
      style: {},
      dataset: {}
    };

    applyOrbTheme(orb, "blue");

    assert.equal(orb.dataset.color, "blue");
    assert.match(orb.style.background, /gradient/);
    assert.match(orb.style.boxShadow, /rgba/);
  });
});

describe("floating orb settings helpers", () => {
  it("loads floating orb mode as off by default", () => {
    const settings = loadFloatingOrbSettings(createMemoryStorage());

    assert.equal(settings.enabled, false);
    assert.equal(settings.autoWakeOnMinimize, true);
    assert.equal(settings.preferPictureInPicture, true);
    assert.equal(settings.respondToVoice, true);
  });

  it("saves minimized state and position", () => {
    const storage = createMemoryStorage();
    const settings = saveFloatingOrbSettings(
      {
        enabled: true,
        minimized: true,
        x: 120,
        y: 240
      },
      storage
    );

    assert.equal(settings.minimized, true);
    assert.equal(loadFloatingOrbSettings(storage).x, 120);
  });
});

describe("floating orb browser support helpers", () => {
  it("detects document picture-in-picture support", () => {
    assert.equal(
      supportsDocumentPictureInPicture({
        documentPictureInPicture: {
          requestWindow() {}
        }
      }),
      true
    );
    assert.equal(supportsDocumentPictureInPicture({}), false);
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
