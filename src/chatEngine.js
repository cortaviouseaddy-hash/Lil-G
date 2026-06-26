const normalizers = [
  {
    pattern: /\b(hi|hello|hey|yo|sup)\b/i,
    response:
      "Hey, I'm Lil-G. I'm here with you. Tell me what's on your mind, or ask me for help with something specific."
  },
  {
    pattern: /\b(who are you|your name|what are you)\b/i,
    response:
      "I'm Lil-G, your browser-based AI companion. I can reply in chat and speak my answers out loud when talk-back is turned on."
  },
  {
    pattern: /\b(role[-\s]?play|pretend|act as|play a scene|play a character)\b/i,
    response:
      "Absolutely. I can roleplay with you in chat. Tell me the scene, who you want me to be, and any boundaries or style you want, then I'll stay in character."
  },
  {
    pattern: /\bdiscord\b.*\b(read|reply|message|dm|messages)\b|\b(read|reply|message|dm)\b.*\bdiscord\b/i,
    response:
      "I can help write Discord replies if you paste the messages here. This browser app cannot directly read your Discord account or send messages for you without an approved Discord bot, OAuth flow, or native companion app permission."
  },
  {
    pattern: /\b(floating orb|minimize|minimized mode|background mode)\b/i,
    response:
      "Turn on Floating orb mode in Settings, pick your avatar glow color, then tap Minimize to orb. Lil-G stays awake in the background as a draggable orb you can move anywhere."
  },
  {
    pattern: /\b(self thinking|think through|show your thinking|reasoning)\b/i,
    response:
      "Turn on Self thinking in Settings under AI behavior. When it is on, I show my reasoning steps in a collapsible block before my final answer."
  },
  {
    pattern: /\b(what can you do|features|capabilities)\b/i,
    response:
      "I can answer back, talk out loud, search the internet, remember local profile facts, think through answers when self thinking is on, and with the Lil-G desktop companion connected I can look at your screen and follow voice commands to click, tap, and type where you tell me."
  },
  {
    pattern: /\b(screen control|click for me|type for me|voice click|voice tap)\b/i,
    response:
      'Connect the Lil-G desktop companion, then say commands like "look at my screen", "click on Submit", "tap Settings 3 times", or "type hello in the search box".'
  },
  {
    pattern: /\b(sad|upset|angry|mad|lonely|stressed|anxious)\b/i,
    response:
      "I'm sorry you're dealing with that. Take one slow breath with me. What's the biggest thing weighing on you right now?"
  },
  {
    pattern: /\b(joke|funny|make me laugh)\b/i,
    response:
      "Why did the robot bring a ladder to the conversation? Because it wanted to take the chat to the next level."
  },
  {
    pattern: /\b(thanks|thank you|appreciate)\b/i,
    response:
      "You're welcome. I'm right here whenever you want to keep talking."
  },
  {
    pattern: /\b(stop talking|be quiet|mute)\b/i,
    response:
      "Got it. You can turn talk-back off with the voice toggle, and I'll keep replying in text."
  }
];

const reflectiveOpeners = [
  "I hear you.",
  "That's interesting.",
  "I'm thinking about that with you.",
  "Let's work through that."
];

const followUps = [
  "What would you like to happen next?",
  "Can you tell me a little more?",
  "What part should we focus on first?",
  "Do you want advice, ideas, or just someone to listen?"
];

const replyLengths = ["short", "medium", "long"];

export function createUserMessage(content) {
  return {
    role: "user",
    content: content.trim(),
    createdAt: new Date().toISOString()
  };
}

export function createAssistantMessage(content, metadata = {}) {
  return {
    role: "assistant",
    content,
    ...metadata,
    createdAt: new Date().toISOString()
  };
}

export function getLilGResponse(input, history = [], context = {}) {
  const message = input.trim();
  const replyLength = normalizeReplyLength(context.replyLength);

  if (!message) {
    return "I'm listening. Type something or use the mic so I know what to respond to.";
  }

  const memoryContext = formatMemoryContext(context.relevantMemories);
  const mathResponse = answerMathQuestion(message, memoryContext, replyLength);

  if (mathResponse) {
    return mathResponse;
  }

  const matchedRule = normalizers.find(({ pattern }) => pattern.test(message));

  if (matchedRule) {
    return matchedRule.response;
  }

  const intentResponse = answerByIntent(message, memoryContext, replyLength);

  if (intentResponse) {
    return intentResponse;
  }

  if (isQuestion(message)) {
    return answerOpenQuestion(message, memoryContext, replyLength);
  }

  const previousAssistantReplies = history.filter((entry) => entry.role === "assistant").length;
  const opener = pickFrom(reflectiveOpeners, message.length + previousAssistantReplies);
  const followUp = pickFrom(followUps, message.length + history.length);

  if (replyLength === "short") {
    return `${opener}${memoryContext} ${followUp}`;
  }

  if (replyLength === "long") {
    return `${opener}${memoryContext} You said: "${message}". Here is what I am hearing: there is something specific behind that message, and the best next move is to name the goal, the obstacle, and what you want from me. I can listen, help you make a plan, draft something, or look online if this needs facts. ${followUp}`;
  }

  return `${opener}${memoryContext} You said: "${message}". ${followUp}`;
}

function pickFrom(items, seed) {
  return items[Math.abs(seed) % items.length];
}

function answerByIntent(message, memoryContext, replyLength) {
  if (isTroubleshootingRequest(message)) {
    return formatLengthResponse(
      replyLength,
      `Let's troubleshoot it.${memoryContext} Send me the exact error or what changed right before it broke.`,
      `Let's troubleshoot it.${memoryContext}
1. Tell me the exact error or what you expected to happen.
2. Check the smallest thing that could fail first: power, connection, spelling, permissions, or the last change you made.
3. Try one change at a time and note what changes.
4. If it still fails, paste the error message, screenshot text, or steps you already tried.

My first question: what is the exact problem or error you are seeing?`,
      `Let's troubleshoot it carefully.${memoryContext}
1. First, tell me what you expected to happen and what actually happened.
2. Next, share the exact error text, screenshot text, or the step where it breaks.
3. Then we isolate the cause by checking one thing at a time: the newest change, permissions, spelling, connection, device state, or missing setup.
4. After each attempt, compare the result so we know whether the fix helped.

If you paste the error or describe the situation, I will help narrow it down and give you the next test to try.`
    );
  }

  if (isDecisionRequest(message)) {
    return formatLengthResponse(
      replyLength,
      `Let's make the choice clearer.${memoryContext} Send me the options and what matters most, and I'll compare them.`,
      `Let's make the choice clearer.${memoryContext}
1. Name the options.
2. Pick the top 2-3 things that matter most: cost, speed, quality, risk, comfort, or long-term value.
3. Score each option against those priorities.
4. Choose the option with the best tradeoff, not just the one that feels loudest right now.

Send me the options and what matters most, and I'll compare them with you.`,
      `Let's make the choice clearer.${memoryContext}
1. List each option.
2. Pick the real priorities: money, time, quality, comfort, risk, impact, or long-term value.
3. Give each option a quick score for those priorities.
4. Look for the choice with the best tradeoff, not just the choice that feels easiest right now.
5. If two choices are close, pick the one with lower downside or the one you can test first.

Send me the choices and your priorities, and I will help rank them.`
    );
  }

  if (isHowToRequest(message)) {
    return formatLengthResponse(
      replyLength,
      `Yes.${memoryContext} Start by naming the exact result you want, then take the smallest next step toward it.`,
      `Yes. Here's a practical way to approach it.${memoryContext}
1. Define the exact result you want.
2. Break it into the next small action you can do right now.
3. Gather any missing info, examples, errors, or constraints.
4. Try the smallest version first.
5. Improve it based on what happens.

If you give me the details, I can turn this into a specific step-by-step answer.`,
      `Yes. Here's a practical way to approach it.${memoryContext}
1. Define the result in one sentence: what should be true when you are done?
2. List what you already have: tools, examples, ideas, text, code, or constraints.
3. Find the next action small enough to do immediately.
4. Test that small version before trying to perfect everything.
5. Tell me what happened, and I can help adjust the next step.

If the answer depends on facts, I can go online. If it depends on your goal, tell me the details and I will reason through it with you.`
    );
  }

  if (isExplanationRequest(message)) {
    const topic = extractTopic(message);

    return formatLengthResponse(
      replyLength,
      `Here's the short version${topic ? ` for ${topic}` : ""}.${memoryContext} It helps to separate what it is, why it matters, and one example.`,
      `Here's the simple version${topic ? ` for ${topic}` : ""}.${memoryContext}
Start with the main idea, then connect the details:
1. What it is: the core thing or concept.
2. Why it matters: the problem it solves or the effect it has.
3. How it works: the key steps or parts.
4. Example: a real situation where you would see it.

If you want, ask "explain it like I'm 10" or paste the exact text you want explained.`,
      `Here's the detailed way to understand${topic ? ` ${topic}` : " it"}.${memoryContext}
1. Start with the main idea: what is the thing really about?
2. Connect that to why it matters: what problem does it solve, cause, or explain?
3. Break down how it works into a few moving parts.
4. Use an example, because examples make abstract ideas easier to hold.
5. Check what part still feels confusing and zoom in there.

If you want, I can explain it simply, compare it to something familiar, or go online for a sourced answer.`
    );
  }

  if (isCreationRequest(message)) {
    return formatLengthResponse(
      replyLength,
      `I can help create that.${memoryContext} Tell me the goal, audience, style, and must-haves.`,
      `I can help you create that.${memoryContext}
Start with this structure:
1. Goal: what should the final thing do or say?
2. Audience: who is it for?
3. Style: serious, funny, simple, professional, or detailed?
4. Must-haves: any words, features, or limits?

Give me those pieces and I'll draft it with you.`,
      `I can help you create that.${memoryContext}
To make it good, send me:
1. The goal: what should the final result accomplish?
2. The audience: who will read, use, or hear it?
3. The style: simple, funny, serious, professional, emotional, or detailed.
4. The must-haves: words, features, examples, limits, or things to avoid.
5. The format: paragraph, list, script, plan, message, or code.

Once I have those pieces, I can make a first draft and then revise it with you.`
    );
  }

  return "";
}

function answerOpenQuestion(message, memoryContext, replyLength) {
  return formatLengthResponse(
    replyLength,
    `Good question.${memoryContext} Tell me any details you have, and I will help answer or go online if it needs facts.`,
    `Good question.${memoryContext} Here's how I would answer it: separate what we know from what we need to find out, then take the next useful step.

For your question, the next useful step is to share any details, constraints, or examples you already have. If it is a factual question, ask me to search or phrase it like "who/what/when/where is..." and I can look for a sourced answer.`,
    `Good question.${memoryContext} I can handle this two ways: if it needs up-to-date facts, I can go online and bring back a sourced answer; if it is about your situation, we can reason it through together.

The best next step is to give me one or two details: what you already know, what you are trying to do, and where you are stuck. Then I can answer directly instead of giving a generic response.`
  );
}

function answerMathQuestion(message, memoryContext, replyLength) {
  const expression = extractMathExpression(message);

  if (!expression) {
    return "";
  }

  try {
    const result = calculateExpression(expression);

    if (!Number.isFinite(result)) {
      return "";
    }

    return formatLengthResponse(
      replyLength,
      `${formatNumber(result)}.${memoryContext}`,
      `The answer is ${formatNumber(result)}.${memoryContext}\n\nQuick work: ${formatExpression(expression)} = ${formatNumber(result)}.`,
      `The answer is ${formatNumber(result)}.${memoryContext}\n\nQuick work: ${formatExpression(expression)} = ${formatNumber(result)}.\n\nI followed normal order of operations, so multiplication and division happen before addition and subtraction unless parentheses change the order.`
    );
  } catch {
    return "";
  }
}

function extractMathExpression(message) {
  const normalized = message
    .toLowerCase()
    .replace(/\bwhat(?:'s| is)\b/g, " ")
    .replace(/\b(can you|could you|please|calculate|compute|solve|answer|equals?|equal to)\b/g, " ")
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\btimes\b|\bmultiplied by\b/g, "*")
    .replace(/\bdivided by\b|\bover\b/g, "/")
    .replace(/\bmodulo\b|\bmod\b|\bpercent remainder\b/g, "%")
    .replace(/[?=]/g, " ");
  const expressionMatch = normalized.match(/[-+*/%^().\d\s]+/g);
  const expression = expressionMatch
    ?.map((part) => part.trim())
    .filter((part) => /[+\-*/%^]/.test(part.replace(/^-/, "")))
    .sort((left, right) => right.length - left.length)[0];

  if (!expression || /[^-+*/%^().\d\s]/.test(expression)) {
    return "";
  }

  return expression;
}

function calculateExpression(expression) {
  const javascriptExpression = expression.replace(/\^/g, "**");

  if (!/^[\d+\-*/%().\s*]+$/.test(javascriptExpression)) {
    throw new Error("Unsupported math expression");
  }

  return Function(`"use strict"; return (${javascriptExpression});`)();
}

function formatExpression(expression) {
  return expression.replace(/\s+/g, " ").trim();
}

function formatNumber(value) {
  const rounded = Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
  return String(rounded);
}

function normalizeReplyLength(value) {
  return replyLengths.includes(value) ? value : "medium";
}

function formatLengthResponse(replyLength, shortResponse, mediumResponse, longResponse) {
  if (replyLength === "short") {
    return shortResponse;
  }

  if (replyLength === "long") {
    return longResponse;
  }

  return mediumResponse;
}

function isQuestion(message) {
  return message.endsWith("?") || /^(who|what|when|where|why|how|can|could|should|would|is|are|do|does|did)\b/i.test(message);
}

function isTroubleshootingRequest(message) {
  return /\b(error|bug|broken|fix|not working|stuck|crash|failed|failing|problem|issue|wrong)\b/i.test(message);
}

function isDecisionRequest(message) {
  return /\b(choose|decide|which one|which should|better|best option)\b/i.test(message)
    || /\bshould i\s+(pick|buy|use|choose|switch|keep|stop|start over)\b/i.test(message);
}

function isHowToRequest(message) {
  return /\b(how do i|how can i|how should i|help me|teach me|show me|walk me through|what steps)\b/i.test(message);
}

function isExplanationRequest(message) {
  return /\b(explain|what is|what are|what does|define|why does|why is|how does)\b/i.test(message);
}

function isCreationRequest(message) {
  return /\b(write|draft|make|create|build|design|plan|brainstorm)\b/i.test(message);
}

function extractTopic(message) {
  const cleaned = message
    .replace(/[?!.]+$/g, "")
    .replace(/^\s*(can you|could you|please)\s+/i, "")
    .replace(/^\s*(explain|define|what is|what are|what does|why does|why is|how does)\s+/i, "")
    .trim();

  return cleaned.length > 2 ? cleaned : "";
}

function formatMemoryContext(relevantMemories = []) {
  if (!relevantMemories.length) {
    return "";
  }

  return ` I remember ${relevantMemories.join(" and ")}.`;
}
