export const MEMORY_STORAGE_KEY = "lil-g-memories-v1";

const explicitRememberPattern = /^\s*remember(?:\s+that)?\s+(.+?)\s*$/i;
const namePatterns = [
  /^\s*my\s+name\s+is\s+(.+?)\s*$/i,
  /^\s*call\s+me\s+(.+?)\s*$/i,
  /^\s*i\s+go\s+by\s+(.+?)\s*$/i
];
const favoritePattern = /^\s*my\s+favorite\s+([a-z][a-z0-9\s-]{1,40})\s+is\s+(.+?)\s*$/i;
const preferencePattern = /^\s*i\s+(like|love|enjoy|prefer|hate|dislike)\s+(.+?)\s*$/i;
const speechStylePatterns = [
  /^\s*i\s+(?:usually\s+|often\s+)?(?:talk|speak)\s+(?:like|in)\s+(.+?)\s*$/i,
  /^\s*i\s+(?:usually\s+|often\s+)?say\s+(.+?)\s*$/i,
  /^\s*i\s+talk\s+about\s+(.+?)\s+a\s+lot\s*$/i
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

export function rememberAutomaticFacts(input, memories, options = {}) {
  const facts = extractAutomaticMemoryFacts(input);
  let updatedMemories = memories;
  const added = [];
  const duplicates = [];

  for (const fact of facts) {
    const result = rememberFact(fact, updatedMemories, options);

    if (!result.memory) {
      continue;
    }

    updatedMemories = result.memories;

    if (result.duplicate) {
      duplicates.push(result.memory);
      continue;
    }

    added.push(result.memory);
  }

  return {
    added,
    duplicates,
    memories: updatedMemories
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

export function extractAutomaticMemoryFacts(input) {
  const value = input.trim();

  if (!value || isQuestion(value) || explicitRememberPattern.test(value)) {
    return [];
  }

  const facts = [];
  const nameFact = extractNameFact(value);

  if (nameFact) {
    facts.push(nameFact);
  }

  const favoriteMatch = value.match(favoritePattern);

  if (favoriteMatch) {
    facts.push(`your favorite ${cleanFact(favoriteMatch[1])} is ${cleanFact(favoriteMatch[2])}`);
  }

  const preferenceMatch = value.match(preferencePattern);

  if (preferenceMatch && isWorthRemembering(preferenceMatch[2])) {
    facts.push(`you ${preferenceMatch[1].toLowerCase()} ${cleanFact(preferenceMatch[2])}`);
  }

  for (const pattern of speechStylePatterns) {
    const match = value.match(pattern);

    if (match && isWorthRemembering(match[1])) {
      facts.push(`your speech pattern includes ${cleanFact(match[1])}`);
      break;
    }
  }

  return [...new Set(facts)].slice(0, 2);
}

function cleanFact(value) {
  return value
    .trim()
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ");
}

function extractNameFact(input) {
  for (const pattern of namePatterns) {
    const match = input.match(pattern);

    if (match) {
      return cleanFact(`your name is ${match[1]}`);
    }
  }

  return "";
}

function isQuestion(value) {
  return value.includes("?") || /^(?:what|why|how|when|where|who|can|could|would|should|do|does|did)\b/i.test(value);
}

function isWorthRemembering(value) {
  const fact = cleanFact(value);

  return fact.length >= 3 && fact.length <= 120;
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
