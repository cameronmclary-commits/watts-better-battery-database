import { useState, useEffect, useCallback } from 'react';
import { listInstallers, listBatteries, listSolarPanels, saveInstaller, deleteInstaller, ListInstallersOutputType, ListBatteriesOutputType, ListSolarPanelsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, MapPin, Battery, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { Checkbox } from '@project/components/ui/checkbox';
import InstallerBatteryPricingTable from '../components/InstallerBatteryPricingTable';
import InstallerReviewsSection from '../components/InstallerReviewsSection';
import InstallPhotosSection from '../components/InstallPhotosSection';
import InstallerAccreditationsSection from '../components/InstallerAccreditationsSection';

const ALL_SERVICE_AREAS = [
  'Brisbane', 'Gold Coast', 'Sunshine Coast', 'Toowoomba', 'Cairns', 'Townsville',
  'Sydney', 'Melbourne', 'Adelaide', 'Perth', 'Hobart', 'Canberra',
  'Regional QLD', 'Regional NSW', 'Regional VIC', 'Regional SA', 'Regional WA',
];

type Installer = ListInstallersOutputType['installers'][0];
type BatteryOption = ListBatteriesOutputType['batteries'][0];
type PanelOption = ListSolarPanelsOutputType['panels'][0];

// Cache for batteries and panels lists
let cachedBatteries: BatteryOption[] | null = null;
let cachedPanels: PanelOption[] | null = null;

async function loadBatteryOptions(): Promise<BatteryOption[]> {
  if (cachedBatteries) return cachedBatteries;
  const res = await listBatteries({});
  cachedBatteries = res.batteries;
  return cachedBatteries;
}

async function loadPanelOptions(): Promise<PanelOption[]> {
  if (cachedPanels) return cachedPanels;
  const res = await listSolarPanels({});
  cachedPanels = res.panels;
  return cachedPanels;
}

export default function InstallersPage() {
  const [installers, setInstallers] = useState<Installer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Installer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [batteries, setBatteries] = useState<BatteryOption[]>([]);
  const [panels, setPanels] = useState<PanelOption[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [instRes, bats, pans] = await Promise.all([
        listInstallers({}), loadBatteryOptions(), loadPanelOptions(),
      ]);
      setInstallers(instRes.installers);
      setBatteries(bats);
      setPanels(pans);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteInstaller({ id });
    toast.success('Installer deleted');
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Installers</h2>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Installer
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : installers.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No installers yet.</div>
      ) : (
        <div className="space-y-3">
          {installers.map(inst => (
            <InstallerCard
              key={inst.id} inst={inst}
              batteries={batteries} panels={panels}
              expanded={expandedId === inst.id}
              onToggle={() => setExpandedId(expandedId === inst.id ? null : inst.id)}
              onEdit={() => { setEditItem(inst); setShowForm(true); }}
              onDelete={() => handleDelete(inst.id)}
            />
          ))}
        </div>
      )}

      <InstallerFormDialog
        open={showForm} onOpenChange={setShowForm}
        installer={editItem} onSaved={load}
        batteries={batteries} panels={panels}
      />
    </div>
  );
}

function InstallerCard({ inst, batteries, panels, expanded, onToggle, onEdit, onDelete }: {
  inst: Installer; batteries: BatteryOption[]; panels: PanelOption[];
  expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const batteryNames = batteries.filter(b => inst.batteriesProvided.includes(b.id)).map(b => b.name);
  const panelNames = panels.filter(p => inst.solarPanelsProvided.includes(p.id)).map(p => p.name);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{inst.name}</span>
          {inst.status && (
            <Badge variant="secondary" className={inst.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
              {inst.status}
            </Badge>
          )}
          {inst.region && <span className="text-sm text-muted-foreground">{inst.region}</span>}
          {inst.serviceAreas && inst.serviceAreas.length > 0 && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {inst.serviceAreas.slice(0, 3).map(a => (
                <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
              ))}
              {inst.serviceAreas.length > 3 && (
                <Badge variant="outline" className="text-[10px]">+{inst.serviceAreas.length - 3}</Badge>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
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
                <AlertDialogTitle>Delete this installer?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove {inst.name}.</AlertDialogDescription>
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
        <div className="border-t">
          <div className="px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm bg-muted/10">
            <Detail label="Contact Person" value={inst.contactPerson} />
            <Detail label="Email" value={inst.contactEmail} />
            <Detail label="Mobile" value={inst.mobilePhone} />
            <Detail label="Office" value={inst.officePhone} />
            <Detail label="Address" value={inst.address} className="col-span-2" />
            <Detail label="ABN" value={inst.abn} />
            <Detail label="QLD Electrical Licence" value={inst.qldElectricalLicence} />
            <Detail label="Licence Holder" value={inst.electricalLicenceHolder} />
          </div>

          {/* Battery Brands */}
          <div className="px-4 py-3 border-t bg-muted/5">
            <div className="flex items-center gap-2 mb-1.5">
              <Battery className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Battery Brands</span>
            </div>
            {batteryNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {batteryNames.map(n => <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>)}
              </div>
            ) : <span className="text-sm text-muted-foreground">None selected</span>}
          </div>

          {/* PV Panels */}
          <div className="px-4 py-3 border-t bg-muted/5">
            <div className="flex items-center gap-2 mb-1.5">
              <Sun className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Solar Panels</span>
            </div>
            {panelNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {panelNames.map(n => <Badge key={n} variant="secondary" className="text-xs">{n}</Badge>)}
              </div>
            ) : <span className="text-sm text-muted-foreground">None selected</span>}
          </div>

          <div className="border-t px-4 py-4">
            <InstallerAccreditationsSection installerId={inst.id} />
          </div>
          <div className="border-t px-4 py-4">
            <InstallerReviewsSection installerId={inst.id} />
          </div>
          <div className="border-t px-4 py-4">
            <InstallPhotosSection installerId={inst.id} />
          </div>
          <div className="border-t px-4 py-4">
            <InstallerBatteryPricingTable installerId={inst.id} installerName={inst.name} />
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, className = '' }: { label: string; value: string | null; className?: string }) {
  return (
    <div className={className}>
      <span className="text-muted-foreground">{label}:</span>{' '}
      <span className="font-medium">{value || '—'}</span>
    </div>
  );
}

function InstallerFormDialog({ open, onOpenChange, installer, onSaved, batteries, panels }: {
  open: boolean; onOpenChange: (o: boolean) => void; installer: Installer | null; onSaved: () => void;
  batteries: BatteryOption[]; panels: PanelOption[];
}) {
  const [form, setForm] = useState({
    name: '', contactEmail: '', contactPerson: '', mobilePhone: '', officePhone: '',
    address: '', region: '', status: 'Active', qldElectricalLicence: '',
    electricalLicenceHolder: '', abn: '',
  });
  const [serviceAreas, setServiceAreas] = useState<string[]>([]);
  const [selectedBatteries, setSelectedBatteries] = useState<string[]>([]);
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [batterySearch, setBatterySearch] = useState('');
  const [panelSearch, setPanelSearch] = useState('');

  useEffect(() => {
    if (open) {
      const i = installer;
      setForm({
        name: i?.name || '', contactEmail: i?.contactEmail || '',
        contactPerson: i?.contactPerson || '', mobilePhone: i?.mobilePhone || '',
        officePhone: i?.officePhone || '', address: i?.address || '',
        region: i?.region || '', status: i?.status || 'Active',
        qldElectricalLicence: i?.qldElectricalLicence || '',
        electricalLicenceHolder: i?.electricalLicenceHolder || '',
        abn: i?.abn || '',
      });
      setServiceAreas(i?.serviceAreas || []);
      setSelectedBatteries(i?.batteriesProvided || []);
      setSelectedPanels(i?.solarPanelsProvided || []);
      setBatterySearch('');
      setPanelSearch('');
    }
  }, [open, installer]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await saveInstaller({
        id: installer?.id, name: form.name.trim(),
        contactEmail: form.contactEmail.trim() || null,
        contactPerson: form.contactPerson.trim() || null,
        mobilePhone: form.mobilePhone.trim() || null,
        officePhone: form.officePhone.trim() || null,
        address: form.address.trim() || null,
        region: form.region.trim() || null, status: form.status,
        qldElectricalLicence: form.qldElectricalLicence.trim() || null,
        electricalLicenceHolder: form.electricalLicenceHolder.trim() || null,
        abn: form.abn.trim() || null,
        serviceAreas,
        batteriesProvided: selectedBatteries,
        solarPanelsProvided: selectedPanels,
      });
      toast.success(installer ? 'Installer updated' : 'Installer created');
      onOpenChange(false); onSaved();
    } finally { setSaving(false); }
  };

  // Group batteries by manufacturer
  const batterysByMfr = batteries.reduce<Record<string, BatteryOption[]>>((acc, b) => {
    const mfr = b.manufacturer || 'Other';
    if (!acc[mfr]) acc[mfr] = [];
    acc[mfr].push(b);
    return acc;
  }, {});
  const sortedMfrs = Object.keys(batterysByMfr).sort();

  // Group panels by manufacturer
  const panelsByMfr = panels.reduce<Record<string, PanelOption[]>>((acc, p) => {
    const mfr = p.manufacturer || 'Other';
    if (!acc[mfr]) acc[mfr] = [];
    acc[mfr].push(p);
    return acc;
  }, {});
  const sortedPanelMfrs = Object.keys(panelsByMfr).sort();

  const filteredBatteryMfrs = sortedMfrs.filter(mfr => {
    if (!batterySearch) return true;
    const s = batterySearch.toLowerCase();
    return mfr.toLowerCase().includes(s) || batterysByMfr[mfr].some(b => b.name.toLowerCase().includes(s));
  });

  const filteredPanelMfrs = sortedPanelMfrs.filter(mfr => {
    if (!panelSearch) return true;
    const s = panelSearch.toLowerCase();
    return mfr.toLowerCase().includes(s) || panelsByMfr[mfr].some(p => p.name.toLowerCase().includes(s));
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{installer ? 'Edit Installer' : 'Add Installer'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Business Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div><Label>ABN</Label><Input value={form.abn} onChange={e => set('abn', e.target.value)} placeholder="XX XXX XXX XXX" /></div>
          <div><Label>Address</Label><Textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} /></div>

          <div className="border-t pt-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service Areas</Label>
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto border rounded-lg p-2">
            {ALL_SERVICE_AREAS.map(area => (
              <label key={area} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                <Checkbox
                  checked={serviceAreas.includes(area)}
                  onCheckedChange={() => setServiceAreas(prev =>
                    prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
                  )}
                />
                {area}
              </label>
            ))}
          </div>

          <div className="border-t pt-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</Label>
          </div>
          <div><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => set('contactPerson', e.target.value)} /></div>
          <div><Label>Contact Email</Label><Input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Mobile Phone</Label><Input value={form.mobilePhone} onChange={e => set('mobilePhone', e.target.value)} placeholder="04XX XXX XXX" /></div>
            <div><Label>Office Phone</Label><Input value={form.officePhone} onChange={e => set('officePhone', e.target.value)} placeholder="07 XXXX XXXX" /></div>
          </div>

          <div className="border-t pt-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Licensing</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>QLD Electrical Licence</Label><Input value={form.qldElectricalLicence} onChange={e => set('qldElectricalLicence', e.target.value)} /></div>
            <div><Label>Licence Holder (Individual)</Label><Input value={form.electricalLicenceHolder} onChange={e => set('electricalLicenceHolder', e.target.value)} /></div>
          </div>

          {/* Battery Brands Checkboxes */}
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Battery className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Battery Brands</Label>
              <Badge variant="secondary" className="text-xs ml-auto">{selectedBatteries.length} selected</Badge>
            </div>
            <Input
              placeholder="Search batteries..."
              value={batterySearch}
              onChange={e => setBatterySearch(e.target.value)}
              className="mb-2 h-8 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto border rounded-lg p-2 space-y-2">
            {filteredBatteryMfrs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No batteries found</p>
            ) : filteredBatteryMfrs.map(mfr => {
              const items = batterysByMfr[mfr];
              const allSelected = items.every(b => selectedBatteries.includes(b.id));
              const someSelected = items.some(b => selectedBatteries.includes(b.id));
              return (
                <div key={mfr}>
                  <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm font-semibold">
                    <Checkbox
                      checked={allSelected}
                      className={someSelected && !allSelected ? 'opacity-50' : ''}
                      onCheckedChange={() => {
                        if (allSelected) {
                          setSelectedBatteries(prev => prev.filter(id => !items.some(b => b.id === id)));
                        } else {
                          setSelectedBatteries(prev => [...new Set([...prev, ...items.map(b => b.id)])]);
                        }
                      }}
                    />
                    {mfr}
                  </label>
                  <div className="ml-6 space-y-0.5">
                    {items.map(b => (
                      <label key={b.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                        <Checkbox
                          checked={selectedBatteries.includes(b.id)}
                          onCheckedChange={() => setSelectedBatteries(prev =>
                            prev.includes(b.id) ? prev.filter(x => x !== b.id) : [...prev, b.id]
                          )}
                        />
                        <span>{b.name}</span>
                        {b.usableCapacity && <span className="text-xs text-muted-foreground ml-auto">{b.usableCapacity} kWh</span>}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Solar Panel Checkboxes */}
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 mb-2">
              <Sun className="h-4 w-4 text-amber-500" />
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Solar Panels</Label>
              <Badge variant="secondary" className="text-xs ml-auto">{selectedPanels.length} selected</Badge>
            </div>
            <Input
              placeholder="Search panels..."
              value={panelSearch}
              onChange={e => setPanelSearch(e.target.value)}
              className="mb-2 h-8 text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto border rounded-lg p-2 space-y-2">
            {filteredPanelMfrs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No panels found</p>
            ) : filteredPanelMfrs.map(mfr => {
              const items = panelsByMfr[mfr];
              const allSelected = items.every(p => selectedPanels.includes(p.id));
              const someSelected = items.some(p => selectedPanels.includes(p.id));
              return (
                <div key={mfr}>
                  <label className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm font-semibold">
                    <Checkbox
                      checked={allSelected}
                      className={someSelected && !allSelected ? 'opacity-50' : ''}
                      onCheckedChange={() => {
                        if (allSelected) {
                          setSelectedPanels(prev => prev.filter(id => !items.some(p => p.id === id)));
                        } else {
                          setSelectedPanels(prev => [...new Set([...prev, ...items.map(p => p.id)])]);
                        }
                      }}
                    />
                    {mfr}
                  </label>
                  <div className="ml-6 space-y-0.5">
                    {items.map(p => (
                      <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm">
                        <Checkbox
                          checked={selectedPanels.includes(p.id)}
                          onCheckedChange={() => setSelectedPanels(prev =>
                            prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                          )}
                        />
                        <span>{p.name}</span>
                        {p.wattage && <span className="text-xs text-muted-foreground ml-auto">{p.wattage}W</span>}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} disabled={saving || !form.name.trim()} className="w-full">
            {saving ? 'Saving...' : installer ? 'Update' : 'Create Installer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
