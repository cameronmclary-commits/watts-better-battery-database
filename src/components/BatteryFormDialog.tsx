import { useState, useEffect } from 'react';
import { useUpload } from 'zitejs/upload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Badge } from '@project/components/ui/badge';
import { Checkbox } from '@project/components/ui/checkbox';
import { saveBattery, aiSearchBattery, savePlanFromBatterySearch, AiSearchBatteryOutputType } from 'zitejs/api';
import { toast } from 'sonner';
import { Upload, Sparkles, Loader2, Check, AlertTriangle, Box, Save, FileText, ExternalLink, X } from 'lucide-react';

interface BatteryData {
  id?: string; name?: string; manufacturer?: string; model?: string;
  moduleSize?: number | null; usableCapacity?: number | null;
  maxChargeRate?: number | null; maxDischargeRate?: number | null;
  roundTripEfficiency?: number | null; cycleWarranty?: number | null;
  depthOfDischarge?: number | null; description?: string | null;
  status?: string | null; notRecommendedReason?: string | null; additionalInfo?: string | null;
  manufacturerOverview?: string | null; images?: { url: string }[];
  expandable?: boolean; expansionTimeframe?: string | null;
  arModel?: { url: string; filename: string } | null;
  specSheetUrl?: string | null;
  batteryType?: string | null; allInOneUnit?: boolean;
  nominalStorage?: number | null; features?: string | null;
  powerRating?: string | null; weight?: string | null;
  dimensions?: string | null; offGridCapable?: boolean;
  ipRating?: string | null; operatingTempRange?: string | null;
  warrantyText?: string | null; compatibleInverterBrands?: string | null;
  totalWarrantedKwh?: string | null; costPerWarrantedKwh?: string | null;
  approxPrice?: string | null; manufacturerLogo?: { url: string }[];
}

interface Props {
  open: boolean; onOpenChange: (o: boolean) => void;
  onSaved: () => void; editBattery?: BatteryData | null;
}

type AiResult = AiSearchBatteryOutputType;

export default function BatteryFormDialog({ open, onOpenChange, onSaved, editBattery }: Props) {
  const { upload, isUploading } = useUpload();
  const [form, setForm] = useState({
    name: '', manufacturer: '', model: '', moduleSize: '', usableCapacity: '',
    maxChargeRate: '', maxDischargeRate: '', roundTripEfficiency: '', cycleWarranty: '',
    depthOfDischarge: '', description: '', status: 'Active', notRecommendedReason: '', additionalInfo: '',
    manufacturerOverview: '', imageUrl: '',
    expandable: false, expansionTimeframe: '', arModelUrl: '',
    specSheetUrl: '',
    batteryType: '', allInOneUnit: false, nominalStorage: '',
    features: '', powerRating: '', weight: '', dimensions: '',
    offGridCapable: false, ipRating: '', operatingTempRange: '',
    warrantyText: '', compatibleInverterBrands: '',
    totalWarrantedKwh: '', costPerWarrantedKwh: '', approxPrice: '',
    manufacturerLogoUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);
  const [aiExtras, setAiExtras] = useState<{ capacityOptions: AiResult['capacityOptions']; compatiblePlans: AiResult['compatiblePlans'] } | null>(null);
  const [savedBatteryId, setSavedBatteryId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      const b = editBattery;
      setForm({
        name: b?.name || '', manufacturer: b?.manufacturer || '', model: b?.model || '',
        moduleSize: b?.moduleSize != null ? String(b.moduleSize) : '',
        usableCapacity: b?.usableCapacity != null ? String(b.usableCapacity) : '',
        maxChargeRate: b?.maxChargeRate != null ? String(b.maxChargeRate) : '',
        maxDischargeRate: b?.maxDischargeRate != null ? String(b.maxDischargeRate) : '',
        roundTripEfficiency: b?.roundTripEfficiency != null ? String(b.roundTripEfficiency * 100) : '',
        cycleWarranty: b?.cycleWarranty != null ? String(b.cycleWarranty) : '',
        depthOfDischarge: b?.depthOfDischarge != null ? String(b.depthOfDischarge * 100) : '',
        description: b?.description || '', status: b?.status || 'Active',
        additionalInfo: b?.additionalInfo || '',
        notRecommendedReason: b?.notRecommendedReason || '',
        manufacturerOverview: b?.manufacturerOverview || '',
        imageUrl: b?.images?.[0]?.url || '',
        expandable: b?.expandable ?? false,
        expansionTimeframe: b?.expansionTimeframe || '',
        arModelUrl: b?.arModel?.url || '',
        specSheetUrl: b?.specSheetUrl || '',
        batteryType: b?.batteryType || '',
        allInOneUnit: b?.allInOneUnit ?? false,
        nominalStorage: b?.nominalStorage != null ? String(b.nominalStorage) : '',
        features: b?.features || '',
        powerRating: b?.powerRating || '',
        weight: b?.weight || '',
        dimensions: b?.dimensions || '',
        offGridCapable: b?.offGridCapable ?? false,
        ipRating: b?.ipRating || '',
        operatingTempRange: b?.operatingTempRange || '',
        warrantyText: b?.warrantyText || '',
        compatibleInverterBrands: b?.compatibleInverterBrands || '',
        totalWarrantedKwh: b?.totalWarrantedKwh || '',
        costPerWarrantedKwh: b?.costPerWarrantedKwh || '',
        approxPrice: b?.approxPrice || '',
        manufacturerLogoUrl: b?.manufacturerLogo?.[0]?.url || '',
      });
      setAiQuery(''); setAiExtras(null); setSavedBatteryId(undefined);
    }
  }, [open, editBattery]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiSearching(true);
    try {
      const r = await aiSearchBattery({ query: aiQuery.trim() });
      setForm(prev => ({
        ...prev,
        name: r.name || prev.name, manufacturer: r.manufacturer || prev.manufacturer,
        model: r.model || prev.model,
        moduleSize: r.moduleSize != null ? String(r.moduleSize) : prev.moduleSize,
        usableCapacity: r.usableCapacity != null ? String(r.usableCapacity) : prev.usableCapacity,
        maxChargeRate: r.maxChargeRate != null ? String(r.maxChargeRate) : prev.maxChargeRate,
        maxDischargeRate: r.maxDischargeRate != null ? String(r.maxDischargeRate) : prev.maxDischargeRate,
        roundTripEfficiency: r.roundTripEfficiency != null ? String(r.roundTripEfficiency * 100) : prev.roundTripEfficiency,
        cycleWarranty: r.cycleWarranty != null ? String(r.cycleWarranty) : prev.cycleWarranty,
        depthOfDischarge: r.depthOfDischarge != null ? String(r.depthOfDischarge * 100) : prev.depthOfDischarge,
        description: r.description || prev.description,
        additionalInfo: r.additionalInfo || prev.additionalInfo,
        manufacturerOverview: r.manufacturerOverview || prev.manufacturerOverview,
        status: r.status || prev.status,
      }));
      setAiExtras({ capacityOptions: r.capacityOptions || [], compatiblePlans: r.compatiblePlans || [] });
      if (r.imageUrl) set('imageUrl', r.imageUrl);
      if (r.specSheetUrl) set('specSheetUrl', r.specSheetUrl);
      toast.success('AI found battery specs — review and adjust before saving');
    } catch (err: any) {
      toast.error(err?.message || 'AI search failed');
    } finally { setAiSearching(false); }
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const { url } = await upload(file); set('imageUrl', url); }
    catch { toast.error('Failed to upload image'); }
  };

  const buildPayload = () => {
    const num = (v: string) => v ? Number(v) : null;
    const pct = (v: string) => v ? Number(v) / 100 : null;
    return {
      id: savedBatteryId || editBattery?.id,
      name: form.name.trim(), manufacturer: form.manufacturer.trim(), model: form.model.trim(),
      moduleSize: num(form.moduleSize), usableCapacity: num(form.usableCapacity),
      maxChargeRate: num(form.maxChargeRate), maxDischargeRate: num(form.maxDischargeRate),
      roundTripEfficiency: pct(form.roundTripEfficiency), cycleWarranty: num(form.cycleWarranty),
      depthOfDischarge: pct(form.depthOfDischarge), description: form.description.trim(),
      status: form.status, notRecommendedReason: form.status === 'Not Recommended' ? form.notRecommendedReason.trim() : null, additionalInfo: form.additionalInfo.trim(),
      manufacturerOverview: form.manufacturerOverview.trim(),
      imageUrl: form.imageUrl || null,
      expandable: form.expandable,
      expansionTimeframe: form.expansionTimeframe.trim() || undefined,
      arModelUrl: form.arModelUrl || null,
      specSheetUrl: form.specSheetUrl.trim() || null,
      batteryType: form.batteryType.trim() || null,
      allInOneUnit: form.allInOneUnit,
      nominalStorage: num(form.nominalStorage),
      features: form.features.trim() || null,
      powerRating: form.powerRating.trim() || null,
      weight: form.weight.trim() || null,
      dimensions: form.dimensions.trim() || null,
      offGridCapable: form.offGridCapable,
      ipRating: form.ipRating.trim() || null,
      operatingTempRange: form.operatingTempRange.trim() || null,
      warrantyText: form.warrantyText.trim() || null,
      compatibleInverterBrands: form.compatibleInverterBrands.trim() || null,
      totalWarrantedKwh: form.totalWarrantedKwh.trim() || null,
      costPerWarrantedKwh: form.costPerWarrantedKwh.trim() || null,
      approxPrice: form.approxPrice.trim() || null,
      manufacturerLogoUrl: form.manufacturerLogoUrl || null,
    };
  };

  const ensureBatterySaved = async (): Promise<string> => {
    const existingId = savedBatteryId || editBattery?.id;
    if (existingId) return existingId;
    if (!form.name.trim()) throw new Error('Enter a battery name first');
    const result = await saveBattery(buildPayload());
    setSavedBatteryId(result.id);
    toast.success('Battery auto-saved');
    return result.id;
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await saveBattery(buildPayload());
      toast.success(editBattery || savedBatteryId ? 'Battery updated' : 'Battery created');
      onOpenChange(false); onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editBattery ? 'Edit Battery' : 'Add Battery'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <AiSearchSection query={aiQuery} setQuery={setAiQuery} searching={aiSearching} onSearch={handleAiSearch} />

          {aiExtras && <AiResultsPreview extras={aiExtras} batteryId={savedBatteryId || editBattery?.id} batteryName={form.name} ensureBatterySaved={ensureBatterySaved} />}

          <div><Label>Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={e => set('model', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Module Size (kWh)</Label><Input type="number" step="0.01" value={form.moduleSize} onChange={e => set('moduleSize', e.target.value)} /></div>
            <div><Label>Usable Capacity (kWh)</Label><Input type="number" step="0.01" value={form.usableCapacity} onChange={e => set('usableCapacity', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Max Charge Rate (kW)</Label><Input type="number" step="0.01" value={form.maxChargeRate} onChange={e => set('maxChargeRate', e.target.value)} /></div>
            <div><Label>Max Discharge Rate (kW)</Label><Input type="number" step="0.01" value={form.maxDischargeRate} onChange={e => set('maxDischargeRate', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Efficiency (%)</Label><Input type="number" step="0.1" value={form.roundTripEfficiency} onChange={e => set('roundTripEfficiency', e.target.value)} /></div>
            <div><Label>Min Throughput Energy (MWh)</Label><Input type="number" step="0.1" value={form.cycleWarranty} onChange={e => set('cycleWarranty', e.target.value)} /></div>
            <div><Label>DoD (%)</Label><Input type="number" step="0.1" value={form.depthOfDischarge} onChange={e => set('depthOfDischarge', e.target.value)} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Active', 'Available', 'Not Available', 'Not Recommended', 'Discontinued', 'Coming Soon'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.status === 'Not Recommended' && (
            <div>
              <Label>Not Recommended — Reason</Label>
              <Textarea value={form.notRecommendedReason} onChange={e => set('notRecommendedReason', e.target.value)} rows={3} placeholder="Explain why this battery is not recommended…" className="border-orange-300 focus-visible:ring-orange-400" />
            </div>
          )}
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} /></div>

          <div className="border-t pt-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spreadsheet / Spec Fields</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Battery Type</Label><Input value={form.batteryType} onChange={e => set('batteryType', e.target.value)} placeholder="e.g. Lithium Iron Phosphate" /></div>
            <div><Label>Approx Price</Label><Input value={form.approxPrice} onChange={e => set('approxPrice', e.target.value)} placeholder="e.g. $10,000" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nominal Storage (kWh)</Label><Input type="number" step="0.01" value={form.nominalStorage} onChange={e => set('nominalStorage', e.target.value)} /></div>
            <div><Label>Power Rating</Label><Input value={form.powerRating} onChange={e => set('powerRating', e.target.value)} placeholder="e.g. 5 kW" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Weight</Label><Input value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="e.g. 130 kg" /></div>
            <div><Label>Dimensions (WHD)</Label><Input value={form.dimensions} onChange={e => set('dimensions', e.target.value)} placeholder="e.g. 609 x 1105 x 193 mm" /></div>
          </div>
          <div><Label>Features</Label><Input value={form.features} onChange={e => set('features', e.target.value)} placeholder="e.g. Modular, expandable" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>IP Rating</Label><Input value={form.ipRating} onChange={e => set('ipRating', e.target.value)} placeholder="e.g. Indoor/Outdoor (IP 65)" /></div>
            <div><Label>Operating Temp Range</Label><Input value={form.operatingTempRange} onChange={e => set('operatingTempRange', e.target.value)} placeholder="e.g. -20°C to 50°C" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Warranty</Label><Input value={form.warrantyText} onChange={e => set('warrantyText', e.target.value)} placeholder="e.g. 10 years" /></div>
            <div><Label>Compatible Inverter Brands</Label><Input value={form.compatibleInverterBrands} onChange={e => set('compatibleInverterBrands', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Total Warranted kWh</Label><Input value={form.totalWarrantedKwh} onChange={e => set('totalWarrantedKwh', e.target.value)} /></div>
            <div><Label>Cost per Warranted kWh</Label><Input value={form.costPerWarrantedKwh} onChange={e => set('costPerWarrantedKwh', e.target.value)} placeholder="e.g. $0.21" /></div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.allInOneUnit} onCheckedChange={v => setForm(prev => ({ ...prev, allInOneUnit: !!v }))} id="allInOne" />
              <Label htmlFor="allInOne" className="cursor-pointer">All-In-One Unit</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.offGridCapable} onCheckedChange={v => setForm(prev => ({ ...prev, offGridCapable: !!v }))} id="offGrid" />
              <Label htmlFor="offGrid" className="cursor-pointer">Off-Grid Capable</Label>
            </div>
          </div>

          <div><Label>Additional Info</Label><Textarea value={form.additionalInfo} onChange={e => set('additionalInfo', e.target.value)} rows={3} placeholder="Certifications, inverter compatibility, temperature range, dimensions..." /></div>
          <div><Label>Manufacturer Overview</Label><Textarea value={form.manufacturerOverview} onChange={e => set('manufacturerOverview', e.target.value)} rows={4} placeholder="Manufacturer reputation, known issues, market positioning, support quality..." /></div>

          <div className="border-t pt-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expandability</Label>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox checked={form.expandable} onCheckedChange={v => setForm(prev => ({ ...prev, expandable: !!v }))} id="expandable" />
            <Label htmlFor="expandable" className="cursor-pointer">Capacity expandable after install</Label>
          </div>
          {form.expandable && (
            <div><Label>Expansion Timeframe</Label><Input value={form.expansionTimeframe} onChange={e => set('expansionTimeframe', e.target.value)} placeholder="e.g. Within 12 months of install" /></div>
          )}

          <div>
            <Label>Product Image</Label>
            {form.imageUrl && (
              <div className="flex items-start gap-2 mb-2">
                <img src={form.imageUrl} alt="Preview" className="h-24 rounded-md object-contain" />
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => set('imageUrl', '')}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
              <Upload className="h-4 w-4" /> {isUploading ? 'Uploading...' : form.imageUrl ? 'Replace image' : 'Upload image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={isUploading} />
            </label>
          </div>
          <div>
            <Label>Manufacturer Logo</Label>
            {form.manufacturerLogoUrl && (
              <div className="flex items-start gap-2 mb-2">
                <img src={form.manufacturerLogoUrl} alt="Logo" className="h-12 rounded-md object-contain" />
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0" onClick={() => set('manufacturerLogoUrl', '')}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
              <Upload className="h-4 w-4" /> {isUploading ? 'Uploading...' : form.manufacturerLogoUrl ? 'Replace logo' : 'Upload logo'}
              <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try { const { url } = await upload(file); set('manufacturerLogoUrl', url); }
                catch { toast.error('Failed to upload logo'); }
              }} disabled={isUploading} />
            </label>
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> Spec Sheet</Label>
            {form.specSheetUrl && (
              <div className="flex items-center gap-2 mb-1">
                <a href={form.specSheetUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate flex items-center gap-1">
                  <ExternalLink className="h-3 w-3 shrink-0" /> {form.specSheetUrl}
                </a>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0" onClick={() => set('specSheetUrl', '')}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <Input value={form.specSheetUrl} onChange={e => set('specSheetUrl', e.target.value)} placeholder="URL to spec sheet / datasheet PDF" className="text-xs" />
            <p className="text-xs text-muted-foreground mt-0.5">AI search will auto-populate this if a spec sheet is found</p>
          </div>
          <div>
            <Label className="flex items-center gap-1.5"><Box className="h-4 w-4" /> 3D AR Model</Label>
            {form.arModelUrl && <p className="text-xs text-muted-foreground mb-1 truncate">File uploaded ✓</p>}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
              <Upload className="h-4 w-4" /> {isUploading ? 'Uploading...' : 'Upload 3D model (.usdz, .glb, .gltf)'}
              <input type="file" accept=".usdz,.glb,.gltf,.obj,.fbx" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try { const { url } = await upload(file); set('arModelUrl', url); }
                catch { toast.error('Failed to upload 3D model'); }
              }} disabled={isUploading} />
            </label>
          </div>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full">
            {saving ? 'Saving...' : editBattery ? 'Update Battery' : 'Create Battery'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AiSearchSection({ query, setQuery, searching, onSearch }: { query: string; setQuery: (q: string) => void; searching: boolean; onSearch: () => void }) {
  return (
    <div className="border border-dashed rounded-lg p-3 bg-muted/30 space-y-2">
      <Label className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" /> AI Web Search
      </Label>
      <div className="flex gap-2">
        <Input
          placeholder='e.g. "Tesla Powerwall 3" or "BYD Battery-Box Premium"'
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
        />
        <Button onClick={onSearch} disabled={searching || !query.trim()} size="sm" className="shrink-0">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Searches the web and auto-fills specs, capacity options, manufacturer overview, and compatible plans</p>
    </div>
  );
}

function AiResultsPreview({ extras, batteryId, batteryName, ensureBatterySaved }: { extras: { capacityOptions: AiResult['capacityOptions']; compatiblePlans: AiResult['compatiblePlans'] }; batteryId?: string; batteryName: string; ensureBatterySaved: () => Promise<string> }) {
  const [savingPlan, setSavingPlan] = useState<number | null>(null);
  const [savedPlans, setSavedPlans] = useState<Set<number>>(new Set());

  const handleSavePlan = async (plan: AiResult['compatiblePlans'][0], index: number) => {
    setSavingPlan(index);
    try {
      const id = await ensureBatterySaved();
      const result = await savePlanFromBatterySearch({
        planName: plan.planName,
        provider: plan.provider,
        batteryId: id,
        batteryName,
        compatibility: plan.compatibility,
        restrictions: plan.restrictions,
      });
      setSavedPlans(prev => new Set(prev).add(index));
      toast.success(`Saved "${result.planName}" as an energy plan with compatibility record`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save plan');
    } finally { setSavingPlan(null); }
  };

  if (extras.capacityOptions.length === 0 && extras.compatiblePlans.length === 0) return null;
  return (
    <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
      {extras.capacityOptions.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Capacity Options Found</Label>
          <div className="mt-1.5 space-y-1.5">
            {extras.capacityOptions.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-card rounded px-3 py-1.5 border">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium">{c.label}</span>
                  {c.capacityKwh != null && <span className="text-muted-foreground">({c.capacityKwh} kWh)</span>}
                  {c.numberOfModules != null && <span className="text-muted-foreground">· {c.numberOfModules} modules</span>}
                </div>
                {(c.priceMin != null || c.priceMax != null) && (
                  <span className="text-xs text-muted-foreground">${(c.priceMin ?? 0).toLocaleString()} – ${(c.priceMax ?? 0).toLocaleString()}</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Add these as capacity options from the battery detail page after saving</p>
        </div>
      )}
      {extras.compatiblePlans.length > 0 && (
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Compatible Plans / VPPs</Label>
          <div className="mt-1.5 space-y-1.5">
            {extras.compatiblePlans.map((p, i) => (
              <div key={i} className="text-sm bg-card rounded px-3 py-2 border space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.planName}</span>
                    <Badge variant="outline" className="text-xs">{p.provider}</Badge>
                    <Badge variant={p.compatibility.toLowerCase().includes('full') ? 'default' : 'secondary'} className="text-xs">{p.compatibility}</Badge>
                  </div>
                  {savedPlans.has(i) ? (
                    <Badge variant="default" className="bg-emerald-600 text-xs">
                      <Check className="h-3 w-3 mr-1" /> Saved
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" className="h-7 text-xs"
                      disabled={savingPlan !== null}
                      onClick={() => handleSavePlan(p, i)}>
                      {savingPlan === i ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Save as Plan
                    </Button>
                  )}
                </div>
                {p.restrictions && p.restrictions !== 'None known' && (
                  <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{p.restrictions}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
