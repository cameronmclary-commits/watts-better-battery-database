import { useState } from 'react';
import {
  ExternalLink,
  Copy,
  Check,
  Zap,
  Search,
  Globe,
  Key,
  Server,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@project/components/ui/badge';
import { Button } from '@project/components/ui/button';

type LinkItem = { label: string; url: string; description: string };
type ApiService = {
  name: string;
  status: 'active' | 'available' | 'planned';
  description: string;
  icon: React.ReactNode;
  links: LinkItem[];
  usedIn: string[];
  notes?: string;
};

const SERVICES: ApiService[] = [
  {
    name: 'External Data API (getBatteriesForCalculator)',
    status: 'active',
    description:
      'Lets outside apps read batteries, capacity options, installer pricing and compatible energy plans. Every request must include the secret API key in the "apiKey" field, or it is rejected.',
    icon: <Zap className="h-5 w-5" />,
    links: [],
    usedIn: ['getBatteriesForCalculator — inputs: apiKey (required), batteryId (optional), status (optional)'],
    notes: 'Key is stored in the ZITE_EXTERNAL_API_KEY secret. Change it in Settings → Secrets.',
  },
  {
    name: 'OpenAI (web_search_preview)',
    status: 'active',
    description:
      'Primary AI and web search engine. Uses the Responses API with the built-in web_search_preview tool for live data retrieval, battery spec lookups, review sourcing, and market discovery.',
    icon: <Zap className="h-5 w-5" />,
    links: [
      { label: 'OpenAI Platform', url: 'https://platform.openai.com', description: 'Dashboard, API keys, usage & billing' },
      { label: 'Responses API Docs', url: 'https://platform.openai.com/docs/api-reference/responses', description: 'API reference for openai.responses.create' },
      { label: 'Web Search Tool', url: 'https://platform.openai.com/docs/guides/tools-web-search', description: 'web_search_preview tool guide' },
      { label: 'Usage Dashboard', url: 'https://platform.openai.com/usage', description: 'Monitor API usage and costs' },
    ],
    usedIn: [
      'fetchBatteryReviews — sources reviews from ProductReview, SolarQuotes, etc.',
      'checkBatteryUpdates — cross-references battery specs against live web data',
      'discoverMarketBatteries — finds new battery models on the AU market',
      'discoverMarketPlans — discovers new energy plans',
      'aiSearchBattery — AI-powered battery search',
      'aiSearchEnergyPlan — AI-powered energy plan search',
      'aiSearchSolarPanel — AI-powered solar panel search',
      'extractFromUrl — extracts structured data from a given URL',
      'savePlanFromBatterySearch — saves plans found during battery searches',
    ],
    notes: 'Uses ZITE_OPENAI_ACCESS_TOKEN env var. Model: gpt-4o.',
  },
  {
    name: 'Tavily',
    status: 'available',
    description:
      'AI-native web search API optimised for RAG and agent workflows. Returns clean, structured results. Free tier: 1,000 searches/month. Good candidate for cross-referencing battery specs.',
    icon: <Search className="h-5 w-5" />,
    links: [
      { label: 'Tavily Website', url: 'https://tavily.com', description: 'Sign up and get API key' },
      { label: 'API Docs', url: 'https://docs.tavily.com', description: 'Full API reference' },
      { label: 'Pricing', url: 'https://tavily.com/pricing', description: 'Free tier and paid plans' },
    ],
    usedIn: [],
    notes: 'Recommended as secondary search source. Purpose-built for AI agents with structured JSON output.',
  },
  {
    name: 'Serper (Google SERP)',
    status: 'available',
    description:
      'Fast Google search results via API. Free tier: 2,500 queries/month. Excellent for AU-specific battery pricing and installer lookups since it returns real Google results.',
    icon: <Globe className="h-5 w-5" />,
    links: [
      { label: 'Serper Website', url: 'https://serper.dev', description: 'Sign up and get API key' },
      { label: 'API Docs', url: 'https://serper.dev/docs', description: 'Full API reference' },
      { label: 'Playground', url: 'https://serper.dev/playground', description: 'Test queries interactively' },
    ],
    usedIn: [],
    notes: 'Returns actual Google results. Good for region-specific queries (site:au).',
  },
  {
    name: 'Brave Search API',
    status: 'available',
    description:
      'Independent search index (not Google-based). Free tier: 2,000 queries/month. Surfaces results other engines miss — useful for cross-referencing battery specs.',
    icon: <Search className="h-5 w-5" />,
    links: [
      { label: 'Brave Search API', url: 'https://brave.com/search/api/', description: 'Sign up and documentation' },
      { label: 'API Docs', url: 'https://api.search.brave.com/app/documentation/web-search/get-started', description: 'Getting started guide' },
    ],
    usedIn: [],
    notes: 'Independent index provides diversity from Google-based results.',
  },
  {
    name: 'Exa',
    status: 'available',
    description:
      'Semantic / neural search API. Finds content by meaning rather than keywords. Good for discovering niche battery review pages or technical spec sheets.',
    icon: <Search className="h-5 w-5" />,
    links: [
      { label: 'Exa Website', url: 'https://exa.ai', description: 'Sign up and get API key' },
      { label: 'API Docs', url: 'https://docs.exa.ai', description: 'Full API reference' },
    ],
    usedIn: [],
    notes: 'Neural search finds pages by meaning. Best for finding hard-to-keyword content.',
  },
  {
    name: 'Firecrawl',
    status: 'available',
    description:
      'Web scraping and crawling API that returns clean markdown from any URL. Useful for extracting structured data from manufacturer pages or retailer sites.',
    icon: <Globe className="h-5 w-5" />,
    links: [
      { label: 'Firecrawl Website', url: 'https://firecrawl.dev', description: 'Sign up and documentation' },
      { label: 'API Docs', url: 'https://docs.firecrawl.dev', description: 'Full API reference' },
    ],
    usedIn: [],
    notes: 'Available as a Zite integration. Great for scraping manufacturer spec sheets.',
  },
];

const REFERENCE_LINKS: LinkItem[] = [
  { label: 'KDnuggets — 7 Free Web Search APIs', url: 'https://www.kdnuggets.com/7-free-web-search-apis-for-ai-agents', description: 'Comparison article of free web search APIs for AI agents' },
  { label: 'ProductReview.com.au', url: 'https://www.productreview.com.au', description: 'Primary verified review source for AU batteries' },
  { label: 'SolarQuotes', url: 'https://www.solarquotes.com.au', description: 'AU solar & battery news, reviews, and installer directory' },
  { label: 'Solar Choice', url: 'https://www.solarchoice.net.au', description: 'AU solar comparison and installer network' },
  { label: 'Clean Energy Council', url: 'https://www.cleanenergycouncil.org.au', description: 'Industry body — approved products list' },
];

export default function ApiInfoPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">API & Integrations</h1>
        <p className="text-muted-foreground mt-1">
          External services, search APIs, and reference links used across the Battery Database.
        </p>
      </div>

      {/* Active / Available services */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Server className="h-5 w-5 text-primary" /> Services
        </h2>
        {SERVICES.map(s => (
          <ServiceCard key={s.name} service={s} />
        ))}
      </div>

      {/* Reference links */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" /> Reference Links
        </h2>
        <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
          {REFERENCE_LINKS.map(l => (
            <LinkRow key={l.url} link={l} />
          ))}
        </div>
      </div>

      {/* Env vars */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" /> Environment Variables
        </h2>
        <div className="border border-border rounded-xl p-4 bg-card space-y-3">
          <EnvRow name="ZITE_OPENAI_ACCESS_TOKEN" description="OpenAI API key — used across all AI search and review endpoints" />
          <p className="text-xs text-muted-foreground">
            Add new secrets via Settings → Secrets. They become available as <code className="bg-muted px-1 py-0.5 rounded text-xs">process.env.ZITE_*</code> in endpoints.
          </p>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: ApiService }) {
  const [open, setOpen] = useState(service.status === 'active');
  const statusColor: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
    available: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
    planned: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  };

  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          {service.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{service.name}</span>
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide ${statusColor[service.status]}`}>
              {service.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{service.description}</p>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
          <p className="text-sm text-muted-foreground">{service.description}</p>

          {service.notes && (
            <p className="text-xs bg-muted/50 text-muted-foreground rounded-lg px-3 py-2 border border-border">
              💡 {service.notes}
            </p>
          )}

          {service.links.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Links</h4>
              <div className="space-y-1.5">
                {service.links.map(l => (
                  <LinkRow key={l.url} link={l} />
                ))}
              </div>
            </div>
          )}

          {service.usedIn.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Used In Endpoints</h4>
              <ul className="space-y-1">
                {service.usedIn.map(e => (
                  <li key={e} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{e.split(' — ')[0]}</code>
                    {e.includes(' — ') && <span className="text-xs text-muted-foreground/70">— {e.split(' — ')[1]}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LinkRow({ link }: { link: LinkItem }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(link.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-3 px-3 py-2 group">
      <div className="flex-1 min-w-0">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-primary hover:underline flex items-center gap-1.5"
        >
          {link.label}
          <ExternalLink className="h-3 w-3 opacity-50" />
        </a>
        <p className="text-xs text-muted-foreground truncate">{link.description}</p>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
        onClick={copy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function EnvRow({ name, description }: { name: string; description: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-3 group">
      <Badge variant="outline" className="font-mono text-xs shrink-0">{name}</Badge>
      <span className="text-sm text-muted-foreground flex-1">{description}</span>
      <Button
        size="sm"
        variant="ghost"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
        onClick={copy}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
