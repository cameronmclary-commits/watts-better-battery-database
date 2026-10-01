import { useState, useEffect } from 'react';
import { useUpload } from 'zitejs/upload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { saveSolarPanel, aiSearchSolarPanel } from 'zitejs/api';
import { toast } from 'sonner';
import { Upload, Sparkles, Loader2 } from 'lucide-react';

interface PanelData {
  id?: string; name?: string; manufacturer?: string; model?: string;
  wattage?: number | null; efficiency?: number | null; cellType?: string | null;
  voltageMpp?: number | null; currentMpp?: number | null;
  openCircuitVoltage?: number | null; shortCircuitCurrent?: number | null;
  weightKg?: number | null; dimensions?: string | null;
  warrantyYears?: number | null; performanceWarrantyPct?: number | null;
  description?: string | null; status?: string | null;
  additionalInfo?: string | null; manufacturerOverview?: string | null;
  images?: { url: string }[];
}

interface Props {
  open: boolean; onOpenChange: (o: boolean) => void;
  onSaved: () => void; editPanel?: PanelData | null;
}

export default function SolarPanelFormDialog({ open, onOpenChange, onSaved, editPanel }: Props) {
  const { upload, isUploading } = useUpload();
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiSearching, setAiSearching] = useState(false);

  useEffect(() => {
    if (open) {
      const p = editPanel;
      setForm({
        name: p?.name || '', manufacturer: p?.manufacturer || '', model: p?.model || '',
        wattage: p?.wattage != null ? String(p.wattage) : '',
        efficiency: p?.efficiency != null ? String(p.efficiency) : '',
        cellType: p?.cellType || '',
        voltageMpp: p?.voltageMpp != null ? String(p.voltageMpp) : '',
        currentMpp: p?.currentMpp != null ? String(p.currentMpp) : '',
        openCircuitVoltage: p?.openCircuitVoltage != null ? String(p.openCircuitVoltage) : '',
        shortCircuitCurrent: p?.shortCircuitCurrent != null ? String(p.shortCircuitCurrent) : '',
        weightKg: p?.weightKg != null ? String(p.weightKg) : '',
        dimensions: p?.dimensions || '',
        warrantyYears: p?.warrantyYears != null ? String(p.warrantyYears) : '',
        performanceWarrantyPct: p?.performanceWarrantyPct != null ? String(p.performanceWarrantyPct) : '',
        description: p?.description || '', status: p?.status || 'Active',
        additionalInfo: p?.additionalInfo || '', manufacturerOverview: p?.manufacturerOverview || '',
        imageUrl: p?.images?.[0]?.url || '',
      });
      setAiQuery('');
    }
  }, [open, editPanel]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setAiSearching(true);
    try {
      const r = await aiSearchSolarPanel({ query: aiQuery.trim() });
      setForm(prev => ({
        ...prev,
        name: r.name || prev.name, manufacturer: r.manufacturer || prev.manufacturer,
        model: r.model || prev.model,
        wattage: r.wattage != null ? String(r.wattage) : prev.wattage,
        efficiency: r.efficiency != null ? String(r.efficiency) : prev.efficiency,
        cellType: r.cellType || prev.cellType,
        voltageMpp: r.voltageMpp != null ? String(r.voltageMpp) : prev.voltageMpp,
        currentMpp: r.currentMpp != null ? String(r.currentMpp) : prev.currentMpp,
        openCircuitVoltage: r.openCircuitVoltage != null ? String(r.openCircuitVoltage) : prev.openCircuitVoltage,
        shortCircuitCurrent: r.shortCircuitCurrent != null ? String(r.shortCircuitCurrent) : prev.shortCircuitCurrent,
        weightKg: r.weightKg != null ? String(r.weightKg) : prev.weightKg,
        dimensions: r.dimensions || prev.dimensions,
        warrantyYears: r.warrantyYears != null ? String(r.warrantyYears) : prev.warrantyYears,
        performanceWarrantyPct: r.performanceWarrantyPct != null ? String(r.performanceWarrantyPct) : prev.performanceWarrantyPct,
        description: r.description || prev.description,
        additionalInfo: r.additionalInfo || prev.additionalInfo,
        manufacturerOverview: r.manufacturerOverview || prev.manufacturerOverview,
        status: r.status || prev.status,
      }));
      toast.success('AI found panel specs — review and adjust before saving');
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

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const num = (v: string) => v ? Number(v) : null;
      await saveSolarPanel({
        id: editPanel?.id, name: form.name.trim(), manufacturer: form.manufacturer.trim(),
        model: form.model.trim(), wattage: num(form.wattage), efficiency: num(form.efficiency),
        cellType: form.cellType.trim() || undefined,
        voltageMpp: num(form.voltageMpp), currentMpp: num(form.currentMpp),
        openCircuitVoltage: num(form.openCircuitVoltage), shortCircuitCurrent: num(form.shortCircuitCurrent),
        weightKg: num(form.weightKg), dimensions: form.dimensions.trim() || undefined,
        warrantyYears: num(form.warrantyYears), performanceWarrantyPct: num(form.performanceWarrantyPct),
        description: form.description.trim(), status: form.status,
        additionalInfo: form.additionalInfo.trim(), manufacturerOverview: form.manufacturerOverview.trim(),
        imageUrl: form.imageUrl || null,
      });
      toast.success(editPanel ? 'Solar panel updated' : 'Solar panel created');
      onOpenChange(false); onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editPanel ? 'Edit Solar Panel' : 'Add Solar Panel'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <AiSearchBox query={aiQuery} setQuery={setAiQuery} searching={aiSearching} onSearch={handleAiSearch} />

          <div><Label>Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={e => set('model', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Wattage (W)</Label><Input type="number" value={form.wattage} onChange={e => set('wattage', e.target.value)} /></div>
            <div><Label>Efficiency (%)</Label><Input type="number" step="0.1" value={form.efficiency} onChange={e => set('efficiency', e.target.value)} /></div>
            <div><Label>Cell Type</Label><Input value={form.cellType} onChange={e => set('cellType', e.target.value)} placeholder="e.g. N-type TOPCon" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Voltage Mpp (V)</Label><Input type="number" step="0.01" value={form.voltageMpp} onChange={e => set('voltageMpp', e.target.value)} /></div>
            <div><Label>Current Mpp (A)</Label><Input type="number" step="0.01" value={form.currentMpp} onChange={e => set('currentMpp', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Open Circuit Voltage (V)</Label><Input type="number" step="0.01" value={form.openCircuitVoltage} onChange={e => set('openCircuitVoltage', e.target.value)} /></div>
            <div><Label>Short Circuit Current (A)</Label><Input type="number" step="0.01" value={form.shortCircuitCurrent} onChange={e => set('shortCircuitCurrent', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Weight (kg)</Label><Input type="number" step="0.1" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} /></div>
            <div><Label>Warranty (years)</Label><Input type="number" value={form.warrantyYears} onChange={e => set('warrantyYears', e.target.value)} /></div>
            <div><Label>Performance Warranty (%)</Label><Input type="number" step="0.1" value={form.performanceWarrantyPct} onChange={e => set('performanceWarrantyPct', e.target.value)} /></div>
          </div>
          <div><Label>Dimensions</Label><Input value={form.dimensions} onChange={e => set('dimensions', e.target.value)} placeholder="e.g. 1722 x 1134 x 30 mm" /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Active', 'Discontinued', 'Coming Soon'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} /></div>
          <div><Label>Additional Info</Label><Textarea value={form.additionalInfo} onChange={e => set('additionalInfo', e.target.value)} rows={3} placeholder="Certifications, temperature coefficients, fire rating, compatible inverters..." /></div>
          <div><Label>Manufacturer Overview</Label><Textarea value={form.manufacturerOverview} onChange={e => set('manufacturerOverview', e.target.value)} rows={4} placeholder="Manufacturer reputation, known issues, market positioning, support quality..." /></div>
          <div>
            <Label>Image</Label>
            {form.imageUrl && <img src={form.imageUrl} alt="Preview" className="h-24 rounded-md mb-2 object-contain" />}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
              <Upload className="h-4 w-4" /> {isUploading ? 'Uploading...' : 'Upload image'}
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} disabled={isUploading} />
            </label>
          </div>
          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full">
            {saving ? 'Saving...' : editPanel ? 'Update Solar Panel' : 'Create Solar Panel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AiSearchBox({ query, setQuery, searching, onSearch }: { query: string; setQuery: (q: string) => void; searching: boolean; onSearch: () => void }) {
  return (
    <div className="border border-dashed rounded-lg p-3 bg-muted/30 space-y-2">
      <Label className="flex items-center gap-1.5 text-sm font-semibold">
        <Sparkles className="h-4 w-4 text-primary" /> AI Web Search
      </Label>
      <div className="flex gap-2">
        <Input
          placeholder='e.g. "LONGi Hi-MO 7" or "JinkoSolar Tiger Neo 440W"'
          value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearch()}
        />
        <Button onClick={onSearch} disabled={searching || !query.trim()} size="sm" className="shrink-0">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Searches the web and auto-fills specs, description, and manufacturer overview</p>
    </div>
  );
}

function emptyForm() {
  return {
    name: '', manufacturer: '', model: '', wattage: '', efficiency: '', cellType: '',
    voltageMpp: '', currentMpp: '', openCircuitVoltage: '', shortCircuitCurrent: '',
    weightKg: '', dimensions: '', warrantyYears: '', performanceWarrantyPct: '',
    description: '', status: 'Active', additionalInfo: '', manufacturerOverview: '', imageUrl: '',
  };
}
