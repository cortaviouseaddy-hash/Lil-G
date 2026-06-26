import { applyOrbTheme } from "./orbTheme.js";
import {
  loadFloatingOrbSettings,
  saveFloatingOrbSettings
} from "./floatingOrbSettings.js";

const ORB_SIZE = 84;

export function createFloatingOrbController(options = {}) {
  const documentRef = options.document ?? globalThis.document;
  const windowRef = options.window ?? globalThis.window;
  let settings = loadFloatingOrbSettings(options.storage);
  let avatarColor = options.initialColor ?? "white";
  let activityState = "idle";
  let pipWindow;
  let dragState;
  let listeners = new Set();

  const elements = {
    widget: documentRef.querySelector("[data-floating-orb]"),
    orb: documentRef.querySelector("[data-floating-orb-button]"),
    panel: documentRef.querySelector("[data-floating-orb-panel]"),
    status: documentRef.querySelector("[data-floating-orb-status]"),
    restore: documentRef.querySelector("[data-floating-orb-restore]"),
    mic: documentRef.querySelector("[data-floating-orb-mic]"),
    wake: documentRef.querySelector("[data-floating-orb-wake]"),
    minimize: documentRef.querySelector("[data-minimize-orb]"),
    enabled: documentRef.querySelector("[data-floating-orb-enabled]"),
    autoWake: documentRef.querySelector("[data-floating-orb-auto-wake]"),
    respondToVoice: documentRef.querySelector("[data-floating-orb-respond-voice]"),
    pip: documentRef.querySelector("[data-floating-orb-pip]"),
    state: documentRef.querySelector("[data-floating-orb-state]")
  };

  setup();

  return {
    applyAvatarColor,
    getSettings: () => ({ ...settings }),
    isMinimized: () => settings.minimized,
    minimize,
    notify,
    restore,
    setActivityState,
    subscribe,
    syncSettingsControls,
    updateAssistantIdentity,
    updateSettings
  };

  function setup() {
    if (!elements.widget || !elements.orb) {
      return;
    }

    applyAvatarColor(avatarColor);
    restoreSavedPosition();
    syncSettingsControls();
    syncVisibility();

    elements.orb.addEventListener("click", (event) => {
      if (dragState?.moved) {
        event.preventDefault();
        return;
      }

      togglePanel();
    });

    elements.orb.addEventListener("pointerdown", startDrag);
    elements.restore?.addEventListener("click", () => restore());
    elements.minimize?.addEventListener("click", () => minimize());
    elements.mic?.addEventListener("click", () => options.onMic?.());
    elements.wake?.addEventListener("click", () => options.onWake?.());
    elements.enabled?.addEventListener("change", () => {
      updateSettings({
        enabled: elements.enabled.checked
      });
      publish(settings.enabled ? "Floating orb mode enabled." : "Floating orb mode disabled.");
    });
    elements.autoWake?.addEventListener("change", () => {
      updateSettings({
        autoWakeOnMinimize: elements.autoWake.checked
      });
    });
    elements.respondToVoice?.addEventListener("change", () => {
      updateSettings({
        respondToVoice: elements.respondToVoice.checked
      });
    });
    elements.pip?.addEventListener("change", () => {
      updateSettings({
        preferPictureInPicture: elements.pip.checked
      });
    });

    windowRef.addEventListener("resize", () => {
      clampPosition();
      applyPosition();
    });

    if (settings.minimized && settings.enabled) {
      enterMinimizedMode({ silent: true });
    }
  }

  function updateSettings(patch) {
    const nextSettings = {
      ...settings,
      ...patch
    };

    if (patch.enabled === false) {
      nextSettings.minimized = false;
    }

    settings = saveFloatingOrbSettings(nextSettings, options.storage);
    syncSettingsControls();
    syncVisibility();
  }

  function syncSettingsControls() {
    if (elements.enabled) {
      elements.enabled.checked = settings.enabled;
    }

    if (elements.autoWake) {
      elements.autoWake.checked = settings.autoWakeOnMinimize;
      elements.autoWake.disabled = !settings.enabled;
    }

    if (elements.respondToVoice) {
      elements.respondToVoice.checked = settings.respondToVoice;
      elements.respondToVoice.disabled = !settings.enabled;
    }

    if (elements.pip) {
      elements.pip.checked = settings.preferPictureInPicture;
      elements.pip.disabled = !settings.enabled || !supportsDocumentPictureInPicture(windowRef);
    }

    if (elements.state) {
      elements.state.textContent = formatSettingsState();
    }

    if (elements.minimize) {
      elements.minimize.hidden = !settings.enabled;
      elements.minimize.disabled = settings.minimized;
    }
  }

  function formatSettingsState() {
    if (!settings.enabled) {
      return "Floating orb mode is off. Turn it on to minimize Lil-G into a draggable orb that keeps working in the background.";
    }

    if (settings.minimized) {
      return "Lil-G is minimized to the floating orb. Talk to it by name and it can answer out loud in the background.";
    }

    const pipNote = supportsDocumentPictureInPicture(windowRef)
      ? " On Chrome or Edge you can also float the orb above other windows."
      : " Your browser will keep the orb on this Lil-G page.";

    return `Floating orb mode is on. The orb uses your avatar glow color.${pipNote}`;
  }

  function syncVisibility() {
    const showWidget = settings.enabled && settings.minimized;
    elements.widget.hidden = !showWidget;
    documentRef.body.classList.toggle("is-orb-minimized", showWidget);

    if (!showWidget) {
      closePictureInPicture();
      closePanel();
    }
  }

  function updateAssistantIdentity() {
    const assistantName = options.getAssistantName?.() || "Lil-G";

    if (elements.orb) {
      elements.orb.setAttribute("aria-label", `${assistantName} floating orb`);
    }

    if (elements.status && settings.minimized) {
      elements.status.textContent = options.getOrbWakeHint?.() || `Say "Hey ${assistantName}" and I will answer.`;
    }

    if (pipWindow && !pipWindow.closed) {
      const pipText = pipWindow.document.querySelector(".pip-shell p");
      if (pipText) {
        pipText.textContent = `${assistantName} is listening in the background. Say "${assistantName}" to talk.`;
      }
    }
  }

  function applyAvatarColor(color) {
    avatarColor = color;

    if (elements.orb) {
      applyOrbTheme(elements.orb, color);
    }

    if (pipWindow && !pipWindow.closed) {
      const pipOrb = pipWindow.document.querySelector("[data-floating-orb-pip-orb]");

      if (pipOrb) {
        applyOrbTheme(pipOrb, color);
      }
    }
  }

  function setActivityState(state) {
    activityState = state;
    elements.widget?.classList.toggle("is-listening", state === "listening");
    elements.widget?.classList.toggle("is-thinking", state === "thinking");
    elements.widget?.classList.toggle("is-speaking", state === "speaking");
    pipWindow?.document.body?.classList.toggle("is-listening", state === "listening");
    pipWindow?.document.body?.classList.toggle("is-thinking", state === "thinking");
    pipWindow?.document.body?.classList.toggle("is-speaking", state === "speaking");
  }

  function setOrbStatus(message) {
    if (elements.status) {
      elements.status.textContent = message;
    }
  }

  async function minimize() {
    if (!settings.enabled) {
      publish("Turn on floating orb mode in Settings first.");
      return;
    }

    await enterMinimizedMode();
  }

  async function enterMinimizedMode(enterOptions = {}) {
    settings = saveFloatingOrbSettings(
      {
        ...settings,
        minimized: true
      },
      options.storage
    );
    syncSettingsControls();
    syncVisibility();
    applyPosition();
    closePanel();

    if (!enterOptions.silent) {
      publish(options.getOrbWakeHint?.() || "Lil-G is minimized. Say my name to talk to me.");
    }

    updateAssistantIdentity();

    if (settings.autoWakeOnMinimize || settings.respondToVoice) {
      options.onAutoWake?.();
    }

    if (settings.preferPictureInPicture) {
      await openPictureInPicture();
    }
  }

  function restore() {
    settings = saveFloatingOrbSettings(
      {
        ...settings,
        minimized: false
      },
      options.storage
    );
    syncSettingsControls();
    syncVisibility();
    closePictureInPicture();
    closePanel();
    publish("Lil-G is back in full view.");
    options.onRestore?.();
  }

  function togglePanel() {
    const isOpen = !elements.panel.hidden;
    elements.panel.hidden = isOpen;
    elements.widget.classList.toggle("is-panel-open", !isOpen);
  }

  function closePanel() {
    if (!elements.panel) {
      return;
    }

    elements.panel.hidden = true;
    elements.widget?.classList.remove("is-panel-open");
  }

  function startDrag(event) {
    if (event.button !== 0) {
      return;
    }

    const rect = elements.widget.getBoundingClientRect();
    dragState = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false
    };

    elements.orb.setPointerCapture(event.pointerId);
    elements.orb.addEventListener("pointermove", dragMove);
    elements.orb.addEventListener("pointerup", endDrag);
    elements.orb.addEventListener("pointercancel", endDrag);
  }

  function dragMove(event) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragState.moved = true;
    settings = {
      ...settings,
      x: event.clientX - dragState.offsetX,
      y: event.clientY - dragState.offsetY
    };
    clampPosition();
    applyPosition();
  }

  function endDrag(event) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    elements.orb.releasePointerCapture(event.pointerId);
    elements.orb.removeEventListener("pointermove", dragMove);
    elements.orb.removeEventListener("pointerup", endDrag);
    elements.orb.removeEventListener("pointercancel", endDrag);

    saveFloatingOrbSettings(
      {
        ...settings,
        x: settings.x,
        y: settings.y
      },
      options.storage
    );
    dragState = undefined;
  }

  function restoreSavedPosition() {
    if (settings.x === null || settings.y === null) {
      settings = {
        ...settings,
        x: windowRef.innerWidth - ORB_SIZE - 24,
        y: windowRef.innerHeight - ORB_SIZE - 24
      };
    }

    clampPosition();
    applyPosition();
  }

  function clampPosition() {
    const maxX = Math.max(12, windowRef.innerWidth - ORB_SIZE - 12);
    const maxY = Math.max(12, windowRef.innerHeight - ORB_SIZE - 12);
    settings.x = Math.min(Math.max(12, settings.x), maxX);
    settings.y = Math.min(Math.max(12, settings.y), maxY);
  }

  function applyPosition() {
    if (!elements.widget) {
      return;
    }

    elements.widget.style.left = `${settings.x}px`;
    elements.widget.style.top = `${settings.y}px`;
  }

  async function openPictureInPicture() {
    if (!supportsDocumentPictureInPicture(windowRef) || (pipWindow && !pipWindow.closed)) {
      return;
    }

    try {
      pipWindow = await windowRef.documentPictureInPicture.requestWindow({
        width: 180,
        height: 240
      });
      pipWindow.document.body.innerHTML = `
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #10131a;
            font-family: Inter, system-ui, sans-serif;
            color: #f7f8fb;
          }
          .pip-shell {
            display: grid;
            gap: 0.75rem;
            justify-items: center;
            text-align: center;
            padding: 1rem;
          }
          .pip-orb {
            width: 5.5rem;
            aspect-ratio: 1;
            border: 0;
            border-radius: 999px;
            cursor: pointer;
            animation: orb-breathe 2400ms ease-in-out infinite;
          }
          body.is-listening .pip-orb {
            animation: orb-breathe 1200ms ease-in-out infinite;
          }
          body.is-thinking .pip-orb {
            filter: brightness(1.08);
          }
          body.is-speaking .pip-orb {
            transform: scale(1.04);
          }
          p {
            margin: 0;
            color: #aab2c5;
            font-size: 0.85rem;
            line-height: 1.4;
          }
          button {
            border: 0;
            border-radius: 999px;
            padding: 0.55rem 0.9rem;
            background: #7cdbb5;
            color: #07120e;
            font-weight: 700;
            cursor: pointer;
          }
          @keyframes orb-breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        </style>
        <div class="pip-shell">
          <button type="button" class="pip-orb" data-floating-orb-pip-orb aria-label="Restore Lil-G"></button>
          <p>${options.getAssistantName?.() || "Lil-G"} is listening in the background. Say its name to talk.</p>
          <button type="button" data-floating-orb-pip-restore>Open Lil-G</button>
        </div>
      `;

      const pipOrb = pipWindow.document.querySelector("[data-floating-orb-pip-orb]");
      applyOrbTheme(pipOrb, avatarColor);
      setActivityState(activityState);

      pipOrb.addEventListener("click", () => restore());
      pipWindow.document.querySelector("[data-floating-orb-pip-restore]")?.addEventListener("click", () => restore());
      pipWindow.addEventListener("pagehide", () => {
        pipWindow = undefined;
      });
    } catch {
      pipWindow = undefined;
    }
  }

  function closePictureInPicture() {
    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
    }

    pipWindow = undefined;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function publish(message) {
    setOrbStatus(message);
    options.onStatus?.(message);

    for (const listener of listeners) {
      listener(message);
    }
  }
}

export function supportsDocumentPictureInPicture(windowRef = globalThis.window) {
  return Boolean(windowRef?.documentPictureInPicture?.requestWindow);
}
