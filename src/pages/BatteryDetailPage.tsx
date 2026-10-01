import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBatteryDetail, deleteBattery, checkSingleBatteryUpdate, applyBatteryUpdates, GetBatteryDetailOutputType, CheckSingleBatteryUpdateOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Checkbox } from '@project/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { ArrowLeft, Pencil, Trash2, Box, FileText, ExternalLink, RefreshCw, Loader2, Check, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react';
import { toast } from 'sonner';
import BatteryFormDialog from '../components/BatteryFormDialog';
import CapacityOptionsSection from '../components/CapacityOptionsSection';
import EnergyPlanLinkSection from '../components/EnergyPlanLinkSection';
import InstallerNetworkSection from '../components/InstallerNetworkSection';
import BatteryReviewsSection from '../components/BatteryReviewsSection';

type Detail = GetBatteryDetailOutputType;
type UpdateResult = CheckSingleBatteryUpdateOutputType;

export default function BatteryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [battery, setBattery] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateResult | null>(null);

  const handleCheckUpdates = async () => {
    if (!id) return;
    setChecking(true);
    setUpdateOpen(true);
    setUpdateResult(null);
    try {
      const res = await checkSingleBatteryUpdate({ batteryId: id });
      setUpdateResult(res);
      if (res.noChanges) toast.success('This battery is up to date');
      else toast.info(`Found ${res.changes.length} potential update${res.changes.length !== 1 ? 's' : ''}`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getBatteryDetail({ id });
      setBattery(res);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!id) return;
    await deleteBattery({ id });
    toast.success('Battery deleted');
    navigate('/batteries');
  };

  if (loading) return <div className="p-6"><div className="h-64 rounded-lg bg-muted animate-pulse" /></div>;
  if (!battery) return <div className="p-6 text-muted-foreground">Battery not found.</div>;

  const specRows = [
    ['Battery Type', battery.batteryType || '—'],
    ['All-In-One Unit', battery.allInOneUnit ? 'Yes' : 'No'],
    ['Approx Price', battery.approxPrice || '—'],
    ['Nominal Storage', battery.nominalStorage != null ? `${battery.nominalStorage} kWh` : '—'],
    ['Usable Capacity', battery.usableCapacity != null ? `${battery.usableCapacity} kWh` : '—'],
    ['Power Rating', battery.powerRating || '—'],
    ['Weight', battery.weight || '—'],
    ['Dimensions (WHD)', battery.dimensions || '—'],
    ['Off-Grid Capable', battery.offGridCapable ? 'Yes' : 'No'],
    ['IP Rating', battery.ipRating || '—'],
    ['Operating Temp Range', battery.operatingTempRange || '—'],
    ['Warranty', battery.warrantyText || '—'],
    ['Compatible Inverters', battery.compatibleInverterBrands || '—'],
    ['Total Warranted kWh', battery.totalWarrantedKwh || '—'],
    ['Cost per Warranted kWh', battery.costPerWarrantedKwh || '—'],
    ['Features', battery.features || '—'],
    ['Module Size', battery.moduleSize != null ? `${battery.moduleSize} kWh` : '—'],
    ['Max Charge Rate', battery.maxChargeRate != null ? `${battery.maxChargeRate} kW` : '—'],
    ['Max Discharge Rate', battery.maxDischargeRate != null ? `${battery.maxDischargeRate} kW` : '—'],
    ['Round Trip Efficiency', battery.roundTripEfficiency != null ? `${(battery.roundTripEfficiency * 100).toFixed(1)}%` : '—'],
    ['Min Throughput Energy', battery.cycleWarranty != null ? `${battery.cycleWarranty} MWh` : '—'],
    ['Equivalent Cycle Count', battery.cycleWarranty != null && battery.moduleSize ? `${Math.round((battery.cycleWarranty * 1000) / battery.moduleSize).toLocaleString()} cycles` : '—'],
    ['Depth of Discharge', battery.depthOfDischarge != null ? `${(battery.depthOfDischarge * 100).toFixed(1)}%` : '—'],
    ['Expandable', battery.expandable ? 'Yes' : 'No'],
    ...(battery.expandable && battery.expansionTimeframe ? [['Expansion Timeframe', battery.expansionTimeframe]] : []),
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/batteries')} className="hover:bg-muted/80 transition-all">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex flex-col md:flex-row gap-6">
        {battery.images && battery.images.length > 0 ? (
          <div className="w-full md:w-64 h-52 rounded-lg bg-muted overflow-hidden shrink-0">
            <img src={battery.images[0].url} alt={battery.name} className="w-full h-full object-cover" />
          </div>
        ) : null}

        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{battery.name}</h2>
              <p className="text-muted-foreground">{battery.manufacturer} · {battery.model}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handleCheckUpdates} disabled={checking} className="shadow-sm hover:shadow-md transition-all">
                {checking ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
                Check Updates
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="shadow-sm hover:shadow-md transition-all">
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this battery?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently remove {battery.name} and cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {battery.status && (
            <Badge variant="secondary" className={
              battery.status === 'Active' || battery.status === 'Available' ? 'bg-emerald-100 text-emerald-700' :
              battery.status === 'Discontinued' || battery.status === 'Not Available' ? 'bg-red-100 text-red-700' :
              battery.status === 'Not Recommended' ? 'bg-orange-100 text-orange-700' :
              'bg-blue-100 text-blue-700'
            }>{battery.status}</Badge>
          )}

          {battery.status === 'Not Recommended' && battery.notRecommendedReason && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
              <span className="font-semibold">Why not recommended:</span> {battery.notRecommendedReason}
            </div>
          )}

          {battery.description && <p className="text-sm">{battery.description}</p>}
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden shadow-sm">
        <div className="bg-muted/50 px-4 py-2.5 font-semibold text-sm">Specifications</div>
        <div className="divide-y">
          {specRows.map(([label, val]) => (
            <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-medium">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {battery.additionalInfo && (
        <div className="border rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-2">Additional Info</h3>
          <p className="text-sm whitespace-pre-wrap">{battery.additionalInfo}</p>
        </div>
      )}

      {battery.manufacturerOverview && (
        <div className="border rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-2">Manufacturer Overview</h3>
          <p className="text-sm whitespace-pre-wrap">{battery.manufacturerOverview}</p>
        </div>
      )}

      {(battery as any).arModel && (
        <div className="border rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><Box className="h-4 w-4" /> 3D AR Model</h3>
          <a href={(battery as any).arModel.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
            {(battery as any).arModel.filename || 'Download 3D Model'}
          </a>
        </div>
      )}

      {battery.specSheetUrl && (
        <div className="border rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-1.5"><FileText className="h-4 w-4" /> Spec Sheet</h3>
          <a href={battery.specSheetUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" /> View Spec Sheet / Datasheet
          </a>
        </div>
      )}

      <BatteryReviewsSection batteryId={battery.id} batteryName={battery.name} manufacturer={battery.manufacturer} />

      <CapacityOptionsSection batteryId={battery.id} />

      <InstallerNetworkSection batteryId={battery.id} />

      <EnergyPlanLinkSection
        batteryId={battery.id}
        linkedPlanIds={battery.energyPlanIds || []}
        linkedPlans={battery.energyPlans || []}
        onUpdated={load}
      />

      <BatteryFormDialog open={editOpen} onOpenChange={setEditOpen} onSaved={load} editBattery={battery} />
      <SingleBatteryUpdateDialog open={updateOpen} onOpenChange={setUpdateOpen} result={updateResult} checking={checking} onApplied={load} />
    </div>
  );
}

function SingleBatteryUpdateDialog({ open, onOpenChange, result, checking, onApplied }: {
  open: boolean; onOpenChange: (o: boolean) => void; result: UpdateResult | null; checking: boolean; onApplied: () => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [valueChoices, setValueChoices] = useState<Record<number, 'current' | 'proposed'>>({});
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (open) { setSelected(new Set()); setValueChoices({}); setApplied(false); }
  }, [open]);

  const toggleChange = (i: number) => {
    setSelected(prev => { const s = new Set(prev); if (s.has(i)) s.delete(i); else s.add(i); return s; });
    setValueChoices(prev => ({ ...prev, [i]: prev[i] || 'proposed' }));
  };

  const selectAll = () => {
    if (!result) return;
    setSelected(new Set(result.changes.map((_, i) => i)));
    const choices: Record<number, 'current' | 'proposed'> = {};
    result.changes.forEach((_, i) => { choices[i] = 'proposed'; });
    setValueChoices(prev => ({ ...prev, ...choices }));
  };

  const handleApply = async () => {
    if (!result || selected.size === 0) return;
    setApplying(true);
    try {
      const updates = result.changes
        .filter((_, i) => selected.has(i))
        .map((c, i) => ({
          field: c.field,
          value: (valueChoices[i] || 'proposed') === 'current' ? c.currentValue : c.proposedValue,
        }));
      await applyBatteryUpdates({ batteryId: result.batteryId, updates });
      setApplied(true);
      toast.success(`Updated ${result.batteryName}`);
      onApplied();
    } catch (err: any) { toast.error(err?.message || 'Failed to apply updates'); }
    finally { setApplying(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Check for Updates</DialogTitle></DialogHeader>
        {checking ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI is searching the web for the latest specs...</p>
          </div>
        ) : !result ? (
          <p className="text-center py-8 text-muted-foreground">No results yet.</p>
        ) : result.noChanges ? (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <Check className="h-5 w-5" />
              <span className="font-semibold">Up to date</span>
            </div>
            {result.summary && <p className="text-sm text-muted-foreground">{result.summary}</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {result.summary && (
              <div className="bg-muted/20 border rounded-lg p-3">
                <p className="text-sm">{result.summary}</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{result.changes.length} change{result.changes.length !== 1 ? 's' : ''} found</span>
              {!applied && (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>Select All</Button>
                  <Button size="sm" onClick={handleApply} disabled={applying || selected.size === 0}>
                    {applying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                    Apply {selected.size > 0 ? `(${selected.size})` : ''}
                  </Button>
                </div>
              )}
              {applied && <Badge variant="default" className="bg-emerald-600">Applied</Badge>}
            </div>
            <div className="border rounded-lg divide-y">
              {result.changes.map((change, i) => {
                const isSelected = selected.has(i);
                const choice = valueChoices[i] || 'proposed';
                return (
                  <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm">
                    {!applied && <Checkbox checked={isSelected} onCheckedChange={() => toggleChange(i)} className="mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium capitalize">{change.field.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <ConfidenceBadge confidence={change.confidence} sourceCount={change.sourceCount} />
                      </div>
                      {isSelected && !applied ? (
                        <div className="mt-1.5 space-y-1.5">
                          <label className={`flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer transition-colors ${choice === 'current' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                            onClick={() => setValueChoices(prev => ({ ...prev, [i]: 'current' }))}>
                            <input type="radio" checked={choice === 'current'} onChange={() => setValueChoices(prev => ({ ...prev, [i]: 'current' }))} className="accent-primary" />
                            <span className="text-xs text-muted-foreground">Keep current:</span>
                            <span className="font-medium text-sm">{change.currentValue || 'empty'}</span>
                          </label>
                          <label className={`flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer transition-colors ${choice === 'proposed' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                            onClick={() => setValueChoices(prev => ({ ...prev, [i]: 'proposed' }))}>
                            <input type="radio" checked={choice === 'proposed'} onChange={() => setValueChoices(prev => ({ ...prev, [i]: 'proposed' }))} className="accent-primary" />
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
                      {change.sources?.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">Sources:</span>
                          {change.sources.map((s, j) => (
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
        )}
      </DialogContent>
    </Dialog>
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
