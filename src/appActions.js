const launchTargets = [
  {
    id: "google",
    title: "Google",
    aliases: ["google", "browser", "web", "internet"],
    url: "https://www.google.com/"
  },
  {
    id: "youtube",
    title: "YouTube",
    aliases: ["youtube", "you tube"],
    url: "https://www.youtube.com/"
  },
  {
    id: "discord",
    title: "Discord",
    aliases: ["discord"],
    url: "https://discord.com/app"
  },
  {
    id: "gmail",
    title: "Gmail",
    aliases: ["gmail", "email", "mail"],
    url: "https://mail.google.com/"
  },
  {
    id: "maps",
    title: "Google Maps",
    aliases: ["maps", "google maps"],
    url: "https://maps.google.com/"
  }
];

const openPattern = /^\s*(?:open|launch|go\s+to|pull\s+up)\s+(?:the\s+)?(.+?)\s*$/i;
const browserSearchPattern =
  /^\s*(?:open|launch)\s+(?:a\s+)?(?:browser|web|internet)\s+(?:and\s+)?(?:search|find|look\s+up)\s+(?:for\s+)?(.+?)\s*$/i;

export function detectActionIntent(input) {
  const browserSearchMatch = input.match(browserSearchPattern);

  if (browserSearchMatch) {
    const query = cleanActionText(browserSearchMatch[1]);

    return {
      isAction: true,
      title: `Search the web for ${query}`,
      url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      kind: "search"
    };
  }

  const openMatch = input.match(openPattern);

  if (!openMatch) {
    return {
      isAction: false
    };
  }

  const requestedTarget = cleanActionText(openMatch[1]).toLowerCase();
  const target = launchTargets.find((candidate) =>
    candidate.aliases.some((alias) => requestedTarget === alias || requestedTarget.startsWith(`${alias} `))
  );

  if (!target) {
    return {
      isAction: false
    };
  }

  return {
    isAction: true,
    id: target.id,
    title: target.title,
    url: target.url,
    kind: "launch"
  };
}

export function formatActionReply(action) {
  if (!action.isAction) {
    return "";
  }

  if (action.kind === "search") {
    return `Opening a browser search for you. If the new tab did not open, use this link: ${action.url}`;
  }

  return `Opening ${action.title} for you. If your device has an app linked to this site, it may hand off to the app. Otherwise it will open in the browser.`;
}

export function getLaunchTargets() {
  return launchTargets.map((target) => ({ ...target }));
}

function cleanActionText(value) {
  return value
    .trim()
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ");
}
