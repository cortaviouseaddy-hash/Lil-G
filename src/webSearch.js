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

export function formatSearchReply(searchResult) {
  if (!searchResult.results.length) {
    return `I searched for "${searchResult.query}" but could not find a strong summary result. You can keep searching here: ${searchResult.webSearchUrl}`;
  }

  const resultLines = searchResult.results
    .map((result, index) => `${index + 1}. ${result.title}: ${result.snippet}`)
    .join("\n");

  return `I searched the internet for "${searchResult.query}". Here's what I found:\n${resultLines}`;
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
