export const MEMORY_STORAGE_KEY = "lil-g-memories-v1";

const explicitRememberPattern = /^\s*remember(?:\s+that)?\s+(.+?)\s*$/i;
const namePatterns = [
  /^\s*my\s+name\s+is\s+(.+?)\s*$/i,
  /^\s*call\s+me\s+(.+?)\s*$/i
];
const recallPattern = /\b(what do you remember|do you remember|remember about me|my memories)\b/i;
const clearPattern = /\b(forget everything|clear memory|delete memory|reset memory|forget what you remember)\b/i;

export function loadMemories(storage = globalThis.localStorage) {
  if (!storage) {
    return [];
  }

  try {
    const rawMemories = storage.getItem(MEMORY_STORAGE_KEY);
    const memories = rawMemories ? JSON.parse(rawMemories) : [];

    return Array.isArray(memories) ? memories.filter(isValidMemory) : [];
  } catch {
    return [];
  }
}

export function saveMemories(memories, storage = globalThis.localStorage) {
  if (!storage) {
    return memories;
  }

  try {
    storage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories.filter(isValidMemory)));
  } catch {
    return memories;
  }

  return memories;
}

export function extractMemoryFact(input) {
  const explicitMatch = input.match(explicitRememberPattern);

  if (explicitMatch) {
    return cleanFact(explicitMatch[1]);
  }

  for (const pattern of namePatterns) {
    const match = input.match(pattern);

    if (match) {
      return cleanFact(`your name is ${match[1]}`);
    }
  }

  return "";
}

export function isMemoryRecallRequest(input) {
  return recallPattern.test(input);
}

export function isClearMemoryRequest(input) {
  return clearPattern.test(input);
}

export function rememberFact(input, memories, options = {}) {
  const text = cleanFact(input);

  if (!text) {
    return {
      memory: undefined,
      memories
    };
  }

  const existingMemory = memories.find((memory) => normalizeMemoryText(memory.text) === normalizeMemoryText(text));

  if (existingMemory) {
    return {
      memory: existingMemory,
      memories,
      duplicate: true
    };
  }

  const memory = {
    id: options.id ?? createMemoryId(),
    text,
    createdAt: options.createdAt ?? new Date().toISOString()
  };

  return {
    memory,
    memories: [...memories, memory],
    duplicate: false
  };
}

export function clearMemories(storage = globalThis.localStorage) {
  try {
    storage.removeItem(MEMORY_STORAGE_KEY);
  } catch {
    return [];
  }

  return [];
}

export function formatMemoryList(memories) {
  if (!memories.length) {
    return "I do not have any memories saved yet. Say something like, \"remember that my favorite music is jazz.\"";
  }

  const formattedMemories = memories.map((memory, index) => `${index + 1}. ${memory.text}`).join("\n");
  return `Here's what I remember:\n${formattedMemories}`;
}

export function getRelevantMemoryText(input, memories, limit = 2) {
  const tokens = new Set(tokenize(input));
  const scoredMemories = memories
    .map((memory) => ({
      memory,
      score: tokenize(memory.text).filter((token) => tokens.has(token)).length
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ memory }) => memory.text);

  return scoredMemories;
}

function cleanFact(value) {
  return value
    .trim()
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ");
}

function createMemoryId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isValidMemory(memory) {
  return Boolean(memory && typeof memory.id === "string" && typeof memory.text === "string");
}

function normalizeMemoryText(value) {
  return value.trim().toLowerCase();
}

function tokenize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}
