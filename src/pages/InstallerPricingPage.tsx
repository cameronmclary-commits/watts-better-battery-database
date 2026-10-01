import { useState, useEffect, useCallback, useMemo } from 'react';
import { listInstallerPricing, saveInstallerPricing, deleteInstallerPricing, listInstallers, listAllCapacityOptions, ListInstallerPricingOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { Badge } from '@project/components/ui/badge';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, DollarSign, Search } from 'lucide-react';
import { toast } from 'sonner';

type Pricing = ListInstallerPricingOutputType['pricing'][0];

interface GroupedBattery {
  batteryId: string;
  batteryName: string;
  installers: {
    installerId: string;
    installerName: string;
    capacities: {
      capacityOptionId: string;
      capacityLabel: string;
      pricing: Pricing;
    }[];
  }[];
}

export default function InstallerPricingPage() {
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Pricing | null>(null);
  const [batteryFilter, setBatteryFilter] = useState('all');
  const [installerFilter, setInstallerFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedBattery, setExpandedBattery] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await listInstallerPricing({}); setPricing(res.pricing); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const batteries = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pricing) {
      if (p.batteryId && p.batteryName) map.set(p.batteryId, p.batteryName);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [pricing]);

  const installers = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pricing) {
      if (p.installerId && p.installerName) map.set(p.installerId, p.installerName);
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [pricing]);

  const grouped = useMemo(() => {
    let filtered = pricing;
    if (batteryFilter !== 'all') filtered = filtered.filter(p => p.batteryId === batteryFilter);
    if (installerFilter !== 'all') filtered = filtered.filter(p => p.installerId === installerFilter);
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        (p.batteryName || '').toLowerCase().includes(q) ||
        (p.installerName || '').toLowerCase().includes(q) ||
        (p.capacityLabel || '').toLowerCase().includes(q)
      );
    }

    const batteryMap = new Map<string, GroupedBattery>();
    for (const p of filtered) {
      const bid = p.batteryId || 'unknown';
      if (!batteryMap.has(bid)) {
        batteryMap.set(bid, { batteryId: bid, batteryName: p.batteryName || 'Unknown Battery', installers: [] });
      }
      const group = batteryMap.get(bid)!;
      let instGroup = group.installers.find(i => i.installerId === p.installerId);
      if (!instGroup) {
        instGroup = { installerId: p.installerId, installerName: p.installerName || '', capacities: [] };
        group.installers.push(instGroup);
      }
      instGroup.capacities.push({ capacityOptionId: p.capacityOptionId, capacityLabel: p.capacityLabel || '', pricing: p });
    }

    return Array.from(batteryMap.values()).sort((a, b) => a.batteryName.localeCompare(b.batteryName));
  }, [pricing, batteryFilter, installerFilter, search]);

  const handleDelete = async (id: string) => {
    await deleteInstallerPricing({ id });
    toast.success('Pricing deleted'); load();
  };

  const totalPriced = pricing.filter(p => p.price != null).length;
  const totalUnpriced = pricing.filter(p => p.price == null).length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Installer Pricing</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pricing.length} entries · {totalPriced} priced · {totalUnpriced} pending
          </p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Pricing
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        {batteries.length > 0 && (
          <Select value={batteryFilter} onValueChange={setBatteryFilter}>
            <SelectTrigger className="w-52 h-9"><SelectValue placeholder="All Batteries" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batteries</SelectItem>
              {batteries.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {installers.length > 0 && (
          <Select value={installerFilter} onValueChange={setInstallerFilter}>
            <SelectTrigger className="w-52 h-9"><SelectValue placeholder="All Installers" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Installers</SelectItem>
              {installers.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No pricing entries match your filters.</div>
      ) : (
        <div className="space-y-4">
          {grouped.map(battery => {
            const isExpanded = expandedBattery === battery.batteryId || grouped.length === 1;
            return (
              <div key={battery.batteryId} className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setExpandedBattery(isExpanded && grouped.length > 1 ? null : battery.batteryId)}>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{battery.batteryName}</span>
                    <Badge variant="secondary" className="text-xs">
                      {battery.installers.length} installer{battery.installers.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {grouped.length > 1 && (
                    isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {isExpanded && (
                  <div className="divide-y">
                    {battery.installers.map(inst => (
                      <div key={inst.installerId} className="px-4 py-3">
                        <div className="font-medium text-sm mb-2">{inst.installerName}</div>
                        <div className="grid gap-2">
                          {inst.capacities.map(cap => (
                            <div key={cap.capacityOptionId} className="flex items-center justify-between px-3 py-2 bg-card border rounded text-sm">
                              <div className="flex items-center gap-3">
                                <span className="text-muted-foreground min-w-[140px]">{cap.capacityLabel}</span>
                                <span className={`font-semibold ${cap.pricing.price != null ? '' : 'text-muted-foreground italic'}`}>
                                  {cap.pricing.price != null ? `$${cap.pricing.price.toLocaleString()}` : 'No price set'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {cap.pricing.available
                                  ? <Badge variant="default" className="text-[10px]">Available</Badge>
                                  : <Badge variant="secondary" className="text-[10px]">Unavailable</Badge>}
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={() => { setEditItem(cap.pricing); setShowForm(true); }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete this pricing?</AlertDialogTitle>
                                      <AlertDialogDescription>Remove {cap.capacityLabel} pricing for {inst.installerName}.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(cap.pricing.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PricingFormDialog open={showForm} onOpenChange={setShowForm} item={editItem} onSaved={load} />
    </div>
  );
}

function PricingFormDialog({ open, onOpenChange, item, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; item: Pricing | null; onSaved: () => void;
}) {
  const [label, setLabel] = useState('');
  const [installerId, setInstallerId] = useState('');
  const [capacityOptionId, setCapacityOptionId] = useState('');
  const [price, setPrice] = useState('');
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [installerOptions, setInstallerOptions] = useState<{ id: string; name: string }[]>([]);
  const [capacityOptionsList, setCapacityOptionsList] = useState<{ id: string; label: string; batteryName: string }[]>([]);

  useEffect(() => {
    if (open) {
      setLabel(item?.label || '');
      setInstallerId(item?.installerId || '');
      setCapacityOptionId(item?.capacityOptionId || '');
      setPrice(item?.price != null ? String(item.price) : '');
      setAvailable(item?.available ?? true);
      listInstallers({}).then(r => setInstallerOptions(r.installers.map(i => ({ id: i.id, name: i.name || '' }))));
      listAllCapacityOptions({}).then(r => setCapacityOptionsList(r.options.map(o => ({ id: o.id, label: o.label || '', batteryName: o.batteryName || '' }))));
    }
  }, [open, item]);

  const handleSave = async () => {
    if (!installerId || !capacityOptionId) return;
    setSaving(true);
    try {
      await saveInstallerPricing({
        id: item?.id, label: label.trim() || null,
        installerId, capacityOptionId,
        price: price ? Number(price) : null, available,
      });
      toast.success(item ? 'Pricing updated' : 'Pricing created');
      onOpenChange(false); onSaved();
    } finally { setSaving(false); }
  };

  // Group capacity options by battery
  const groupedCaps = useMemo(() => {
    const map = new Map<string, { id: string; label: string }[]>();
    for (const o of capacityOptionsList) {
      const key = o.batteryName || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ id: o.id, label: o.label });
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [capacityOptionsList]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{item ? 'Edit Pricing' : 'Add Installer Pricing'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Label</Label><Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Auto-generated if left empty" /></div>
          <div>
            <Label>Installer *</Label>
            <Select value={installerId} onValueChange={setInstallerId}>
              <SelectTrigger><SelectValue placeholder="Select installer..." /></SelectTrigger>
              <SelectContent>{installerOptions.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Battery &amp; Capacity *</Label>
            <Select value={capacityOptionId} onValueChange={setCapacityOptionId}>
              <SelectTrigger><SelectValue placeholder="Select battery capacity..." /></SelectTrigger>
              <SelectContent>
                {groupedCaps.map(([battery, options]) => (
                  <div key={battery}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{battery}</div>
                    {options.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Installed Price ($)</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="Total installed price" /></div>
          <div className="flex items-center gap-3">
            <Switch checked={available} onCheckedChange={setAvailable} />
            <Label>Available for quoting</Label>
          </div>
          <Button onClick={handleSave} disabled={saving || !installerId || !capacityOptionId} className="w-full">
            {saving ? 'Saving...' : item ? 'Update Pricing' : 'Create Pricing'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
