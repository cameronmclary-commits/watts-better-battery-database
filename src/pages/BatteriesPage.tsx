import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  listBatteriesWithPricing, checkBatteryUpdates, applyBatteryUpdates,
  discoverMarketBatteries, aiSearchBattery, saveBattery, seedBatteries,
  ListBatteriesWithPricingOutputType, CheckBatteryUpdatesOutputType,
  DiscoverMarketBatteriesOutputType,
} from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Checkbox } from '@project/components/ui/checkbox';
import { Label } from '@project/components/ui/label';
import { Plus, Search, ChevronRight, RefreshCw, Loader2, Check, X, AlertTriangle, Globe, Zap, DollarSign, ShieldCheck, ShieldAlert, ShieldQuestion, XCircle } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';
import BatteryFormDialog from '../components/BatteryFormDialog';

type Battery = ListBatteriesWithPricingOutputType['batteries'][0];
type UpdateResult = CheckBatteryUpdatesOutputType['results'][0];
type DiscoveredBattery = DiscoverMarketBatteriesOutputType['batteries'][0];

const STATES = ['All', 'QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

export default function BatteriesPage() {
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [search, setSearch] = useState('');
  const [state, setState] = useState('QLD');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showUpdates, setShowUpdates] = useState(false);
  const [checking, setChecking] = useState(false);
  const [updateResults, setUpdateResults] = useState<UpdateResult[]>([]);
  const [showDiscover, setShowDiscover] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const searchRef = useRef(search);
  const stateRef = useRef(state);
  searchRef.current = search;
  stateRef.current = state;

  const fetchBatteries = useCallback(async (q: string, st: string) => {
    setLoading(true);
    try {
      const res = await listBatteriesWithPricing({ search: q || undefined, state: st === 'All' ? undefined : st });
      setBatteries(res.batteries);
    } finally { setLoading(false); }
  }, []);

  const debouncedFetch = useDebouncedCallback((q: string) => fetchBatteries(q, stateRef.current), 300);
  const load = useCallback(() => fetchBatteries(searchRef.current, stateRef.current), [fetchBatteries]);
  useEffect(() => { fetchBatteries('', state); }, [fetchBatteries, state]);

  const handleSearchChange = (value: string) => { setSearch(value); debouncedFetch(value); };
  const handleStateChange = (value: string) => { setState(value); fetchBatteries(search, value); };

  const handleCheckUpdates = async () => {
    setChecking(true); setShowUpdates(true); setUpdateResults([]);
    try {
      const res = await checkBatteryUpdates({});
      setUpdateResults(res.results);
      const withChanges = res.results.filter(r => !r.noChanges).length;
      if (withChanges > 0) toast.info(`Found updates for ${withChanges} ${withChanges === 1 ? 'battery' : 'batteries'}`);
      else toast.success('All batteries are up to date');
    } catch (err: any) { toast.error(err?.message || 'Failed to check for updates'); }
    finally { setChecking(false); }
  };

  const statusColor: Record<string, string> = {
    Active: 'bg-emerald-100 text-emerald-700',
    Available: 'bg-emerald-100 text-emerald-700',
    'Not Available': 'bg-red-100 text-red-700',
    'Not Recommended': 'bg-orange-100 text-orange-700',
    Discontinued: 'bg-red-100 text-red-700',
    'Coming Soon': 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-0">
      {/* Brand gradient header */}
      <div className="brand-gradient px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-sm">Batteries</h2>
            <p className="text-white/70 text-sm mt-0.5">Manage your battery product catalog</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowDiscover(true)} className="bg-white/15 border-white/20 text-white hover:bg-white/25 hover:text-white backdrop-blur-sm">
              <Globe className="h-4 w-4 mr-1.5" /> Discover
            </Button>
            <Button variant="outline" onClick={handleCheckUpdates} disabled={checking} className="bg-white/15 border-white/20 text-white hover:bg-white/25 hover:text-white backdrop-blur-sm">
              {checking ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
              Check Updates
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-white text-primary hover:bg-white/90 font-semibold">
              <Plus className="h-4 w-4 mr-1.5" /> Add Battery
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 pt-5 pb-4 flex items-center gap-3 brand-gradient-subtle">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search batteries..." value={search} onChange={e => handleSearchChange(e.target.value)} className="pl-9" />
        </div>
        <Select value={state} onValueChange={handleStateChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="State" />
          </SelectTrigger>
          <SelectContent>
            {STATES.map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All States' : s}</SelectItem>)}
          </SelectContent>
        </Select>
        {state !== 'All' && (
          <p className="text-xs text-muted-foreground">Prices reflect {state} installers</p>
        )}
      </div>

      <div className="px-6 pb-6">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-56 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : batteries.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? 'No batteries match your search.' : (
            <div className="space-y-4">
              <p>No batteries yet. Load the starter list, add one, or use Discover to search the market.</p>
              <Button disabled={seeding} onClick={async () => {
                setSeeding(true);
                try {
                  const r = await seedBatteries({});
                  toast.success(r.message);
                  fetchBatteries('', state);
                } catch (err: any) { toast.error(err?.message || 'Failed to load batteries'); }
                finally { setSeeding(false); }
              }}>
                {seeding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Load starter batteries
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batteries.map(b => (
            <BatteryCard key={b.id} battery={b} statusColor={statusColor} state={state} />
          ))}
        </div>
      )}
      </div>

      <BatteryFormDialog open={showForm} onOpenChange={setShowForm} onSaved={load} />
      <UpdateReviewDialog open={showUpdates} onOpenChange={setShowUpdates} results={updateResults} checking={checking} onApplied={load} />
      <DiscoverBatteriesDialog open={showDiscover} onOpenChange={setShowDiscover} onSaved={load} />
    </div>
  );
}

function BatteryCard({ battery: b, statusColor, state }: { battery: Battery; statusColor: Record<string, string>; state: string }) {
  const hasPrice = b.priceMin != null || b.priceMax != null;

  return (
    <Link to={`/batteries/${b.id}`}
      className={`group rounded-xl bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
        b.reviewAlert === 'Discrepancy' ? 'border-l-4 border-l-red-500' :
        b.reviewAlert === 'Mixed Signals' ? 'border-l-4 border-l-amber-400' : ''
      }`}
      style={{
        boxShadow: '0 4px 12px -2px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.7)',
        borderTop: '1px solid rgba(255,255,255,0.6)',
        borderBottom: '3px solid rgba(0,0,0,0.08)',
        border: b.reviewAlert === 'Discrepancy' ? undefined : b.reviewAlert === 'Mixed Signals' ? undefined : '1px solid hsl(275 25% 82%)',
        borderBottomWidth: '3px',
        borderBottomColor: 'rgba(0,0,0,0.1)',
      }}>

      {b.imageUrl ? (
        <div className="h-36 bg-muted overflow-hidden">
          <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="h-36 bg-muted flex items-center justify-center text-muted-foreground text-sm">
          {b.logoUrl ? (
            <img src={b.logoUrl} alt={b.manufacturer} className="max-h-16 max-w-[80%] object-contain" />
          ) : 'No image'}
        </div>
      )}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold truncate">{b.name}</h3>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <p className="text-sm text-muted-foreground">{b.manufacturer}{b.model ? ` · ${b.model}` : ''}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {b.status && <Badge variant="secondary" className={statusColor[b.status] || ''}>{b.status}</Badge>}
          {b.usableCapacity != null && <Badge variant="outline">{b.usableCapacity} kWh</Badge>}
          {b.reviewAlert === 'Discrepancy' && (
            <Badge variant="outline" className="text-xs gap-1 bg-red-100 text-red-700 border-red-200">
              <XCircle className="h-3 w-3" /> Review Alert
            </Badge>
          )}
          {b.reviewAlert === 'Mixed Signals' && (
            <Badge variant="outline" className="text-xs gap-1 bg-amber-100 text-amber-700 border-amber-200">
              <AlertTriangle className="h-3 w-3" /> Mixed Reviews
            </Badge>
          )}
        </div>

        {hasPrice && (
          <div className="flex items-center gap-1.5 text-sm">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">
              {b.priceMin != null && b.priceMax != null && b.priceMin !== b.priceMax
                ? `$${b.priceMin.toLocaleString()} – $${b.priceMax.toLocaleString()}`
                : `$${(b.priceMin ?? b.priceMax ?? 0).toLocaleString()}`}
            </span>
            {b.installerCount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({b.installerCount} installer{b.installerCount !== 1 ? 's' : ''}{state !== 'All' ? ` in ${state}` : ''})
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {b.compatiblePlanCount > 0 && (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" /> {b.compatiblePlanCount} plan{b.compatiblePlanCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function DiscoverBatteriesDialog({ open, onOpenChange, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void;
}) {
  const [state, setState] = useState('QLD');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DiscoveredBattery[]>([]);
  const [marketSummary, setMarketSummary] = useState('');
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) { setResults([]); setMarketSummary(''); setSavedIndexes(new Set()); }
  }, [open]);

  const handleSearch = async () => {
    setSearching(true); setResults([]); setMarketSummary('');
    try {
      const r = await discoverMarketBatteries({ state });
      setResults(r.batteries);
      setMarketSummary(r.marketSummary);
      toast.success(`Found ${r.batteries.length} batteries for ${state}`);
    } catch (err: any) { toast.error(err?.message || 'Discovery failed'); }
    finally { setSearching(false); }
  };

  const handleSaveBattery = async (battery: DiscoveredBattery, index: number) => {
    setSavingIndex(index);
    try {
      // Do a detailed AI search then save
      const r = await aiSearchBattery({ query: `${battery.name} by ${battery.manufacturer}` });
      await saveBattery({
        name: r.name || battery.name,
        manufacturer: r.manufacturer || battery.manufacturer,
        model: r.model || battery.model,
        moduleSize: r.moduleSize,
        usableCapacity: r.usableCapacity,
        maxChargeRate: r.maxChargeRate,
        maxDischargeRate: r.maxDischargeRate,
        roundTripEfficiency: r.roundTripEfficiency,
        cycleWarranty: r.cycleWarranty,
        depthOfDischarge: r.depthOfDischarge,
        description: r.description || null,
        status: r.status || 'Active',
        additionalInfo: r.additionalInfo || null,
        manufacturerOverview: r.manufacturerOverview || null,
      });
      setSavedIndexes(prev => new Set(prev).add(index));
      toast.success(`Saved "${r.name || battery.name}" with full specs`);
      onSaved();
    } catch (err: any) { toast.error(err?.message || 'Failed to save battery'); }
    finally { setSavingIndex(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Discover Batteries</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border border-dashed rounded-lg p-3 bg-muted/30 space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Globe className="h-4 w-4 text-primary" /> Search Australian Market
            </Label>
            <div className="flex gap-2">
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'ACT', 'NT'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={searching} className="flex-1">
                {searching ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Searching market...</> : <><Search className="h-4 w-4 mr-1.5" /> Find Home Batteries in {state}</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">AI searches for all notable home battery storage products available in the selected state. Saving a battery does a deep AI lookup for full specs.</p>
          </div>

          {marketSummary && (
            <div className="bg-muted/20 border rounded-lg p-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Market Summary</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">{marketSummary}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((battery, i) => {
                const saved = savedIndexes.has(i);
                return (
                  <div key={i} className="border rounded-lg p-3 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{battery.name}</span>
                        <Badge variant="outline" className="text-xs">{battery.manufacturer}</Badge>
                        {battery.chemistry && <Badge variant="secondary" className="text-xs">{battery.chemistry}</Badge>}
                        {battery.vppCompatible && <Badge className="text-xs bg-purple-600">VPP</Badge>}
                      </div>
                      {saved ? (
                        <Badge variant="default" className="bg-emerald-600 text-xs shrink-0">✓ Saved</Badge>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-xs shrink-0"
                          disabled={savingIndex !== null}
                          onClick={() => handleSaveBattery(battery, i)}>
                          {savingIndex === i ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                          Save
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{battery.keyFeatures}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {battery.usableCapacityKwh && <span>{battery.usableCapacityKwh} kWh</span>}
                      {battery.maxDischargeKw && <span>{battery.maxDischargeKw} kW discharge</span>}
                      {(battery.priceRangeMin || battery.priceRangeMax) && (
                        <span className="font-medium text-foreground">
                          ${(battery.priceRangeMin ?? 0).toLocaleString()} – ${(battery.priceRangeMax ?? 0).toLocaleString()}
                        </span>
                      )}
                      {battery.warrantyYears && <span>{battery.warrantyYears}yr warranty</span>}
                    </div>
                    {battery.compatiblePlans.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">Plans:</span>
                        {battery.compatiblePlans.map((p, j) => (
                          <Badge key={j} variant="secondary" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs italic text-muted-foreground">{battery.suitability}</p>
                  </div>
                );
              })}
            </div>
          )}

          {searching && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI is searching the {state} market for home batteries...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UpdateReviewDialog({ open, onOpenChange, results, checking, onApplied }: {
  open: boolean; onOpenChange: (o: boolean) => void; results: UpdateResult[]; checking: boolean; onApplied: () => void;
}) {
  // Track which changes are selected AND which value to use (current vs proposed)
  const [selectedChanges, setSelectedChanges] = useState<Record<string, Set<number>>>({});
  const [valueChoices, setValueChoices] = useState<Record<string, Record<number, 'current' | 'proposed'>>>({});
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) { setSelectedChanges({}); setValueChoices({}); setApplied(new Set()); }
  }, [open]);

  const toggleChange = (batteryId: string, changeIdx: number) => {
    setSelectedChanges(prev => {
      const next = { ...prev };
      const set = new Set(next[batteryId] || []);
      if (set.has(changeIdx)) set.delete(changeIdx); else set.add(changeIdx);
      next[batteryId] = set;
      return next;
    });
    // Default to proposed when first selected
    setValueChoices(prev => {
      const bc = { ...(prev[batteryId] || {}) };
      if (!(changeIdx in bc)) bc[changeIdx] = 'proposed';
      return { ...prev, [batteryId]: bc };
    });
  };

  const setValueChoice = (batteryId: string, changeIdx: number, choice: 'current' | 'proposed') => {
    setValueChoices(prev => ({
      ...prev,
      [batteryId]: { ...(prev[batteryId] || {}), [changeIdx]: choice },
    }));
  };

  const selectAll = (batteryId: string, changes: UpdateResult['changes']) => {
    setSelectedChanges(prev => ({ ...prev, [batteryId]: new Set(changes.map((_, i) => i)) }));
    // Default all to proposed
    const choices: Record<number, 'current' | 'proposed'> = {};
    changes.forEach((_, i) => { choices[i] = 'proposed'; });
    setValueChoices(prev => ({ ...prev, [batteryId]: { ...(prev[batteryId] || {}), ...choices } }));
  };

  const handleApply = async (result: UpdateResult) => {
    const selected = selectedChanges[result.batteryId];
    if (!selected || selected.size === 0) return;
    setApplying(result.batteryId);
    try {
      const choices = valueChoices[result.batteryId] || {};
      const updates = result.changes
        .filter((_, i) => selected.has(i))
        .map((c, i) => ({
          field: c.field,
          value: (choices[i] || 'proposed') === 'current' ? c.currentValue : c.proposedValue,
        }));
      await applyBatteryUpdates({ batteryId: result.batteryId, updates });
      setApplied(prev => new Set(prev).add(result.batteryId));
      toast.success(`Updated ${result.batteryName}`);
      onApplied();
    } catch (err: any) { toast.error(err?.message || 'Failed to apply updates'); }
    finally { setApplying(null); }
  };

  const withChanges = results.filter(r => !r.noChanges);
  const upToDate = results.filter(r => r.noChanges);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Battery Update Check</DialogTitle></DialogHeader>
        {checking ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI is checking all batteries against current web data...</p>
          </div>
        ) : results.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No results yet.</p>
        ) : (
          <div className="space-y-4">
            {withChanges.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> Updates Found ({withChanges.length})
                </h3>
                {withChanges.map(result => (
                  <BatteryUpdateCard key={result.batteryId} result={result}
                    selected={selectedChanges[result.batteryId] || new Set()}
                    valueChoices={valueChoices[result.batteryId] || {}}
                    onToggle={(i) => toggleChange(result.batteryId, i)}
                    onValueChoice={(i, c) => setValueChoice(result.batteryId, i, c)}
                    onSelectAll={() => selectAll(result.batteryId, result.changes)}
                    onApply={() => handleApply(result)}
                    applying={applying === result.batteryId}
                    isApplied={applied.has(result.batteryId)} />
                ))}
              </div>
            )}
            {upToDate.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
                  <Check className="h-4 w-4 text-emerald-500" /> Up to Date ({upToDate.length})
                </h3>
                <div className="space-y-1.5">
                  {upToDate.map(r => (
                    <div key={r.batteryId} className="flex items-center justify-between px-3 py-2 border rounded text-sm bg-card">
                      <span className="font-medium">{r.batteryName}</span>
                      {r.summary && <span className="text-xs text-muted-foreground truncate ml-4 max-w-md">{r.summary}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BatteryUpdateCard({ result, selected, valueChoices, onToggle, onValueChoice, onSelectAll, onApply, applying, isApplied }: {
  result: UpdateResult; selected: Set<number>; valueChoices: Record<number, 'current' | 'proposed'>;
  onToggle: (i: number) => void; onValueChoice: (i: number, choice: 'current' | 'proposed') => void;
  onSelectAll: () => void; onApply: () => void; applying: boolean; isApplied: boolean;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
        <div>
          <span className="font-semibold">{result.batteryName}</span>
          <span className="text-sm text-muted-foreground ml-2">— {result.changes.length} {result.changes.length === 1 ? 'change' : 'changes'} found</span>
        </div>
        <div className="flex items-center gap-2">
          {!isApplied && (
            <>
              <Button variant="ghost" size="sm" onClick={onSelectAll}>Select All</Button>
              <Button size="sm" onClick={onApply} disabled={applying || selected.size === 0}>
                {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Apply {selected.size > 0 ? `(${selected.size})` : ''}
              </Button>
            </>
          )}
          {isApplied && <Badge variant="default" className="bg-emerald-600">Applied</Badge>}
        </div>
      </div>
      {result.summary && (
        <div className="px-4 py-2 border-b text-sm text-muted-foreground bg-muted/10">{result.summary}</div>
      )}
      <div className="divide-y">
        {result.changes.map((change, i) => {
          const isSelected = selected.has(i);
          const choice = valueChoices[i] || 'proposed';
          return (
            <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm">
              {!isApplied && (
                <Checkbox checked={isSelected} onCheckedChange={() => onToggle(i)} className="mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium capitalize">{change.field.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <ConfidenceBadge confidence={(change as any).confidence} sourceCount={(change as any).sourceCount} />
                </div>
                {isSelected && !isApplied ? (
                  <div className="mt-1.5 space-y-1.5">
                    <label className={`flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer transition-colors ${choice === 'current' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                      onClick={() => onValueChoice(i, 'current')}>
                      <input type="radio" name={`${result.batteryId}-${i}`} checked={choice === 'current'} onChange={() => onValueChoice(i, 'current')} className="accent-primary" />
                      <span className="text-xs text-muted-foreground">Keep current:</span>
                      <span className="font-medium text-sm">{change.currentValue || 'empty'}</span>
                    </label>
                    <label className={`flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer transition-colors ${choice === 'proposed' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                      onClick={() => onValueChoice(i, 'proposed')}>
                      <input type="radio" name={`${result.batteryId}-${i}`} checked={choice === 'proposed'} onChange={() => onValueChoice(i, 'proposed')} className="accent-primary" />
                      <span className="text-xs text-muted-foreground">Use proposed:</span>
                      <span className="font-medium text-sm text-primary">{change.proposedValue || 'empty'}</span>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-muted-foreground line-through">{change.currentValue || 'empty'}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="font-medium text-primary">{change.proposedValue || 'empty'}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">{change.reason}</p>
                {(change as any).sources?.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">Sources:</span>
                    {(change as any).sources.map((s: string, j: number) => (
                      <span key={j} className="text-xs bg-muted px-1.5 py-0.5 rounded">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ConfidenceBadge({ confidence, sourceCount }: { confidence?: string; sourceCount?: number }) {
  if (!confidence) return null;
  const config: Record<string, { icon: typeof ShieldCheck; label: string; className: string }> = {
    high: { icon: ShieldCheck, label: 'High', className: 'bg-emerald-100 text-emerald-700' },
    medium: { icon: ShieldAlert, label: 'Medium', className: 'bg-amber-100 text-amber-700' },
    low: { icon: ShieldQuestion, label: 'Low', className: 'bg-red-100 text-red-700' },
  };
  const c = config[confidence] || config.low;
  const Icon = c.icon;
  return (
    <Badge variant="secondary" className={`text-xs gap-1 ${c.className}`}>
      <Icon className="h-3 w-3" />
      {c.label}{sourceCount != null ? ` (${sourceCount} source${sourceCount !== 1 ? 's' : ''})` : ''}
    </Badge>
  );
}
