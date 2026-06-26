import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCompanionPayload,
  createCompanionClient,
  normalizeCompanionResponse
} from "../src/companionClient.js";
import {
  detectScreenCommand,
  formatCompanionUnavailableReply,
  formatScreenCommandReply,
  formatScreenControlHelp
} from "../src/screenCommands.js";

describe("screen command helpers", () => {
  it("detects look-at-screen requests", () => {
    const command = detectScreenCommand("look at my screen");

    assert.equal(command.isScreenCommand, true);
    assert.equal(command.action, "describe");
  });

  it("detects click and multi-click voice commands", () => {
    const click = detectScreenCommand("click on Submit");
    const multiTap = detectScreenCommand("tap 3 times on Settings");

    assert.deepEqual(click, {
      isScreenCommand: true,
      action: "click",
      target: "Submit",
      times: 1,
      raw: "click on Submit"
    });
    assert.equal(multiTap.action, "click");
    assert.equal(multiTap.target, "Settings");
    assert.equal(multiTap.times, 3);
  });

  it("detects double click and typing commands", () => {
    const doubleClick = detectScreenCommand("double click on the file icon");
    const typeCommand = detectScreenCommand('type "hello world" in the search box');

    assert.equal(doubleClick.action, "double_click");
    assert.equal(doubleClick.target, "file icon");
    assert.equal(typeCommand.action, "type");
    assert.equal(typeCommand.text, "hello world");
    assert.equal(typeCommand.target, "search box");
  });

  it("detects key and scroll commands", () => {
    const key = detectScreenCommand("press enter");
    const scroll = detectScreenCommand("scroll down 5");

    assert.equal(key.action, "key");
    assert.equal(key.key, "enter");
    assert.equal(scroll.action, "scroll");
    assert.equal(scroll.direction, "down");
    assert.equal(scroll.amount, 5);
  });

  it("formats successful and failed replies", () => {
    assert.match(
      formatScreenCommandReply({
        ok: true,
        action: "click",
        target: "Save",
        times: 2
      }),
      /clicked "Save" 2 times/
    );
    assert.match(formatScreenCommandReply({ ok: false, message: "No target." }), /No target/);
    assert.match(formatScreenControlHelp(), /click on Submit/);
    assert.match(formatCompanionUnavailableReply(), /desktop companion/);
  });
});

describe("companion client helpers", () => {
  it("builds companion payloads from parsed commands", () => {
    assert.deepEqual(buildCompanionPayload({ action: "describe" }), {
      action: "describe_screen"
    });
    assert.deepEqual(
      buildCompanionPayload({
        action: "click",
        target: "OK",
        times: 4
      }),
      {
        action: "click",
        target: "OK",
        times: 4
      }
    );
    assert.deepEqual(
      buildCompanionPayload({
        action: "type",
        text: "hello",
        target: "search box"
      }),
      {
        action: "type",
        text: "hello",
        target: "search box"
      }
    );
  });

  it("normalizes companion responses", () => {
    const result = normalizeCompanionResponse(
      { action: "click", target: "Save", times: 2 },
      { ok: true, target: "Save", times: 2, message: "done" }
    );

    assert.equal(result.ok, true);
    assert.equal(result.target, "Save");
    assert.equal(result.times, 2);
  });

  it("tracks companion connection state with a fake websocket", async () => {
    const storage = createMemoryStorage();
    const sockets = [];

    class FakeWebSocket {
      constructor(url) {
        this.url = url;
        this.readyState = 0;
        this.listeners = new Map();
        sockets.push(this);
        queueMicrotask(() => {
          this.readyState = 1;
          this.emit("open", {});
        });
      }

      addEventListener(type, handler) {
        if (!this.listeners.has(type)) {
          this.listeners.set(type, new Set());
        }
        this.listeners.get(type).add(handler);
      }

      emit(type, event) {
        for (const handler of this.listeners.get(type) ?? []) {
          handler(event);
        }
      }

      send(payload) {
        const request = JSON.parse(payload);
        queueMicrotask(() => {
          this.emit(
            "message",
            {
              data: JSON.stringify({
                id: request.id,
                ok: true,
                summary: "Settings\nSubmit",
                message: "done"
              })
            }
          );
        });
      }

      close() {
        this.readyState = 3;
        this.emit("close", {});
      }
    }

    const client = createCompanionClient({
      WebSocketImpl: FakeWebSocket,
      storage
    });

    const status = await client.connect("ws://127.0.0.1:8765");
    assert.equal(status.connected, true);

    const response = await client.executeScreenCommand({ action: "describe" });
    assert.equal(response.ok, true);
    assert.match(response.summary, /Settings/);
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
