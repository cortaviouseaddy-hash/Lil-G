export const RAID_LIST_STORAGE_KEY = "lil-g-raid-list-v1";

const defaultRaidList = {
  active: false,
  setupStep: "",
  raidName: "",
  startTime: "",
  groupSize: 5,
  announcementMessageId: "",
  signups: [],
  nextIndex: 0,
  currentGroupIds: []
};

const listCommandPattern = /^\s*\/list(?:\s+(.+))?\s*$/i;
const helpPattern = /^(?:help|commands?)$/i;
const cancelPattern = /^(?:cancel|stop setup)$/i;
const clearPattern = /^(?:clear|reset|close|end)$/i;
const statusPattern = /^(?:status|line|queue)$/i;
const announcePattern = /^(?:announce|announcement|message)$/i;
const nextPattern = /^(?:next|done|complete|alert)$/i;
const yesPattern = /^(?:yes|add|in)\b\s*(.*)$/i;
const removePattern = /^remove\s+(.+)$/i;
const sizePattern = /^size\s+(\d{1,2})$/i;
const timePattern = /^(?:time|start|starts|starting)\s+(.+)$/i;

export function loadRaidList(storage = globalThis.localStorage) {
  if (!storage) {
    return { ...defaultRaidList };
  }

  try {
    const rawList = storage.getItem(RAID_LIST_STORAGE_KEY);
    return normalizeRaidList(rawList ? JSON.parse(rawList) : {});
  } catch {
    return { ...defaultRaidList };
  }
}

export function saveRaidList(raidList, storage = globalThis.localStorage) {
  const normalizedList = normalizeRaidList(raidList);

  if (!storage) {
    return normalizedList;
  }

  try {
    storage.setItem(RAID_LIST_STORAGE_KEY, JSON.stringify(normalizedList));
  } catch {
    return normalizedList;
  }

  return normalizedList;
}

export function clearRaidList(storage = globalThis.localStorage) {
  try {
    storage?.removeItem(RAID_LIST_STORAGE_KEY);
  } catch {
    return { ...defaultRaidList };
  }

  return { ...defaultRaidList };
}

export function isRaidListInput(input, raidList = defaultRaidList) {
  return listCommandPattern.test(input) || Boolean(normalizeRaidList(raidList).setupStep);
}

export function handleRaidListInput(input, raidList = defaultRaidList, options = {}) {
  const state = normalizeRaidList(raidList);
  const commandMatch = input.match(listCommandPattern);

  if (!commandMatch && !state.setupStep) {
    return {
      handled: false,
      raidList: state,
      reply: ""
    };
  }

  const body = (commandMatch ? commandMatch[1] ?? "" : input).trim();

  if (commandMatch && helpPattern.test(body)) {
    return createHandledResult(state, formatRaidListHelp());
  }

  if (commandMatch && cancelPattern.test(body)) {
    return createHandledResult(
      {
        ...state,
        setupStep: ""
      },
      state.active ? "Setup canceled. Your current raid list is still active." : "Setup canceled."
    );
  }

  if (commandMatch && clearPattern.test(body)) {
    return createHandledResult(
      { ...defaultRaidList },
      "Raid list closed and cleared. Start a new owner-only list with /list."
    );
  }

  const sizeMatch = commandMatch ? body.match(sizePattern) : undefined;

  if (sizeMatch) {
    return updateGroupSize(state, Number(sizeMatch[1]));
  }

  if (commandMatch && statusPattern.test(body)) {
    return createHandledResult(state, formatRaidListStatus(state));
  }

  if (commandMatch && announcePattern.test(body)) {
    return state.active
      ? createHandledResult(state, formatAnnouncementReply(state))
      : createHandledResult(state, "Start a raid list first with /list <raid name>.");
  }

  if (commandMatch && nextPattern.test(body)) {
    return state.active
      ? advanceRaidGroup(state)
      : createHandledResult(state, "Start a raid list first with /list <raid name>.");
  }

  const yesMatch = commandMatch ? body.match(yesPattern) : undefined;

  if (yesMatch) {
    return state.active
      ? addSignupNames(state, yesMatch[1], options)
      : createHandledResult(state, "Start a raid list first with /list <raid name>.");
  }

  const removeMatch = commandMatch ? body.match(removePattern) : undefined;

  if (removeMatch) {
    return state.active
      ? removeSignupName(state, removeMatch[1])
      : createHandledResult(state, "Start a raid list first with /list <raid name>.");
  }

  if (!body) {
    if (state.active && !state.setupStep) {
      return createHandledResult(state, formatRaidListStatus(state));
    }

    return createHandledResult(
      {
        ...state,
        active: false,
        setupStep: "raid"
      },
      "Owner-only /list setup started. What raid are you running, and what time should I tell the queue it starts? You can answer like: Mega Rayquaza at 8 PM."
    );
  }

  if (state.setupStep) {
    return continueSetup(state, body);
  }

  const timeMatch = commandMatch ? body.match(timePattern) : undefined;

  if (timeMatch && state.active) {
    const updatedList = {
      ...state,
      startTime: cleanText(timeMatch[1])
    };

    return createHandledResult(updatedList, formatAnnouncementReply(updatedList));
  }

  return startListFromText(state, body);
}

export function setRaidListAnnouncementMessage(raidList, messageId) {
  return normalizeRaidList({
    ...raidList,
    announcementMessageId: cleanText(messageId)
  });
}

export function handleRaidListReply(replyEvent, raidList = defaultRaidList, options = {}) {
  const state = normalizeRaidList(raidList);

  if (!state.active) {
    return createUnhandledResult(state);
  }

  const replyContent = typeof replyEvent === "string" ? replyEvent : (replyEvent?.content ?? "");

  if (!isAutomaticSignupReply(replyContent)) {
    return createUnhandledResult(state);
  }

  if (state.announcementMessageId) {
    const repliedToMessageId = cleanText(
      replyEvent?.repliedToMessageId
        ?? replyEvent?.messageReferenceId
        ?? replyEvent?.referenceMessageId
        ?? replyEvent?.parentMessageId
        ?? ""
    );

    if (repliedToMessageId !== state.announcementMessageId) {
      return createUnhandledResult(state);
    }
  }

  const name = cleanText(
    replyEvent?.authorName
      ?? replyEvent?.authorDisplayName
      ?? replyEvent?.displayName
      ?? replyEvent?.username
      ?? options.fallbackName
      ?? ""
  );

  if (!name) {
    return createHandledResult(state, "A yes reply came in, but I need the sender name before I can add them.");
  }

  const result = addSignupNames(state, name, options);
  const didAddSignup = result.raidList.signups.length > state.signups.length;

  return {
    ...result,
    reply: didAddSignup
      ? `Auto-added ${name} from their yes reply.\n\n${formatRaidListStatus(result.raidList)}`
      : `${name} already replied yes and is in line.\n\n${formatRaidListStatus(result.raidList)}`
  };
}

export function createRaidListEmbed(raidList = defaultRaidList) {
  const state = normalizeRaidList(raidList);
  const signups = state.signups.length
    ? state.signups.map((signup, index) => `${index + 1}. ${signup.name}`).join("\n")
    : "No one is in line yet. Reply yes to get added.";
  const currentGroup = state.signups.filter((signup) => state.currentGroupIds.includes(signup.id));
  const waitingCount = Math.max(state.signups.length - state.nextIndex, 0);

  return {
    title: state.active ? `${state.raidName} raid list` : "Raid list",
    description: state.active
      ? `I'm doing ${state.raidName} raids back to back starting at ${state.startTime}. Reply yes to this message to get in line. I'm also streaming it.`
      : "Start a raid list with /list.",
    fields: [
      {
        name: "Line",
        value: signups
      },
      {
        name: "Current set",
        value: currentGroup.length ? formatNameList(currentGroup.map((signup) => signup.name)) : "None alerted yet"
      },
      {
        name: "Waiting",
        value: `${waitingCount} waiting`
      }
    ]
  };
}

export function formatRaidListHelp() {
  return `Owner-only /list commands:
/list - start setup and ask for the raid/time
/list <raid name> - start a list for that raid, then I ask for the time
/list yes <name> - add someone who replied yes
/list next - alert the next ${defaultRaidList.groupSize}-person set when it is time
/list done - same as /list next after you finish a raid
/list status - show the current line
/list size <number> - change how many people go in each set
/list announce - show the queue announcement again
/list close - clear the raid list

Only you use these commands. Everyone else just replies yes to your announcement. If this helper is connected to a Discord bot, yes replies to the tracked embed/message can be added automatically.`;
}

function continueSetup(state, body) {
  if (state.setupStep === "time") {
    const timeMatch = body.match(timePattern);
    return completeSetup({
      ...state,
      startTime: cleanText(timeMatch ? timeMatch[1] : body)
    });
  }

  const details = parseRaidDetails(body);

  if (details.raidName && details.startTime) {
    return completeSetup({
      ...state,
      raidName: details.raidName,
      startTime: details.startTime
    });
  }

  if (details.raidName) {
    return createHandledResult(
      {
        ...state,
        raidName: details.raidName,
        setupStep: "time"
      },
      `Got it: ${details.raidName}. What time should I tell the queue it starts?`
    );
  }

  return createHandledResult(state, "Tell me the raid name and start time, like: Mega Rayquaza at 8 PM.");
}

function startListFromText(state, body) {
  const details = parseRaidDetails(body);

  if (details.raidName && details.startTime) {
    return completeSetup({
      ...defaultRaidList,
      raidName: details.raidName,
      startTime: details.startTime,
      groupSize: state.groupSize
    });
  }

  if (details.raidName) {
    return createHandledResult(
      {
        ...defaultRaidList,
        raidName: details.raidName,
        groupSize: state.groupSize,
        setupStep: "time"
      },
      `Owner-only /list setup started for ${details.raidName}. What time should I tell the queue it starts?`
    );
  }

  return createHandledResult(
    {
      ...defaultRaidList,
      setupStep: "raid"
    },
    "What raid are you running, and what time should I tell the queue it starts?"
  );
}

function completeSetup(state) {
  const updatedList = normalizeRaidList({
    ...state,
    active: true,
    setupStep: "",
    announcementMessageId: "",
    signups: [],
    nextIndex: 0,
    currentGroupIds: []
  });

  if (!updatedList.raidName || !updatedList.startTime) {
    return createHandledResult(
      {
        ...updatedList,
        active: false,
        setupStep: updatedList.raidName ? "time" : "raid"
      },
      updatedList.raidName
        ? `Got it: ${updatedList.raidName}. What time should I tell the queue it starts?`
        : "What raid are you running, and what time should I tell the queue it starts?"
    );
  }

  return createHandledResult(updatedList, formatAnnouncementReply(updatedList));
}

function addSignupNames(state, rawNames, options = {}) {
  const names = parseSignupNames(rawNames);

  if (!names.length) {
    return createHandledResult(state, "Tell me whose yes reply this is, like: /list yes Corey.");
  }

  const existingNames = new Set(state.signups.map((signup) => normalizeName(signup.name)));
  const added = [];
  const duplicates = [];
  const signups = [...state.signups];

  for (const name of names) {
    const normalizedName = normalizeName(name);

    if (existingNames.has(normalizedName)) {
      duplicates.push(name);
      continue;
    }

    existingNames.add(normalizedName);
    const signup = {
      id: options.createId?.(name) ?? createRaidListId(),
      name,
      joinedAt: options.now ?? new Date().toISOString()
    };
    added.push(signup);
    signups.push(signup);
  }

  const updatedList = {
    ...state,
    signups
  };

  const addedText = added.length
    ? `Added ${formatNameList(added.map((signup) => signup.name))} to the line.`
    : "No new names added.";
  const duplicateText = duplicates.length ? ` Already in line: ${formatNameList(duplicates)}.` : "";

  return createHandledResult(updatedList, `${addedText}${duplicateText}\n\n${formatRaidListStatus(updatedList)}`);
}

function removeSignupName(state, rawName) {
  const name = cleanText(rawName);
  const normalizedName = normalizeName(name);

  if (!normalizedName) {
    return createHandledResult(state, "Tell me who to remove, like: /list remove Corey.");
  }

  const removedSignup = state.signups.find((signup) => normalizeName(signup.name) === normalizedName);

  if (!removedSignup) {
    return createHandledResult(state, `${name} is not in the current raid line.`);
  }

  const signups = state.signups.filter((signup) => signup.id !== removedSignup.id);
  const removedIndex = state.signups.findIndex((signup) => signup.id === removedSignup.id);
  const nextIndex = removedIndex >= 0 && removedIndex < state.nextIndex ? Math.max(0, state.nextIndex - 1) : state.nextIndex;
  const updatedList = {
    ...state,
    signups,
    nextIndex: Math.min(nextIndex, signups.length),
    currentGroupIds: state.currentGroupIds.filter((id) => id !== removedSignup.id)
  };

  return createHandledResult(updatedList, `Removed ${removedSignup.name} from the raid line.\n\n${formatRaidListStatus(updatedList)}`);
}

function updateGroupSize(state, groupSize) {
  if (!Number.isInteger(groupSize) || groupSize < 1 || groupSize > 20) {
    return createHandledResult(state, "Pick a group size from 1 to 20, like: /list size 5.");
  }

  return createHandledResult(
    {
      ...state,
      groupSize
    },
    `Raid list group size set to ${groupSize}. Use /list next to alert the next set.`
  );
}

function advanceRaidGroup(state) {
  const nextGroup = state.signups.slice(state.nextIndex, state.nextIndex + state.groupSize);

  if (!nextGroup.length) {
    return createHandledResult(
      state,
      state.signups.length
        ? "Everyone currently in line has already been alerted. Add more yes replies with /list yes <name>."
        : "No one is in line yet. Add yes replies with /list yes <name>."
    );
  }

  const updatedList = {
    ...state,
    nextIndex: state.nextIndex + nextGroup.length,
    currentGroupIds: nextGroup.map((signup) => signup.id)
  };

  return createHandledResult(updatedList, formatNextGroupAlert(updatedList, nextGroup));
}

function formatAnnouncementReply(state) {
  return `Owner-only /list is ready. Copy/send this to everyone in that queue:

${formatQueueAnnouncement(state)}

If this is connected to a Discord bot, yes replies to that message can be added to the embed list automatically. In this browser app, use /list yes <name> for pasted/manual replies. When you finish a raid, use /list next or /list done to alert the next set of people.`;
}

function formatQueueAnnouncement(state) {
  return `Raid list for ${state.raidName}
I'm doing a bunch of ${state.raidName} raids back to back starting at ${state.startTime}. If you want in, reply yes to this message and I'll put you in line. I'm also streaming it.`;
}

function formatNextGroupAlert(state, group) {
  const previousGroupText = state.nextIndex > group.length ? "Marked the last set done.\n\n" : "";

  return `${previousGroupText}Next raid group alert:

${formatNameList(group.map((signup) => signup.name))} - it's time for ${state.raidName}. I'm streaming this run now, so be ready to join.

Copy/send that alert to those people.`;
}

function formatRaidListStatus(state) {
  if (!state.active) {
    if (state.setupStep === "raid") {
      return "Owner-only /list setup is waiting for the raid name and start time.";
    }

    if (state.setupStep === "time") {
      return `Owner-only /list setup is waiting for the start time for ${state.raidName}.`;
    }

    return "No raid list is active. Start one with /list.";
  }

  const currentGroup = state.signups.filter((signup) => state.currentGroupIds.includes(signup.id));
  const waiting = state.signups.slice(state.nextIndex);
  const alertedCount = Math.min(state.nextIndex, state.signups.length);

  return `Raid list status:
Raid: ${state.raidName}
Start time: ${state.startTime}
Group size: ${state.groupSize}
Signed up: ${state.signups.length}
Alerted already: ${alertedCount}
Current set: ${currentGroup.length ? formatNameList(currentGroup.map((signup) => signup.name)) : "none yet"}
Waiting next: ${waiting.length ? waiting.map((signup, index) => `${index + 1}. ${signup.name}`).join("\n") : "no one waiting"}`;
}

function parseRaidDetails(value) {
  const cleanedValue = cleanText(value);
  const atMatch = cleanedValue.match(/^(.+?)\s+(?:starts?\s+at|starting\s+at|at|@)\s+(.+)$/i);

  if (atMatch) {
    return {
      raidName: cleanText(atMatch[1]),
      startTime: cleanText(atMatch[2])
    };
  }

  return {
    raidName: cleanedValue,
    startTime: ""
  };
}

function parseSignupNames(value) {
  return value
    .split(/\n|,|;|\s+\+\s+/)
    .map(cleanText)
    .filter(Boolean)
    .slice(0, 25);
}

function normalizeRaidList(raidList = {}) {
  const signups = Array.isArray(raidList.signups) ? raidList.signups.filter(isValidSignup) : [];
  const currentGroupIds = Array.isArray(raidList.currentGroupIds)
    ? raidList.currentGroupIds.filter((id) => signups.some((signup) => signup.id === id))
    : [];
  const groupSize = Number.isInteger(raidList.groupSize) && raidList.groupSize >= 1 && raidList.groupSize <= 20
    ? raidList.groupSize
    : defaultRaidList.groupSize;

  return {
    active: Boolean(raidList.active && raidList.raidName && raidList.startTime),
    setupStep: ["raid", "time"].includes(raidList.setupStep) ? raidList.setupStep : "",
    raidName: cleanText(raidList.raidName ?? ""),
    startTime: cleanText(raidList.startTime ?? ""),
    groupSize,
    announcementMessageId: cleanText(raidList.announcementMessageId ?? ""),
    signups,
    nextIndex: Math.min(Math.max(Number.isInteger(raidList.nextIndex) ? raidList.nextIndex : 0, 0), signups.length),
    currentGroupIds
  };
}

function cleanText(value) {
  return String(value ?? "")
    .trim()
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ");
}

function normalizeName(value) {
  return cleanText(value).toLowerCase();
}

function formatNameList(names) {
  if (!names.length) {
    return "";
  }

  if (names.length === 1) {
    return names[0];
  }

  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function isAutomaticSignupReply(content) {
  return /^\s*(?:yes|yeah|yep|yup|y|in|me|invite me|i'?m in|im in)(?:\s+please)?[\s!.]*$/i.test(content);
}

function createUnhandledResult(raidList) {
  return {
    handled: false,
    raidList: normalizeRaidList(raidList),
    reply: ""
  };
}

function createHandledResult(raidList, reply) {
  return {
    handled: true,
    raidList: normalizeRaidList(raidList),
    reply
  };
}

function createRaidListId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `raid-signup-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isValidSignup(signup) {
  return Boolean(signup && typeof signup.id === "string" && typeof signup.name === "string");
}
