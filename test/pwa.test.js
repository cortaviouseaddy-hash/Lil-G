import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("PWA install structure", () => {
  it("defines an installable web app manifest", async () => {
    const manifest = JSON.parse(await readFile(new URL("../manifest.webmanifest", import.meta.url), "utf8"));

    assert.equal(manifest.name, "Lil-G Talk Back");
    assert.equal(manifest.short_name, "Lil-G");
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.start_url, "./");
    assert.equal(manifest.scope, "./");
    assert.equal(manifest.theme_color, "#10131a");
    assert.equal(manifest.prefer_related_applications, false);
    assert.equal(manifest.launch_handler.client_mode, "navigate-existing");
    assert.equal(manifest.shortcuts.length, 2);
    assert.equal(manifest.icons.length, 2);
    assert.deepEqual(
      manifest.icons.map((icon) => icon.sizes),
      ["192x192", "512x512"]
    );
  });

  it("includes valid PNG home-screen icons", async () => {
    const icon192 = await readFile(new URL("../assets/icons/icon-192.png", import.meta.url));
    const icon512 = await readFile(new URL("../assets/icons/icon-512.png", import.meta.url));

    assert.deepEqual(icon192.subarray(0, pngSignature.length), pngSignature);
    assert.deepEqual(icon512.subarray(0, pngSignature.length), pngSignature);
  });

  it("includes startup credit and avatar clothes controls", async () => {
    const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

    assert.match(html, /Made by GFerryGoon/);
    assert.match(html, /data-avatar-options="clothes"/);
  });

  it("caches the app shell in the service worker", async () => {
    const serviceWorker = await readFile(new URL("../sw.js", import.meta.url), "utf8");

    assert.match(serviceWorker, /const CACHE_NAME = "lil-g-app-v7"/);
    assert.match(serviceWorker, /"\.\/index\.html"/);
    assert.match(serviceWorker, /"\.\/manifest\.webmanifest"/);
    assert.match(serviceWorker, /"\.\/src\/appActions\.js"/);
    assert.match(serviceWorker, /"\.\/src\/avatarSettings\.js"/);
    assert.match(serviceWorker, /"\.\/src\/memory\.js"/);
    assert.match(serviceWorker, /"\.\/src\/profileSync\.js"/);
    assert.match(serviceWorker, /"\.\/src\/voiceSettings\.js"/);
    assert.match(serviceWorker, /"\.\/src\/webSearch\.js"/);
    assert.match(serviceWorker, /"\.\/assets\/icons\/icon-512\.png"/);
  });
});
