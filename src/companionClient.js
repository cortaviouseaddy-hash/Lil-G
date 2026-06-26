const DEFAULT_COMPANION_URL = "ws://127.0.0.1:8765";
const REQUEST_TIMEOUT_MS = 15000;

export function createCompanionClient(options = {}) {
  const WebSocketImpl = options.WebSocketImpl ?? globalThis.WebSocket;
  const storage = options.storage ?? globalThis.localStorage;
  const storageKey = options.storageKey ?? "lil-g-companion-url-v1";

  let socket;
  let pendingRequest;
  let connectionState = "disconnected";
  let listeners = new Set();

  function getUrl() {
    return storage?.getItem(storageKey) || options.url || DEFAULT_COMPANION_URL;
  }

  function saveUrl(url) {
    if (!storage) {
      return url;
    }

    storage.setItem(storageKey, url);
    return url;
  }

  function notify() {
    for (const listener of listeners) {
      listener(getStatus());
    }
  }

  function getStatus() {
    return {
      state: connectionState,
      url: getUrl(),
      connected: connectionState === "connected"
    };
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(getStatus());

    return () => {
      listeners.delete(listener);
    };
  }

  function connect(url = getUrl()) {
    if (!WebSocketImpl) {
      connectionState = "unsupported";
      notify();
      return Promise.resolve(getStatus());
    }

    saveUrl(url);
    disconnect();

    return new Promise((resolve) => {
      connectionState = "connecting";
      notify();

      try {
        socket = new WebSocketImpl(url);
      } catch {
        connectionState = "error";
        notify();
        resolve(getStatus());
        return;
      }

      const handleOpen = () => {
        connectionState = "connected";
        notify();
        resolve(getStatus());
      };

      const handleError = () => {
        if (connectionState !== "connected") {
          connectionState = "error";
          notify();
          resolve(getStatus());
        }
      };

      const handleClose = () => {
        if (pendingRequest) {
          pendingRequest.reject(new Error("Companion disconnected."));
          pendingRequest = undefined;
        }

        connectionState = "disconnected";
        notify();
      };

      const handleMessage = (event) => {
        if (!pendingRequest) {
          return;
        }

        let payload;

        try {
          payload = JSON.parse(event.data);
        } catch {
          pendingRequest.reject(new Error("Companion sent an invalid response."));
          pendingRequest = undefined;
          return;
        }

        if (payload.id !== pendingRequest.id) {
          return;
        }

        clearTimeout(pendingRequest.timeoutId);
        pendingRequest.resolve(payload);
        pendingRequest = undefined;
      };

      socket.addEventListener("open", handleOpen, { once: true });
      socket.addEventListener("error", handleError, { once: true });
      socket.addEventListener("close", handleClose);
      socket.addEventListener("message", handleMessage);
    });
  }

  function disconnect() {
    if (pendingRequest) {
      pendingRequest.reject(new Error("Companion disconnected."));
      pendingRequest = undefined;
    }

    if (socket) {
      socket.close();
      socket = undefined;
    }

    connectionState = "disconnected";
    notify();
  }

  function sendRequest(payload) {
    if (!socket || socket.readyState !== 1) {
      return Promise.reject(new Error("Companion is not connected."));
    }

    const id = createRequestId();

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (pendingRequest?.id === id) {
          pendingRequest = undefined;
          reject(new Error("Companion request timed out."));
        }
      }, REQUEST_TIMEOUT_MS);

      pendingRequest = {
        id,
        resolve,
        reject,
        timeoutId
      };

      socket.send(JSON.stringify({ ...payload, id }));
    });
  }

  async function executeScreenCommand(command) {
    const response = await sendRequest(buildCompanionPayload(command));
    return normalizeCompanionResponse(command, response);
  }

  return {
    connect,
    disconnect,
    executeScreenCommand,
    getStatus,
    getUrl,
    saveUrl,
    subscribe
  };
}

export function buildCompanionPayload(command) {
  switch (command.action) {
    case "describe":
      return { action: "describe_screen" };
    case "click":
      return {
        action: "click",
        target: command.target,
        times: command.times ?? 1
      };
    case "double_click":
      return {
        action: "double_click",
        target: command.target
      };
    case "type":
      return {
        action: "type",
        text: command.text,
        target: command.target || undefined
      };
    case "key":
      return {
        action: "key",
        key: command.key
      };
    case "scroll":
      return {
        action: "scroll",
        direction: command.direction,
        amount: command.amount ?? 3
      };
    default:
      return { action: command.action };
  }
}

export function normalizeCompanionResponse(command, response) {
  if (!response?.ok) {
    return {
      ok: false,
      action: command.action,
      message: response?.message ?? "The companion could not complete that action."
    };
  }

  return {
    ok: true,
    action: command.action,
    target: response.target ?? command.target,
    text: response.text ?? command.text,
    times: response.times ?? command.times ?? 1,
    key: response.key ?? command.key,
    direction: response.direction ?? command.direction,
    summary: response.summary ?? "",
    message: response.message ?? ""
  };
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
