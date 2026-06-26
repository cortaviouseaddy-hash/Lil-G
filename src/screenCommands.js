const clickPattern =
  /^\s*(?:click|tap|press)\s+(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+times?\s+)?(?:on\s+)?(?:the\s+)?(.+?)\s*$/i;
const doubleClickPattern = /^\s*double\s+(?:click|tap)\s+(?:on\s+)?(?:the\s+)?(.+?)\s*$/i;
const typePattern =
  /^\s*type\s+(.+?)(?:\s+(?:in|into|inside|on)\s+(?:the\s+)?(.+?))?\s*$/i;
const typeHerePattern = /^\s*(?:write|enter|input)\s+(.+?)(?:\s+(?:in|into|here)\s*)?$/i;
const keyPattern = /^\s*press\s+(enter|return|tab|escape|esc|backspace|delete|space)\s*$/i;
const scrollPattern = /^\s*scroll\s+(up|down)(?:\s+(\d+))?\s*$/i;
const lookPattern =
  /\b(?:look at|see|read|scan|what(?:'s| is)? on)\b.*\b(?:my\s+)?screen\b|\bdescribe\s+(?:my\s+)?screen\b/i;
const screenControlHelpPattern =
  /\b(?:how (?:do|can) i (?:use )?)?(?:screen control|voice control)\b|\b(?:click|tap|type)\s+for me\b/i;

const wordToNumber = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10
};

export function detectScreenCommand(input) {
  const content = input.trim();

  if (!content) {
    return { isScreenCommand: false };
  }

  if (lookPattern.test(content)) {
    return {
      isScreenCommand: true,
      action: "describe",
      raw: content
    };
  }

  if (screenControlHelpPattern.test(content) && !doubleClickPattern.test(content) && !clickPattern.test(content) && !typePattern.test(content)) {
    return {
      isScreenCommand: true,
      action: "help",
      raw: content
    };
  }

  const doubleClickMatch = content.match(doubleClickPattern);

  if (doubleClickMatch) {
    return {
      isScreenCommand: true,
      action: "double_click",
      target: cleanCommandText(doubleClickMatch[1]),
      times: 1,
      raw: content
    };
  }

  const clickMatch = content.match(clickPattern);

  if (clickMatch && !isGenericPressPhrase(clickMatch[2])) {
    return {
      isScreenCommand: true,
      action: "click",
      target: cleanCommandText(clickMatch[2]),
      times: parseTimes(clickMatch[1]),
      raw: content
    };
  }

  const typeMatch = content.match(typePattern) ?? content.match(typeHerePattern);

  if (typeMatch) {
    return {
      isScreenCommand: true,
      action: "type",
      text: cleanQuotedText(typeMatch[1]),
      target: typeMatch[2] ? cleanCommandText(typeMatch[2]) : "",
      raw: content
    };
  }

  const keyMatch = content.match(keyPattern);

  if (keyMatch) {
    return {
      isScreenCommand: true,
      action: "key",
      key: normalizeKey(keyMatch[1]),
      raw: content
    };
  }

  const scrollMatch = content.match(scrollPattern);

  if (scrollMatch) {
    return {
      isScreenCommand: true,
      action: "scroll",
      direction: scrollMatch[1].toLowerCase(),
      amount: scrollMatch[2] ? Number(scrollMatch[2]) : 3,
      raw: content
    };
  }

  return { isScreenCommand: false };
}

export function formatScreenCommandReply(result) {
  if (!result?.ok) {
    return result?.message ?? "I could not complete that screen action.";
  }

  switch (result.action) {
    case "describe":
      return result.summary
        ? `Here is what I can read on your screen:\n\n${result.summary}`
        : "I looked at your screen, but I could not read any text from it.";
    case "click":
      return result.times > 1
        ? `Done. I clicked "${result.target}" ${result.times} times.`
        : `Done. I clicked "${result.target}".`;
    case "double_click":
      return `Done. I double-clicked "${result.target}".`;
    case "type":
      return result.target
        ? `Done. I typed "${result.text}" into "${result.target}".`
        : `Done. I typed "${result.text}".`;
    case "key":
      return `Done. I pressed ${result.key}.`;
    case "scroll":
      return `Done. I scrolled ${result.direction}.`;
    case "help":
      return formatScreenControlHelp();
    default:
      return result.message ?? "Screen action completed.";
  }
}

export function formatScreenControlDisabledReply() {
  return "Voice screen control is turned off. Open Settings and turn on Voice screen control to use look, click, tap, and type commands.";
}

export function formatScreenControlHelp() {
  return [
    "Voice screen control works when it is turned on in Settings and the Lil-G desktop companion is running and connected.",
    "",
    "Try commands like:",
    '- "look at my screen"',
    '- "click on Submit"',
    '- "tap Settings 3 times"',
    '- "double click on the file icon"',
    '- "type hello world"',
    '- "type my password in the search box"',
    '- "press enter"',
    '- "scroll down"',
    "",
    "Start wake listening or tap the mic, then say your command. You can chain as many click and type commands as you need."
  ].join("\n");
}

export function formatCompanionUnavailableReply() {
  return [
    "I need the Lil-G desktop companion running on your computer to click, tap, or type on your screen.",
    "",
    "1. Open a terminal in the Lil-G project folder.",
    "2. Run: pip install -r companion/requirements.txt",
    "3. Install Tesseract OCR on your system if you have not already.",
    "4. Run: python companion/lilg_companion.py",
    "5. In Lil-G settings, connect to the companion, then try your voice command again.",
    "",
    'You can still say "look at my screen" after sharing your screen, but full click and type control needs the companion.'
  ].join("\n");
}

function parseTimes(value) {
  if (!value) {
    return 1;
  }

  const normalized = value.toLowerCase();

  if (wordToNumber[normalized]) {
    return wordToNumber[normalized];
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function cleanCommandText(value) {
  return value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ");
}

function cleanQuotedText(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return cleanCommandText(trimmed);
}

function normalizeKey(value) {
  const key = value.toLowerCase();

  if (key === "return") {
    return "enter";
  }

  if (key === "esc") {
    return "escape";
  }

  return key;
}

function isGenericPressPhrase(target) {
  return /^(enter|return|tab|escape|esc|backspace|delete|space)$/i.test(target);
}
