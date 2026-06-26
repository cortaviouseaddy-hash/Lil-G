const intentLabels = {
  greeting: "a greeting or check-in",
  math: "a math question",
  troubleshoot: "a troubleshooting request",
  decision: "a decision between options",
  howto: "a how-to or step-by-step request",
  explain: "an explanation request",
  create: "a create-or-draft request",
  emotional: "emotional support",
  search: "a factual question that may need online sources",
  conversation: "a general conversation turn",
  command: "a direct command or action"
};

export function buildThinkingTrace(message, history = [], context = {}) {
  const trimmed = message.trim();
  const intent = classifyIntent(trimmed, context);
  const relevantMemories = context.relevantMemories ?? [];
  const recentUserMessages = history.filter((entry) => entry.role === "user").slice(-3);
  const steps = [];

  steps.push(describeUserGoal(trimmed, intent));
  steps.push(describeKnownContext(relevantMemories, recentUserMessages));

  if (context.willSearch) {
    steps.push("This looks factual or time-sensitive, so I should check online sources before answering.");
  } else {
    steps.push(describeApproach(intent, trimmed));
  }

  steps.push(describeAnswerFocus(intent, context.replyLength ?? "medium"));

  return {
    intent,
    intentLabel: intentLabels[intent] ?? intentLabels.conversation,
    steps,
    summary: `I treated this as ${intentLabels[intent] ?? intentLabels.conversation} and planned my answer around that.`
  };
}

export function formatThinkingTrace(trace) {
  if (!trace?.steps?.length) {
    return "";
  }

  return trace.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
}

export function shouldShowThinkingForReply(options = {}) {
  return !options.skipThinking;
}

function classifyIntent(message, context = {}) {
  if (!message) {
    return "conversation";
  }

  if (context.willSearch) {
    return "search";
  }

  if (/\b(hi|hello|hey|yo|sup|thanks|thank you)\b/i.test(message)) {
    return "greeting";
  }

  if (/\b(error|bug|broken|fix|not working|stuck|crash|failed|problem|issue)\b/i.test(message)) {
    return "troubleshoot";
  }

  if (/\b(choose|decide|which one|which should|better|best option|should i)\b/i.test(message)) {
    return "decision";
  }

  if (/\b(how do i|how can i|how should i|help me|teach me|show me|walk me through)\b/i.test(message)) {
    return "howto";
  }

  if (/\b(explain|what is|what are|what does|define|why does|why is|how does)\b/i.test(message)) {
    return "explain";
  }

  if (/\b(write|draft|make|create|build|design|plan|brainstorm)\b/i.test(message)) {
    return "create";
  }

  if (/\b(sad|upset|angry|mad|lonely|stressed|anxious)\b/i.test(message)) {
    return "emotional";
  }

  if (isMathQuestion(message)) {
    return "math";
  }

  if (message.endsWith("?") || /^(who|what|when|where|why|how|can|could|should|would|is|are|do|does|did)\b/i.test(message)) {
    return "search";
  }

  return "conversation";
}

function describeUserGoal(message, intent) {
  const preview = message.length > 72 ? `${message.slice(0, 72)}...` : message;

  switch (intent) {
    case "math":
      return `The user wants a calculated answer for: "${preview}".`;
    case "troubleshoot":
      return `The user is trying to fix something. I need the exact failure, what changed, and the smallest test to run next.`;
    case "decision":
      return `The user needs help choosing between options. I should compare tradeoffs instead of guessing.`;
    case "howto":
      return `The user wants practical steps, not just encouragement. I should break the task into the next actions.`;
    case "explain":
      return `The user wants something explained clearly. I should cover what it is, why it matters, and one example.`;
    case "create":
      return `The user wants me to help create or draft something. I need goal, audience, style, and must-haves.`;
    case "emotional":
      return `The user sounds stressed or upset. I should respond with care before giving advice.`;
    case "search":
      return `The user asked a question that may need facts: "${preview}".`;
    case "greeting":
      return `The user is opening the conversation or checking in. I should respond warmly and invite the next topic.`;
    default:
      return `The user said: "${preview}". I should reflect what I heard and ask a useful follow-up if needed.`;
  }
}

function describeKnownContext(relevantMemories, recentUserMessages) {
  const parts = [];

  if (relevantMemories.length) {
    parts.push(`Saved memories that matter here: ${relevantMemories.join("; ")}.`);
  }

  if (recentUserMessages.length > 1) {
    const earlier = recentUserMessages
      .slice(0, -1)
      .map((entry) => entry.content)
      .join(" | ");
    parts.push(`Recent conversation context: ${earlier}.`);
  }

  if (!parts.length) {
    return "I do not have extra saved memories or earlier turns that change this answer yet.";
  }

  return parts.join(" ");
}

function describeApproach(intent) {
  switch (intent) {
    case "math":
      return "I should solve the math directly and show the result clearly.";
    case "troubleshoot":
      return "I should use a troubleshooting flow: expected vs actual, exact error, one change at a time.";
    case "decision":
      return "I should ask for options and priorities, then compare them against what matters most.";
    case "howto":
      return "I should give a step-by-step plan starting with the smallest next action.";
    case "explain":
      return "I should explain the core idea first, then connect details and an example.";
    case "create":
      return "I should gather constraints, then offer a structured draft or outline.";
    case "emotional":
      return "I should acknowledge the feeling first, then invite the user to say more.";
    case "greeting":
      return "I should keep the reply friendly and short, then make it easy to continue.";
    default:
      return "I should answer directly, stay practical, and avoid a generic reply when I can be specific.";
  }
}

function describeAnswerFocus(intent, replyLength) {
  const lengthNote =
    replyLength === "short"
      ? "Keep the final answer short."
      : replyLength === "long"
        ? "Give a fuller answer with more steps or detail."
        : "Keep the final answer clear and medium length.";

  switch (intent) {
    case "math":
      return `${lengthNote} Lead with the number, then briefly show the work if helpful.`;
    case "troubleshoot":
      return `${lengthNote} Ask for the exact error or broken step if it is still missing.`;
    case "decision":
      return `${lengthNote} Focus on comparing options against the user's priorities.`;
    case "search":
      return `${lengthNote} If facts are missing, search or ask for the missing detail.`;
    default:
      return `${lengthNote} End with one useful next question or action.`;
  }
}

function isMathQuestion(message) {
  const normalized = message
    .toLowerCase()
    .replace(/\bwhat(?:'s| is)\b/g, " ")
    .replace(/\bplus\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\btimes\b/g, "*")
    .replace(/\bdivided by\b/g, "/");

  return /[-+*/%^().\d]/.test(normalized) && /\d/.test(normalized);
}
