import { useState } from 'react';
import { extractFromUrl, applyUrlChanges, ExtractFromUrlOutputType } from 'zitejs/api';
import { toast } from 'sonner';
import { Link2, Loader2, ChevronDown, ChevronUp, ArrowRight, CheckCircle2, PlusCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Card, CardContent } from '@project/components/ui/card';
import ChangeReview from '../components/ChangeReview';

type RecordUpdate = ExtractFromUrlOutputType['records'][0];

export default function AiAssistantPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractFromUrlOutputType | null>(null);
  const [applied, setApplied] = useState(false);

  const handleExtract = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    setApplied(false);
    try {
      const data = await extractFromUrl({ url: url.trim() });
      setResult(data);
      if (data.records.length === 0) {
        toast.info('No new or updated records found from this URL.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to extract data from URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">AI Link Extractor</h1>
        <p className="text-muted-foreground mt-1">
          Paste a product page, spec sheet, or listing URL and the AI will extract data to create or update records.
        </p>
      </div>

      <div className="flex gap-3 mb-8">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleExtract()}
            placeholder="https://example.com/product-page"
            className="pl-10"
            disabled={loading}
          />
        </div>
        <Button onClick={handleExtract} disabled={loading || !url.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
          {loading ? 'Extracting…' : 'Extract'}
        </Button>
      </div>

      {loading && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground font-medium">Reading the page and extracting data…</p>
            <p className="text-sm text-muted-foreground/70 mt-1">This may take 15–30 seconds</p>
          </CardContent>
        </Card>
      )}

      {result && !loading && (
        <ChangeReview result={result} applied={applied} onApplied={() => setApplied(true)} />
      )}
    </div>
  );
}
