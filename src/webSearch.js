const searchPatterns = [
  /\b(?:search|look\s+up|google)\s+(?:the\s+)?(?:internet|web)?\s*(?:for\s+)?(.+)/i,
  /\b(?:search|look\s+up|google)\s+(.+)/i,
  /\bfind\s+(?:me\s+)?(?:information\s+)?(?:about\s+)?(.+?)\s+(?:on\s+)?(?:the\s+)?(?:internet|web)\b/i
];

export function detectSearchIntent(input) {
  const trimmedInput = input.trim();

  for (const pattern of searchPatterns) {
    const match = trimmedInput.match(pattern);
    const query = cleanSearchQuery(match?.[1] ?? "");

    if (query) {
      return {
        isSearch: true,
        query
      };
    }
  }

  return {
    isSearch: false,
    query: ""
  };
}

export function detectKnowledgeQuestion(input) {
  const trimmedInput = input.trim();

  if (!isKnowledgeQuestionShape(trimmedInput) || isPersonalAssistantQuestion(trimmedInput)) {
    return {
      isSearch: false,
      query: ""
    };
  }

  const query = cleanSearchQuery(
    trimmedInput
      .replace(/^(?:tell me about|teach me about|give me (?:info|information|facts) (?:on|about)|facts about)\s+/i, "")
      .replace(/^(?:latest|current|recent)\s+(?:news|updates|information)\s+(?:on|about|for)\s+/i, "")
      .replace(/^(?:news|updates)\s+(?:on|about|for)\s+/i, "")
      .replace(/^(?:who|what|when|where)\s+(?:is|are|was|were|did|does|do)\s+/i, "")
      .replace(/^why\s+(?:is|are|was|were|does|do|did)\s+/i, "")
      .replace(/^how\s+(?:does|do|did)\s+/i, "")
      .replace(/^what\s+(?:causes|caused)\s+/i, "")
  );

  return {
    isSearch: Boolean(query),
    query
  };
}

export async function searchInternet(query, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const language = options.language ?? "en";
  const cleanedQuery = cleanSearchQuery(query);

  if (!cleanedQuery) {
    return {
      query: "",
      results: [],
      webSearchUrl: ""
    };
  }

  if (typeof fetchImpl !== "function") {
    return {
      query: cleanedQuery,
      results: [],
      webSearchUrl: createWebSearchUrl(cleanedQuery)
    };
  }

  const url = `https://${language}.wikipedia.org/w/api.php?action=opensearch&origin=*&namespace=0&limit=3&format=json&search=${encodeURIComponent(
    cleanedQuery
  )}`;

  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  const [returnedQuery, titles = [], descriptions = [], links = []] = await response.json();
  const results = titles.map((title, index) => ({
    title,
    snippet: descriptions[index] || "No summary available.",
    url: links[index]
  }));

  return {
    query: returnedQuery || cleanedQuery,
    results,
    webSearchUrl: createWebSearchUrl(cleanedQuery)
  };
}

export function formatSearchReply(searchResult, options = {}) {
  const replyLength = normalizeReplyLength(options.replyLength);
  const action = options.automatic ? "went online to answer" : "searched the internet for";

  if (!searchResult.results.length) {
    if (replyLength === "short") {
      return `I ${action} "${searchResult.query}", but I could not find a strong summary.`;
    }

    return `I ${action} "${searchResult.query}", but I could not find a strong summary result. You can keep searching here: ${searchResult.webSearchUrl}`;
  }

  const results = replyLength === "short" ? searchResult.results.slice(0, 1) : searchResult.results;
  const resultLines = results
    .map((result, index) => `${index + 1}. ${result.title}: ${result.snippet}`)
    .join("\n");

  if (replyLength === "short") {
    const [result] = results;
    return `I ${action} "${searchResult.query}". ${result.title}: ${result.snippet}`;
  }

  if (replyLength === "long") {
    return `I ${action} "${searchResult.query}". Here's what I found:\n${resultLines}\n\nUse these as starting points, and open the sources if you want to verify details or go deeper.`;
  }

  return `I ${action} "${searchResult.query}". Here's what I found:\n${resultLines}`;
}

export function createWebSearchUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(cleanSearchQuery(query))}`;
}

function cleanSearchQuery(value) {
  return value
    .trim()
    .replace(/^(?:for|about)\s+/i, "")
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ");
}

function isKnowledgeQuestionShape(input) {
  return /^(?:who|what|when|where)\s+(?:is|are|was|were|did|does|do)\b/i.test(input)
    || /^why\s+(?:is|are|was|were|does|do|did)\b/i.test(input)
    || /^how\s+(?:does|do|did)\b/i.test(input)
    || /^what\s+(?:causes|caused)\b/i.test(input)
    || /^(?:tell me about|teach me about|give me (?:info|information|facts) (?:on|about)|facts about)\b/i.test(input)
    || /^(?:latest|current|recent)\s+(?:news|updates|information)\s+(?:on|about|for)\b/i.test(input)
    || /^(?:news|updates)\s+(?:on|about|for)\b/i.test(input);
}

function isPersonalAssistantQuestion(input) {
  return /\b(i|me|my|mine|we|our|you|your|yours|lil-g|settings|avatar|memory|voice|talk-back)\b/i.test(input)
    || /\b(help|fix|build|make|create|write|choose|decide|should)\b/i.test(input);
}

function normalizeReplyLength(value) {
  return ["short", "medium", "long"].includes(value) ? value : "medium";
}
