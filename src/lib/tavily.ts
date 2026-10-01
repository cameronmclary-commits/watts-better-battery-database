// Tavily web search helper for verifying AI-generated data
const TAVILY_API_URL = 'https://api.tavily.com/search';

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  results: TavilyResult[];
  answer?: string;
}

export async function tavilySearch(query: string, opts?: {
  maxResults?: number;
  searchDepth?: 'basic' | 'advanced';
  includeAnswer?: boolean;
}): Promise<TavilySearchResponse> {
  const apiKey = process.env.ZITE_TAVILY_API_KEY;
  if (!apiKey) throw new Error('Tavily API key not configured');

  const res = await fetch(TAVILY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: opts?.maxResults ?? 5,
      search_depth: opts?.searchDepth ?? 'basic',
      include_answer: opts?.includeAnswer ?? false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Tavily search failed (${res.status}): ${errText}`);
  }

  return res.json() as Promise<TavilySearchResponse>;
}

/**
 * Verify a review source by searching Tavily to confirm the URL/page exists
 * and the rating/review count roughly matches.
 */
export async function verifyReviewSource(sourceName: string, sourceUrl: string | null, productName: string): Promise<{
  verified: boolean;
  confidence: 'high' | 'medium' | 'low';
  verificationNote: string;
  tavilyUrl?: string;
}> {
  try {
    const query = sourceUrl
      ? `${productName} reviews on ${sourceName} site:${new URL(sourceUrl).hostname}`
      : `${productName} reviews ${sourceName}`;

    const result = await tavilySearch(query, { maxResults: 3, searchDepth: 'basic' });

    if (result.results.length === 0) {
      return { verified: false, confidence: 'low', verificationNote: 'Could not find this review source via web search' };
    }

    const matchingResult = sourceUrl
      ? result.results.find(r => {
          try {
            const claimedHost = new URL(sourceUrl).hostname.replace('www.', '');
            const foundHost = new URL(r.url).hostname.replace('www.', '');
            return foundHost.includes(claimedHost) || claimedHost.includes(foundHost);
          } catch { return false; }
        })
      : result.results[0];

    if (matchingResult) {
      return {
        verified: true,
        confidence: 'high',
        verificationNote: `Confirmed via Tavily: "${matchingResult.title}"`,
        tavilyUrl: matchingResult.url,
      };
    }

    return {
      verified: false,
      confidence: 'medium',
      verificationNote: `Found related results but could not confirm exact source URL. Top result: ${result.results[0].url}`,
      tavilyUrl: result.results[0]?.url,
    };
  } catch (err: any) {
    return { verified: false, confidence: 'low', verificationNote: `Verification failed: ${err.message}` };
  }
}

/**
 * Cross-verify key claims from AI search results using Tavily.
 * Returns verification notes to append.
 */
export async function verifyAiClaims(productName: string, claims: { field: string; value: string }[]): Promise<{
  verificationSummary: string;
  sources: { title: string; url: string }[];
}> {
  try {
    const claimText = claims.map(c => `${c.field}: ${c.value}`).join(', ');
    const query = `${productName} specifications ${claimText}`;
    const result = await tavilySearch(query, { maxResults: 5, searchDepth: 'basic', includeAnswer: true });

    return {
      verificationSummary: result.answer || 'No verification summary available from Tavily',
      sources: result.results.map(r => ({ title: r.title, url: r.url })),
    };
  } catch {
    return { verificationSummary: 'Tavily verification unavailable', sources: [] };
  }
}
