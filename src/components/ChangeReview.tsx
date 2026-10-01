import { useState } from 'react';
import { applyUrlChanges, ExtractFromUrlOutputType } from 'zitejs/api';
import { toast } from 'sonner';
import { CheckCircle2, PlusCircle, AlertTriangle, ChevronDown, ChevronUp, Pencil, ExternalLink } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Card, CardContent } from '@project/components/ui/card';
import { Checkbox } from '@project/components/ui/checkbox';

type RecordUpdate = ExtractFromUrlOutputType['records'][0];
type Change = RecordUpdate['changes'][0];

const TYPE_LABELS: Record<string, string> = {
  battery: 'Battery',
  solarPanel: 'Solar Panel',
  energyPlan: 'Energy Plan',
  installer: 'Installer',
  inspector: 'Inspector',
};

function RecordCard({
  record,
  selectedFields,
  onToggleField,
}: {
  record: RecordUpdate;
  selectedFields: Set<string>;
  onToggleField: (field: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          {record.isNew ? (
            <PlusCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          ) : (
            <Pencil className="h-5 w-5 text-amber-500 shrink-0" />
          )}
          <div className="min-w-0">
            <span className="font-semibold truncate block">{record.recordName}</span>
            <span className="text-xs text-muted-foreground">
              {TYPE_LABELS[record.recordType] || record.recordType}
              {record.isNew ? ' · New record' : ' · Update existing'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-xs">
            {selectedFields.size}/{record.changes.length} fields
          </Badge>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <CardContent className="px-5 pb-5 pt-0">
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-0 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-2 border-b">
              <div className="w-8" />
              <div>Field</div>
              <div>{record.isNew ? '' : 'Current'}</div>
              <div>New Value</div>
            </div>
            {record.changes.map((change) => (
              <FieldRow
                key={change.field}
                change={change}
                isNew={record.isNew}
                checked={selectedFields.has(change.field)}
                onToggle={() => onToggleField(change.field)}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function FieldRow({
  change,
  isNew,
  checked,
  onToggle,
}: {
  change: Change;
  isNew: boolean;
  checked: boolean;
  onToggle: () => void;
}) {
  const isLong = (change.proposedValue?.length || 0) > 100 || (change.currentValue?.length || 0) > 100;

  if (isLong) {
    return (
      <div className="border-b last:border-b-0 px-3 py-2.5">
        <div className="flex items-center gap-2 mb-2">
          <Checkbox checked={checked} onCheckedChange={onToggle} />
          <span className="text-sm font-medium">{change.fieldLabel}</span>
        </div>
        {!isNew && change.currentValue && (
          <div className="ml-8 mb-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Current</span>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{change.currentValue}</p>
          </div>
        )}
        <div className="ml-8">
          <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-medium">New</span>
          <p className="text-xs mt-0.5 line-clamp-3">{change.proposedValue || '—'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-0 items-center border-b last:border-b-0 px-3 py-2.5 text-sm">
      <div className="w-8">
        <Checkbox checked={checked} onCheckedChange={onToggle} />
      </div>
      <div className="font-medium text-xs">{change.fieldLabel}</div>
      <div className="text-xs text-muted-foreground truncate pr-2">
        {isNew ? '' : change.currentValue || '—'}
      </div>
      <div className="text-xs truncate">{change.proposedValue || '—'}</div>
    </div>
  );
}

export default function ChangeReview({
  result,
  applied,
  onApplied,
}: {
  result: ExtractFromUrlOutputType;
  applied: boolean;
  onApplied: () => void;
}) {
  // Track selected fields per record index
  const [selections, setSelections] = useState<Map<number, Set<string>>>(() => {
    const m = new Map<number, Set<string>>();
    result.records.forEach((rec, i) => {
      m.set(i, new Set(rec.changes.map(c => c.field)));
    });
    return m;
  });
  const [applying, setApplying] = useState(false);

  const toggleField = (recIdx: number, field: string) => {
    setSelections(prev => {
      const next = new Map(prev);
      const s = new Set(next.get(recIdx) || []);
      if (s.has(field)) s.delete(field);
      else s.add(field);
      next.set(recIdx, s);
      return next;
    });
  };

  const totalSelected = Array.from(selections.values()).reduce((n, s) => n + s.size, 0);

  const handleApply = async () => {
    const updates = result.records
      .map((rec, i) => {
        const sel = selections.get(i);
        if (!sel || sel.size === 0) return null;
        return {
          recordType: rec.recordType,
          recordId: rec.recordId,
          isNew: rec.isNew,
          recordName: rec.recordName,
          fields: rec.changes
            .filter(c => sel.has(c.field))
            .map(c => ({ field: c.field, value: c.proposedValue })),
        };
      })
      .filter(Boolean) as any[];

    if (updates.length === 0) {
      toast.info('No fields selected to apply.');
      return;
    }

    setApplying(true);
    try {
      const res = await applyUrlChanges({ updates });
      toast.success(`Done — ${res.applied} updated, ${res.created} created`);
      onApplied();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply changes');
    } finally {
      setApplying(false);
    }
  };

  if (result.records.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <AlertTriangle className="h-7 w-7 mx-auto mb-3 text-amber-500" />
          <p className="font-medium">No actionable records found</p>
          <p className="text-sm text-muted-foreground mt-1">{result.summary}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{result.summary}</p>
          <a href={result.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
            <ExternalLink className="h-3 w-3" /> Source
          </a>
        </div>
      </div>

      <div className="space-y-3">
        {result.records.map((rec, i) => (
          <RecordCard
            key={i}
            record={rec}
            selectedFields={selections.get(i) || new Set()}
            onToggleField={(f) => toggleField(i, f)}
          />
        ))}
      </div>

      {!applied ? (
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {totalSelected} field{totalSelected !== 1 ? 's' : ''} selected across {result.records.length} record{result.records.length !== 1 ? 's' : ''}
          </p>
          <Button onClick={handleApply} disabled={applying || totalSelected === 0}>
            {applying ? 'Applying…' : `Apply ${totalSelected} Change${totalSelected !== 1 ? 's' : ''}`}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 pt-2 border-t text-emerald-600">
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-sm font-medium">Changes applied successfully</span>
        </div>
      )}
    </div>
  );
}
