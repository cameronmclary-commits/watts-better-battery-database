import { useState, useEffect, useCallback } from 'react';
import {
  listEnergyPlans, saveEnergyPlan, deleteEnergyPlan, aiSearchEnergyPlan,
  discoverMarketPlans, listPlanCompatibility, savePlanCompatibility, deletePlanCompatibility,
  ListEnergyPlansOutputType, AiSearchEnergyPlanOutputType,
  DiscoverMarketPlansOutputType, ListPlanCompatibilityOutputType,
} from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Switch } from '@project/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Plus, Pencil, Trash2, Sparkles, Loader2, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, Search, Globe } from 'lucide-react';
import { toast } from 'sonner';

type Plan = ListEnergyPlansOutputType['plans'][0];
type CompatRecord = ListPlanCompatibilityOutputType['records'][0];
type DiscoveredPlan = DiscoverMarketPlansOutputType['plans'][0];

const STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'ACT', 'NT'];

export default function EnergyPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDiscover, setShowDiscover] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await listEnergyPlans({}); setPlans(res.plans); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteEnergyPlan({ id });
    toast.success('Plan deleted'); load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Energy Plans</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowDiscover(true)}>
            <Globe className="h-4 w-4 mr-1.5" /> Discover Plans
          </Button>
          <Button onClick={() => { setEditPlan(null); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Plan
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No energy plans yet.</div>
      ) : (
        <div className="space-y-3">
          {plans.map(p => (
            <PlanCard key={p.id} plan={p}
              expanded={expandedId === p.id}
              onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
              onEdit={() => { setEditPlan(p); setShowForm(true); }}
              onDelete={() => handleDelete(p.id)} />
          ))}
        </div>
      )}

      <PlanFormDialog open={showForm} onOpenChange={setShowForm} plan={editPlan} onSaved={load} />
      <DiscoverPlansDialog open={showDiscover} onOpenChange={setShowDiscover} onSaved={load} existingPlans={plans} />
    </div>
  );
}

function PlanCard({ plan, expanded, onToggle, onEdit, onDelete }: {
  plan: Plan; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [compatRecords, setCompatRecords] = useState<CompatRecord[]>([]);
  const [compatLoaded, setCompatLoaded] = useState(false);

  useEffect(() => {
    if (expanded && !compatLoaded) {
      listPlanCompatibility({ planId: plan.id }).then(r => {
        setCompatRecords(r.records);
        setCompatLoaded(true);
      });
    }
  }, [expanded, compatLoaded, plan.id]);

  const handleStatusChange = async (rec: CompatRecord, newStatus: string) => {
    await savePlanCompatibility({
      id: rec.id, batteryId: rec.batteryId, planId: rec.planId,
      compatibilityStatus: newStatus, compatibilityNotes: rec.compatibilityNotes, restrictions: rec.restrictions,
    });
    setCompatRecords(prev => prev.map(r => r.id === rec.id ? { ...r, compatibilityStatus: newStatus } : r));
    toast.success('Compatibility updated');
  };

  const handleDeleteCompat = async (id: string) => {
    await deletePlanCompatibility({ id });
    setCompatRecords(prev => prev.filter(r => r.id !== id));
    toast.success('Compatibility record removed');
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-semibold truncate">{plan.planName}</span>
          {plan.provider && <span className="text-sm text-muted-foreground">{plan.provider}</span>}
          {plan.tariffType && <Badge variant="outline">{plan.tariffType}</Badge>}
          {plan.biDirectionalCharging && <Badge variant="default" className="text-xs">Battery Bi-Directional</Badge>}
          {plan.statesAvailable && plan.statesAvailable.split(',').map(s => s.trim()).filter(Boolean).map(s => (
            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {plan.planUrl && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); window.open(plan.planUrl!, '_blank'); }}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={e => e.stopPropagation()}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove {plan.planName}.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/10">
          <Tabs defaultValue="tariffs" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-auto p-0">
              <TabsTrigger value="tariffs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Tariffs</TabsTrigger>
              <TabsTrigger value="feedin" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Feed-In</TabsTrigger>
              {plan.vppDetails && <TabsTrigger value="vpp" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">VPP / Wholesale</TabsTrigger>}
              <TabsTrigger value="batteries" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Battery Compatibility</TabsTrigger>
              <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Overview</TabsTrigger>
            </TabsList>

            <TabsContent value="tariffs" className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-muted-foreground">Avg Cost:</span> {plan.avgCostPerKwh != null ? `$${plan.avgCostPerKwh.toFixed(4)}/kWh` : '—'}</div>
                <div><span className="text-muted-foreground">Comparison Rate:</span> {plan.comparisonRate != null ? `${plan.comparisonRate} c/kWh` : '—'}</div>
                <div><span className="text-muted-foreground">Max Draw:</span> {plan.maxGridDrawKw != null ? `${plan.maxGridDrawKw} kW` : '—'}</div>
              </div>
              {plan.biDirectionalHours && <div className="text-sm"><span className="text-muted-foreground">Battery Bi-Directional Hours:</span> {plan.biDirectionalHours}</div>}
              {plan.tariffDetails ? (
                <div className="bg-card border rounded-lg p-4">
                  <h4 className="font-semibold text-sm mb-2">Rate Schedule</h4>
                  <pre className="text-sm whitespace-pre-wrap font-mono text-xs leading-relaxed">{plan.tariffDetails}</pre>
                </div>
              ) : <p className="text-sm text-muted-foreground">No tariff details captured yet.</p>}
            </TabsContent>

            <TabsContent value="feedin" className="p-4">
              {plan.feedInTariff ? (
                <div className="bg-card border rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono text-xs leading-relaxed">{plan.feedInTariff}</pre>
                </div>
              ) : <p className="text-sm text-muted-foreground">No feed-in tariff details captured yet.</p>}
            </TabsContent>

            {plan.vppDetails && (
              <TabsContent value="vpp" className="p-4">
                <div className="bg-card border rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap font-mono text-xs leading-relaxed">{plan.vppDetails}</pre>
                </div>
              </TabsContent>
            )}

            <TabsContent value="batteries" className="p-4 space-y-3">
              {compatRecords.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Per-Battery Compatibility</Label>
                  {compatRecords.map(rec => (
                    <div key={rec.id} className="flex items-center justify-between bg-card border rounded-lg px-4 py-2.5 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{rec.batteryName}</span>
                        {rec.compatibilityNotes && <span className="text-muted-foreground ml-2 text-xs">({rec.compatibilityNotes})</span>}
                        {rec.restrictions && (
                          <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400 mt-1">
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{rec.restrictions}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Select value={rec.compatibilityStatus.toLowerCase()} onValueChange={v => handleStatusChange(rec, v)}>
                          <SelectTrigger className="h-7 w-[130px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="compatible">✅ Compatible</SelectItem>
                            <SelectItem value="partial">⚠️ Partial</SelectItem>
                            <SelectItem value="incompatible">❌ Incompatible</SelectItem>
                            <SelectItem value="unconfirmed">❓ Unconfirmed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteCompat(rec.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No battery compatibility records yet. Use battery AI search to auto-create them, or add plans from the Discover feature.</p>
              )}
              {plan.batteryLimitations && (
                <div className="mt-3">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Notes (Legacy)</Label>
                  <div className="bg-card border rounded-lg p-4 mt-1">
                    <pre className="text-sm whitespace-pre-wrap font-mono text-xs leading-relaxed">{plan.batteryLimitations}</pre>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="overview" className="p-4 space-y-3">
              {plan.contractTerms && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contract Terms</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{plan.contractTerms}</p>
                </div>
              )}
              {plan.aiSummary && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Summary</Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{plan.aiSummary}</p>
                </div>
              )}
              {plan.planUrl && (
                <div><span className="text-sm text-muted-foreground">Plan URL:</span> <a href={plan.planUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline ml-1">{plan.planUrl}</a></div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function PlanFormDialog({ open, onOpenChange, plan, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; plan: Plan | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    planName: '', provider: '', tariffType: '', biDirectional: false,
    biDirectionalHours: '', avgCost: '', maxDraw: '', planUrl: '',
    aiSummary: '', batteryLimitations: '', tariffDetails: '', feedInTariff: '',
    vppDetails: '', comparisonRate: '', contractTerms: '', statesAvailable: '',
  });
  const [saving, setSaving] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiState, setAiState] = useState('QLD');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiBatteryResults, setAiBatteryResults] = useState<AiSearchEnergyPlanOutputType['batteryLimitations']>([]);

  const set = (k: string, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiSearching(true);
    try {
      const r = await aiSearchEnergyPlan({ query: aiQuery.trim(), state: aiState || undefined });
      setForm(prev => ({
        ...prev,
        planName: r.planName || prev.planName,
        provider: r.provider || prev.provider,
        tariffType: r.tariffType || prev.tariffType,
        biDirectional: r.biDirectionalCharging,
        biDirectionalHours: r.biDirectionalHours || prev.biDirectionalHours,
        avgCost: r.avgCostPerKwh != null ? String(r.avgCostPerKwh) : prev.avgCost,
        maxDraw: r.maxGridDrawKw != null ? String(r.maxGridDrawKw) : prev.maxDraw,
        planUrl: r.planUrl || prev.planUrl,
        aiSummary: r.aiSummary || prev.aiSummary,
        tariffDetails: r.tariffDetails || prev.tariffDetails,
        feedInTariff: r.feedInTariff || prev.feedInTariff,
        vppDetails: r.vppDetails || prev.vppDetails,
        comparisonRate: r.comparisonRate != null ? String(r.comparisonRate) : prev.comparisonRate,
        contractTerms: r.contractTerms || prev.contractTerms,
        statesAvailable: r.statesAvailable || prev.statesAvailable,
        batteryLimitations: r.batteryLimitations.length > 0
          ? r.batteryLimitations.map(b => `${b.batteryName} (${b.compatibility}): ${b.limitations}`).join('\n\n')
          : prev.batteryLimitations,
      }));
      setAiBatteryResults(r.batteryLimitations || []);
      toast.success('AI found plan details — review before saving');
    } catch (err: any) {
      toast.error(err?.message || 'AI search failed');
    } finally { setAiSearching(false); }
  };

  useEffect(() => {
    if (open) {
      setForm({
        planName: plan?.planName || '', provider: plan?.provider || '',
        tariffType: plan?.tariffType || '', biDirectional: plan?.biDirectionalCharging || false,
        biDirectionalHours: plan?.biDirectionalHours || '',
        avgCost: plan?.avgCostPerKwh != null ? String(plan.avgCostPerKwh) : '',
        maxDraw: plan?.maxGridDrawKw != null ? String(plan.maxGridDrawKw) : '',
        planUrl: plan?.planUrl || '', aiSummary: plan?.aiSummary || '',
        batteryLimitations: plan?.batteryLimitations || '',
        tariffDetails: plan?.tariffDetails || '', feedInTariff: plan?.feedInTariff || '',
        vppDetails: plan?.vppDetails || '',
        comparisonRate: plan?.comparisonRate != null ? String(plan.comparisonRate) : '',
        contractTerms: plan?.contractTerms || '', statesAvailable: plan?.statesAvailable || '',
      });
      setAiQuery(plan ? plan.planName : ''); setAiBatteryResults([]);
    }
  }, [open, plan]);

  const handleSave = async () => {
    if (!form.planName.trim()) return;
    setSaving(true);
    try {
      await saveEnergyPlan({
        id: plan?.id, planName: form.planName.trim(),
        provider: form.provider.trim() || null, tariffType: form.tariffType || null,
        biDirectionalCharging: form.biDirectional,
        biDirectionalHours: form.biDirectionalHours.trim() || null,
        avgCostPerKwh: form.avgCost ? Number(form.avgCost) : null,
        maxGridDrawKw: form.maxDraw ? Number(form.maxDraw) : null,
        planUrl: form.planUrl.trim() || null, aiSummary: form.aiSummary.trim() || null,
        batteryLimitations: form.batteryLimitations.trim() || null,
        tariffDetails: form.tariffDetails.trim() || null,
        feedInTariff: form.feedInTariff.trim() || null,
        vppDetails: form.vppDetails.trim() || null,
        comparisonRate: form.comparisonRate ? Number(form.comparisonRate) : null,
        contractTerms: form.contractTerms.trim() || null,
        statesAvailable: form.statesAvailable.trim() || null,
      });
      toast.success(plan ? 'Plan updated' : 'Plan created');
      onOpenChange(false); onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Plan' : 'Add Energy Plan'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border border-dashed rounded-lg p-3 bg-muted/30 space-y-2">
            <Label className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> AI Web Search
            </Label>
            <div className="flex gap-2">
              <Select value={aiState} onValueChange={setAiState}>
                <SelectTrigger className="w-[90px] shrink-0">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder='e.g. "Ergon Energy Time of Use" or "Amber Electric VPP"'
                value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiSearch()} />
              <Button onClick={handleAiSearch} disabled={aiSearching || !aiQuery.trim()} size="sm" className="shrink-0">
                {aiSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Searches for tariffs, feed-in rates, VPP details, and home battery compatibility. Bi-directional = battery-to-grid only (not EV).</p>
          </div>

          {aiBatteryResults.length > 0 && <AiBatteryPreview results={aiBatteryResults} />}

          <Tabs defaultValue="basics" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="tariffs">Tariffs</TabsTrigger>
              <TabsTrigger value="feedin">Feed-In</TabsTrigger>
              <TabsTrigger value="vpp">VPP</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>

            <TabsContent value="basics" className="space-y-4 pt-3">
              <div><Label>Plan Name *</Label><Input value={form.planName} onChange={e => set('planName', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Provider</Label><Input value={form.provider} onChange={e => set('provider', e.target.value)} /></div>
                <div>
                  <Label>Tariff Type</Label>
                  <Select value={form.tariffType} onValueChange={v => set('tariffType', v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {['Flat', 'Time of Use', 'VPP', 'Feed-in', 'Demand', 'Variable', 'Wholesale'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Plan URL</Label><Input value={form.planUrl} onChange={e => set('planUrl', e.target.value)} placeholder="https://..." /></div>
                <div><Label>States Available</Label><Input value={form.statesAvailable} onChange={e => set('statesAvailable', e.target.value)} placeholder="QLD, NSW, VIC, SA" /></div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.biDirectional} onCheckedChange={v => set('biDirectional', v)} />
                <Label>Home Battery Bi-Directional Charging (battery-to-grid)</Label>
              </div>
              {form.biDirectional && (
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Battery Export Hours</Label><Input placeholder="e.g. 6am-10am, 4pm-9pm" value={form.biDirectionalHours} onChange={e => set('biDirectionalHours', e.target.value)} /></div>
                  <div><Label>Avg Cost/kWh ($)</Label><Input type="number" step="0.0001" value={form.avgCost} onChange={e => set('avgCost', e.target.value)} /></div>
                  <div><Label>Max Grid Draw (kW)</Label><Input type="number" step="0.01" value={form.maxDraw} onChange={e => set('maxDraw', e.target.value)} /></div>
                </div>
              )}
              <div><Label>Comparison Rate (c/kWh)</Label><Input type="number" step="0.0001" value={form.comparisonRate} onChange={e => set('comparisonRate', e.target.value)} /></div>
            </TabsContent>

            <TabsContent value="tariffs" className="space-y-4 pt-3">
              <div>
                <Label>Tariff Rate Schedule</Label>
                <p className="text-xs text-muted-foreground mb-1">All rate structures with rates excl./incl. GST</p>
                <Textarea value={form.tariffDetails} onChange={e => set('tariffDetails', e.target.value)} rows={12}
                  className="font-mono text-xs"
                  placeholder={"Single Rate:\n  General usage: 25.43 c/kWh excl. GST | 27.97 c/kWh incl. GST\n  Supply charge: 174.56 c/day excl. GST | 192.02 c/day incl. GST\n\nTime-of-Use:\n  Peak (4pm-9pm): 43.44 c/kWh excl. GST | 47.79 c/kWh incl. GST"} />
              </div>
            </TabsContent>

            <TabsContent value="feedin" className="space-y-4 pt-3">
              <div>
                <Label>Feed-In Tariff Details</Label>
                <p className="text-xs text-muted-foreground mb-1">Solar/battery feed-in rates, VPP export credits, net/gross metering</p>
                <Textarea value={form.feedInTariff} onChange={e => set('feedInTariff', e.target.value)} rows={6}
                  placeholder="Standard solar FiT: 5.0 c/kWh\nPeak export (4pm-9pm): 12.0 c/kWh\nOff-peak export: 3.0 c/kWh\nNet metering" />
              </div>
            </TabsContent>

            <TabsContent value="vpp" className="space-y-4 pt-3">
              <div>
                <Label>VPP / Wholesale Details (Home Battery Only)</Label>
                <p className="text-xs text-muted-foreground mb-1">VPP program details, home battery requirements, credits, risk factors — leave empty for standard plans</p>
                <Textarea value={form.vppDetails} onChange={e => set('vppDetails', e.target.value)} rows={8}
                  placeholder="VPP program: ...\nSupported home batteries: ...\nEvent frequency: ...\nCredits/payments: ...\nMinimum battery size: ...\nRisk factors: ..." />
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4 pt-3">
              <div><Label>Contract Terms</Label><Textarea value={form.contractTerms} onChange={e => set('contractTerms', e.target.value)} rows={3} placeholder="Contract length, exit fees, benefit periods, conditional discounts..." /></div>
              <div><Label>AI Summary</Label><Textarea value={form.aiSummary} onChange={e => set('aiSummary', e.target.value)} rows={5} placeholder="Plan overview for home battery owners..." /></div>
              <div><Label>Battery Limitations (Text)</Label><Textarea value={form.batteryLimitations} onChange={e => set('batteryLimitations', e.target.value)} rows={4} placeholder="Per-battery compatibility notes and restrictions..." /></div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleSave} disabled={saving || !form.planName.trim()} className="w-full">
            {saving ? 'Saving...' : plan ? 'Update Plan' : 'Create Plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AiBatteryPreview({ results }: { results: AiSearchEnergyPlanOutputType['batteryLimitations'] }) {
  return (
    <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Home Battery Compatibility Found</Label>
      <div className="space-y-1.5">
        {results.map((b, i) => (
          <div key={i} className="text-sm bg-card rounded px-3 py-2 border space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{b.batteryName}</span>
              <Badge variant={b.compatibility.toLowerCase().includes('full') ? 'default' : b.compatibility.toLowerCase().includes('incompatible') ? 'destructive' : 'secondary'} className="text-xs">
                {b.compatibility}
              </Badge>
            </div>
            {b.limitations && b.limitations !== 'None known' && (
              <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{b.limitations}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiscoverPlansDialog({ open, onOpenChange, onSaved, existingPlans }: {
  open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void; existingPlans: Plan[];
}) {
  const [state, setState] = useState('QLD');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DiscoveredPlan[]>([]);
  const [marketSummary, setMarketSummary] = useState('');
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) { setResults([]); setMarketSummary(''); setSavedIndexes(new Set()); }
  }, [open]);

  const handleSearch = async () => {
    setSearching(true);
    setResults([]); setMarketSummary('');
    try {
      const r = await discoverMarketPlans({ state });
      setResults(r.plans);
      setMarketSummary(r.marketSummary);
      toast.success(`Found ${r.plans.length} plans for ${state}`);
    } catch (err: any) {
      toast.error(err?.message || 'Discovery failed');
    } finally { setSearching(false); }
  };

  const handleSavePlan = async (plan: DiscoveredPlan, index: number) => {
    setSavingIndex(index);
    try {
      // Use AI search to get full details then save
      const r = await aiSearchEnergyPlan({ query: `${plan.planName} by ${plan.provider}`, state });
      await saveEnergyPlan({
        planName: r.planName || plan.planName,
        provider: r.provider || plan.provider,
        tariffType: r.tariffType || plan.tariffType,
        biDirectionalCharging: r.biDirectionalCharging,
        biDirectionalHours: r.biDirectionalHours || null,
        avgCostPerKwh: r.avgCostPerKwh,
        maxGridDrawKw: r.maxGridDrawKw,
        planUrl: r.planUrl || null,
        aiSummary: r.aiSummary || null,
        tariffDetails: r.tariffDetails || null,
        feedInTariff: r.feedInTariff || null,
        vppDetails: r.vppDetails || null,
        comparisonRate: r.comparisonRate,
        contractTerms: r.contractTerms || null,
        statesAvailable: r.statesAvailable || plan.statesAvailable || state,
        batteryLimitations: r.batteryLimitations.length > 0
          ? r.batteryLimitations.map(b => `${b.batteryName} (${b.compatibility}): ${b.limitations}`).join('\n\n')
          : null,
      });
      setSavedIndexes(prev => new Set(prev).add(index));
      toast.success(`Saved "${r.planName || plan.planName}"`);
      onSaved();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save plan');
    } finally { setSavingIndex(null); }
  };

  const isExisting = (plan: DiscoveredPlan) =>
    existingPlans.some(ep =>
      ep.planName.toLowerCase().includes(plan.planName.toLowerCase().slice(0, 20)) ||
      plan.planName.toLowerCase().includes((ep.planName || '').toLowerCase().slice(0, 20))
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Discover Energy Plans</DialogTitle>
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
                  {STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={handleSearch} disabled={searching} className="flex-1">
                {searching ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Searching market...</> : <><Search className="h-4 w-4 mr-1.5" /> Find Home Battery Plans in {state}</>}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">AI searches for all notable electricity plans suited to home battery owners in the selected state</p>
          </div>

          {marketSummary && (
            <div className="bg-muted/20 border rounded-lg p-3">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Market Summary</Label>
              <p className="mt-1 text-sm whitespace-pre-wrap">{marketSummary}</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((plan, i) => {
                const exists = isExisting(plan);
                const saved = savedIndexes.has(i);
                return (
                  <div key={i} className="border rounded-lg p-3 bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{plan.planName}</span>
                        <Badge variant="outline" className="text-xs">{plan.provider}</Badge>
                        {plan.tariffType && <Badge variant="secondary" className="text-xs">{plan.tariffType}</Badge>}
                        {plan.vppAvailable && <Badge className="text-xs bg-purple-600">VPP</Badge>}
                        {plan.biDirectionalCharging && <Badge className="text-xs">Battery Bi-Dir</Badge>}
                        {exists && <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Already Saved</Badge>}
                      </div>
                      {saved ? (
                        <Badge variant="default" className="bg-emerald-600 text-xs shrink-0">✓ Saved</Badge>
                      ) : (
                        <Button variant="outline" size="sm" className="h-7 text-xs shrink-0"
                          disabled={savingIndex !== null}
                          onClick={() => handleSavePlan(plan, i)}>
                          {savingIndex === i ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
                          {exists ? 'Update' : 'Save'}
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.keyFeatures}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {plan.feedInRate && <span>Feed-in: {plan.feedInRate}</span>}
                      {plan.estimatedSavings && <span>Est. savings: {plan.estimatedSavings}</span>}
                      <span>{plan.statesAvailable}</span>
                    </div>
                    <p className="text-xs italic text-muted-foreground">{plan.suitability}</p>
                  </div>
                );
              })}
            </div>
          )}

          {searching && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI is searching the {state} electricity market for home battery plans...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
