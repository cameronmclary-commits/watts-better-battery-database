import { useState, useEffect, useCallback } from 'react';
import { listBatteryReviews, fetchBatteryReviews, saveSelectedReviews, deleteBatteryReview, ListBatteryReviewsOutputType, FetchBatteryReviewsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Checkbox } from '@project/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { Loader2, Star, ExternalLink, Trash2, RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle, XCircle, CheckCircle2, Search } from 'lucide-react';
import { toast } from 'sonner';

type Review = ListBatteryReviewsOutputType['reviews'][0];
type Candidate = FetchBatteryReviewsOutputType['candidates'][0];

function alertKeyFromValue(val: string | null): 'green' | 'amber' | 'red' | null {
  if (!val) return null;
  if (val === 'Consistent') return 'green';
  if (val === 'Mixed Signals') return 'amber';
  if (val === 'Discrepancy') return 'red';
  return null;
}

function isPrimarySource(r: Review | Candidate) {
  return ('sourceUrl' in r && (r.sourceUrl || '').toLowerCase().includes('productreview.com.au'));
}

function isUnverifiedSource(r: Review | Candidate) {
  const url = ('sourceUrl' in r ? r.sourceUrl || '' : '').toLowerCase();
  const name = r.sourceName.toLowerCase();
  return ['solarquotes', 'solar quotes', 'solarchoice', 'solar choice'].some(
    s => url.includes(s) || name.includes(s)
  );
}

export default function BatteryReviewsSection({ batteryId, batteryName, manufacturer }: {
  batteryId: string; batteryName: string; manufacturer: string;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [alertLevel, setAlertLevel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listBatteryReviews({ batteryId });
      setReviews(res.reviews);
      setAlertLevel(res.alertLevel);
    } finally { setLoading(false); }
  }, [batteryId]);

  useEffect(() => { load(); }, [load]);

  const handleFetch = async () => {
    setFetching(true);
    setCandidates(null);
    setSelectedCandidates(new Set());
    try {
      const res = await fetchBatteryReviews({ batteryId, batteryName, manufacturer });
      setCandidates(res.candidates);
      // Pre-select Tavily-verified candidates
      const preSelected = new Set<number>();
      res.candidates.forEach((c, i) => {
        if (c.tavilyVerified) preSelected.add(i);
      });
      setSelectedCandidates(preSelected);
      if (res.candidates.length === 0) {
        toast.info('No review sources found');
      } else {
        toast.success(`Found ${res.candidates.length} review sources — please review and approve`);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to fetch reviews');
    } finally { setFetching(false); }
  };

  const handleSaveSelected = async () => {
    if (!candidates) return;
    const selected = candidates.filter((_, i) => selectedCandidates.has(i));
    if (selected.length === 0) {
      toast.error('Please select at least one review to save');
      return;
    }
    setSaving(true);
    try {
      const res = await saveSelectedReviews({
        batteryId,
        reviews: selected.map(c => ({
          sourceName: c.sourceName,
          sourceUrl: c.sourceUrl,
          rating: c.rating,
          ratingOutOf: c.ratingOutOf,
          reviewCount: c.reviewCount,
          verified: c.verified,
          summary: c.summary,
          sentiment: c.sentiment,
        })),
      });
      toast.success(`Saved ${res.savedCount} reviews`);
      setCandidates(null);
      setAlertLevel(res.alertLevel);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save reviews');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await deleteBatteryReview({ id });
    toast.success('Review removed');
    load();
  };

  const toggleCandidate = (idx: number) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const ak = alertKeyFromValue(alertLevel);
  const primary = reviews.find(isPrimarySource);
  const others = reviews.filter(r => !isPrimarySource(r));
  const discrepancies = computeDiscrepancies(primary, others);

  return (
    <div className="border rounded-xl shadow-sm overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">Reviews</span>
          {ak && <AlertBadge level={ak} />}
        </div>
        <Button variant="outline" size="sm" onClick={handleFetch} disabled={fetching} className="h-7 text-xs">
          {fetching ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Search className="h-3 w-3 mr-1" />}
          {reviews.length > 0 ? 'Search for Reviews' : 'Fetch Reviews'}
        </Button>
      </div>

      {/* Candidate review selection */}
      {candidates && candidates.length > 0 && (
        <div className="border-t bg-blue-50/50">
          <div className="px-4 py-3 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-600" />
                <span className="font-semibold text-sm text-blue-900">Review Sources Found</span>
                <span className="text-xs text-blue-600">Select which to include</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCandidates(null)}>
                  Cancel
                </Button>
                <Button size="sm" className="h-7 text-xs" onClick={handleSaveSelected} disabled={saving || selectedCandidates.size === 0}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                  Save {selectedCandidates.size} Selected
                </Button>
              </div>
            </div>
          </div>
          <div className="divide-y divide-blue-100">
            {candidates.map((c, idx) => (
              <CandidateRow
                key={idx}
                candidate={c}
                selected={selectedCandidates.has(idx)}
                onToggle={() => toggleCandidate(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-4"><div className="h-20 rounded bg-muted animate-pulse" /></div>
      ) : reviews.length === 0 && !candidates ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No reviews yet. Click "Fetch Reviews" to search ProductReview.com.au and other platforms.
        </div>
      ) : (
        <div className="divide-y">
          {primary && <PrimaryReviewCard review={primary} onDelete={() => handleDelete(primary.id)} />}
          {others.length > 0 && (
            <div className="px-4 py-2 bg-muted/30">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Other Sources</span>
            </div>
          )}
          {others.map(r => (
            <SecondaryReviewRow
              key={r.id}
              review={r}
              primaryRating={primary?.rating ?? null}
              primaryOutOf={primary?.ratingOutOf ?? null}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}

      {discrepancies.length > 0 && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200 text-sm text-red-700 space-y-1">
          <div className="flex items-start gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Review discrepancies detected</span>
          </div>
          {discrepancies.map((d, i) => (
            <p key={i} className="ml-6 text-xs">{d}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- sub-components ---------- */

function CandidateRow({ candidate: c, selected, onToggle }: {
  candidate: Candidate; selected: boolean; onToggle: () => void;
}) {
  const unverified = isUnverifiedSource(c);
  return (
    <div className={`px-4 py-3 space-y-1.5 ${selected ? 'bg-blue-50' : 'bg-white'}`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-sm">{c.sourceName}</span>
            {c.verified ? (
              <Badge variant="outline" className="text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200">
                <ShieldAlert className="h-3 w-3" /> Unverified
              </Badge>
            )}
            <SentimentBadge rating={c.rating} ratingOutOf={c.ratingOutOf} sentiment={c.sentiment} />
            {/* Tavily verification status */}
            {c.tavilyVerified ? (
              <Badge variant="outline" className="text-xs gap-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="h-3 w-3" /> Tavily Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1 bg-red-50 text-red-700 border-red-200">
                <XCircle className="h-3 w-3" /> Not Verified
              </Badge>
            )}
          </div>
          {c.rating != null && (
            <div className="flex items-center gap-3 text-sm mb-1">
              <span className="font-semibold flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                {c.rating} / {c.ratingOutOf ?? 5}
              </span>
              {c.reviewCount != null && (
                <span className="text-muted-foreground text-xs">
                  {c.reviewCount.toLocaleString()} review{c.reviewCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
          {c.summary && <p className="text-sm text-muted-foreground">{c.summary}</p>}
          <p className="text-xs text-muted-foreground/70 mt-1 italic">{c.tavilyNote}</p>
          <div className="flex items-center gap-2 mt-1">
            {c.sourceUrl && (
              <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Source
              </a>
            )}
            {c.tavilyUrl && c.tavilyUrl !== c.sourceUrl && (
              <a href={c.tavilyUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                <ExternalLink className="h-3 w-3" /> Tavily Result
              </a>
            )}
          </div>
          {unverified && (
            <p className="text-xs text-amber-600 italic mt-1">
              ⚠ This site does not verify reviewers — ratings may not reflect verified purchaser experiences.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertBadge({ level }: { level: 'green' | 'amber' | 'red' }) {
  const cfg = {
    green: { label: 'Consistent', icon: ShieldCheck, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    amber: { label: 'Mixed Signals', icon: AlertTriangle, cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    red: { label: 'Discrepancy', icon: XCircle, cls: 'bg-red-100 text-red-700 border-red-200' },
  }[level];
  return (
    <Badge variant="outline" className={`text-xs gap-1 ${cfg.cls}`}>
      <cfg.icon className="h-3 w-3" /> {cfg.label}
    </Badge>
  );
}

function PrimaryReviewCard({ review: r, onDelete }: { review: Review; onDelete: () => void }) {
  return (
    <div className="px-4 py-4 bg-primary/5 border-l-4 border-primary space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm">{r.sourceName}</span>
          <Badge variant="default" className="text-xs gap-1">
            <ShieldCheck className="h-3 w-3" /> Primary Source
          </Badge>
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 gap-1">
            <ShieldCheck className="h-3 w-3" /> Verified Purchasers
          </Badge>
          <SentimentBadge rating={r.rating} ratingOutOf={r.ratingOutOf} sentiment={r.sentiment} />
        </div>
        <ReviewActions url={r.sourceUrl} onDelete={onDelete} />
      </div>
      <RatingDisplay review={r} large />
      {r.summary && <p className="text-sm text-foreground/80">{r.summary}</p>}
      <CheckedDate date={r.lastChecked} />
    </div>
  );
}

function SecondaryReviewRow({ review: r, primaryRating, primaryOutOf, onDelete }: {
  review: Review; primaryRating: number | null; primaryOutOf: number | null; onDelete: () => void;
}) {
  const unverified = isUnverifiedSource(r);
  const ratingDiff = getRatingDiff(r, primaryRating, primaryOutOf);

  return (
    <div className={`px-4 py-3 space-y-1.5 ${unverified ? 'bg-amber-50/50' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{r.sourceName}</span>
          {r.verified ? (
            <Badge variant="outline" className="text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200">
              <ShieldCheck className="h-3 w-3" /> Verified
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200">
              <ShieldAlert className="h-3 w-3" /> Unverified
            </Badge>
          )}
          <SentimentBadge rating={r.rating} ratingOutOf={r.ratingOutOf} sentiment={r.sentiment} />
          {ratingDiff && <DiscrepancyChip diff={ratingDiff} />}
        </div>
        <ReviewActions url={r.sourceUrl} onDelete={onDelete} />
      </div>
      <RatingDisplay review={r} />
      {r.summary && <p className="text-sm text-muted-foreground">{r.summary}</p>}
      {unverified && (
        <p className="text-xs text-amber-600 italic">
          ⚠ This site does not verify reviewers — ratings may not reflect verified purchaser experiences.
        </p>
      )}
      <CheckedDate date={r.lastChecked} />
    </div>
  );
}

function RatingDisplay({ review: r, large }: { review: Review; large?: boolean }) {
  if (r.rating == null) return null;
  const pct = r.ratingOutOf ? r.rating / r.ratingOutOf : null;
  const color = pct != null
    ? pct >= 0.7 ? 'text-emerald-600' : pct >= 0.4 ? 'text-amber-600' : 'text-red-600'
    : '';
  return (
    <div className={`flex items-center gap-3 ${large ? 'text-base' : 'text-sm'}`}>
      <span className={`font-semibold flex items-center gap-1 ${color}`}>
        <Star className={`${large ? 'h-4 w-4' : 'h-3.5 w-3.5'} fill-current`} />
        {r.rating} / {r.ratingOutOf ?? 5}
      </span>
      {r.reviewCount != null && (
        <span className="text-muted-foreground text-xs">
          {r.reviewCount.toLocaleString()} review{r.reviewCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}

function classifyRating(rating: number | null | undefined, outOf: number | null | undefined): 'Positive' | 'Neutral' | 'Negative' | null {
  if (rating == null) return null;
  const norm = (rating / (outOf || 5)) * 5;
  if (norm > 3) return 'Positive';
  if (norm >= 2.5) return 'Neutral';
  return 'Negative';
}

function SentimentBadge({ rating, ratingOutOf, sentiment }: { rating?: number | null; ratingOutOf?: number | null; sentiment?: string | null }) {
  const ratingLabel = classifyRating(rating, ratingOutOf);
  const label = ratingLabel
    || (['Positive', 'Negative', 'Neutral', 'Mixed'].includes(sentiment || '') ? sentiment as string : null);
  if (!label) return null;
  const cls = label === 'Positive'
    ? 'bg-emerald-100 text-emerald-700'
    : label === 'Negative' ? 'bg-red-100 text-red-700'
    : label === 'Mixed' ? 'bg-orange-100 text-orange-700'
    : 'bg-amber-100 text-amber-700';
  return <Badge variant="secondary" className={`text-xs ${cls}`}>{label}</Badge>;
}

function DiscrepancyChip({ diff }: { diff: { direction: string; amount: string } }) {
  return (
    <Badge variant="outline" className="text-xs gap-1 bg-red-50 text-red-700 border-red-200">
      <AlertTriangle className="h-3 w-3" />
      {diff.amount} {diff.direction} vs ProductReview
    </Badge>
  );
}

function ReviewActions({ url, onDelete }: { url: string | null; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this review?</AlertDialogTitle>
            <AlertDialogDescription>This review entry will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CheckedDate({ date }: { date: string | null }) {
  if (!date) return null;
  return (
    <p className="text-xs text-muted-foreground/60">
      Checked {new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
    </p>
  );
}

/* ---------- helpers ---------- */

function normalise5(rating: number | null, outOf: number | null): number | null {
  if (rating == null) return null;
  return (rating / (outOf || 5)) * 5;
}

function getRatingDiff(review: Review, primaryRating: number | null, primaryOutOf: number | null) {
  const pNorm = normalise5(primaryRating, primaryOutOf);
  const rNorm = normalise5(review.rating ?? null, review.ratingOutOf ?? null);
  if (pNorm == null || rNorm == null) return null;
  const diff = rNorm - pNorm;
  if (Math.abs(diff) < 0.5) return null;
  return {
    direction: diff > 0 ? 'higher' : 'lower',
    amount: Math.abs(diff).toFixed(1) + '★',
  };
}

function computeDiscrepancies(primary: Review | undefined, others: Review[]): string[] {
  if (!primary || primary.rating == null) return [];
  const pNorm = normalise5(primary.rating, primary.ratingOutOf ?? null);
  if (pNorm == null) return [];

  const msgs: string[] = [];
  for (const r of others) {
    const rNorm = normalise5(r.rating ?? null, r.ratingOutOf ?? null);
    if (rNorm == null) continue;
    const diff = rNorm - pNorm;
    if (Math.abs(diff) >= 1.0) {
      const unverified = isUnverifiedSource(r);
      const dirWord = diff > 0 ? 'higher' : 'lower';
      const note = unverified ? ' (unverified reviewers)' : '';
      msgs.push(
        `${r.sourceName}${note} rates ${Math.abs(diff).toFixed(1)}★ ${dirWord} than ProductReview (${r.rating}/${r.ratingOutOf ?? 5} vs ${primary.rating}/${primary.ratingOutOf ?? 5}).`
      );
    }
  }
  return msgs;
}
