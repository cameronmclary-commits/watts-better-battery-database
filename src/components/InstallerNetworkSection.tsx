import { useState, useEffect, useCallback } from 'react';
import {
  getBatteryInstallers, listInstallers, listCapacityOptions, saveInstallerPricing, deleteInstallerPricing,
} from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { Users, Mail, Phone, MapPin, Plus, Pencil, Trash2, DollarSign, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface CapacityOption { id: string; label: string; capacityKwh: number | null; }
interface PricingEntry { id: string; installerId: string; capacityOptionId: string; price: number | null; available: boolean; label: string | null; }
interface InstallerInfo { id: string; name: string; region: string | null; contactPerson: string | null; contactEmail: string | null; phone: string | null; status: string | null; }

interface Props { batteryId: string; }

export default function InstallerNetworkSection({ batteryId }: Props) {
  const [capacityOptions, setCapacityOptions] = useState<CapacityOption[]>([]);
  const [installers, setInstallers] = useState<InstallerInfo[]>([]);
  const [allInstallers, setAllInstallers] = useState<{ id: string; name: string; region: string | null; status: string | null }[]>([]);
  const [pricingMap, setPricingMap] = useState<Map<string, PricingEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [expandedInstaller, setExpandedInstaller] = useState<string | null>(null);
  const [showAddInstaller, setShowAddInstaller] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [capRes, battInstRes, allInstRes] = await Promise.all([
        import('zitejs/api').then(m => m.listCapacityOptions({ batteryId })),
        import('zitejs/api').then(m => m.getBatteryInstallers({ batteryId })),
        import('zitejs/api').then(m => m.listInstallers({})),
      ]);
      setCapacityOptions(capRes.options.map(o => ({ id: o.id, label: o.label || '', capacityKwh: o.capacityKwh ?? null })));
      setAllInstallers(allInstRes.installers.map(i => ({ id: i.id, name: i.name, region: i.region, status: i.status })));

      // Build installer list and pricing map from the battery installers result
      const instMap = new Map<string, InstallerInfo>();
      const prMap = new Map<string, PricingEntry>();

      for (const inst of battInstRes.installers) {
        instMap.set(inst.id, {
          id: inst.id, name: inst.name, region: inst.region, contactPerson: inst.contactPerson,
          contactEmail: inst.contactEmail, phone: inst.phone, status: inst.status,
        });
        for (const co of inst.capacityOptions) {
          const key = `${inst.id}::${co.capacityOptionId}`;
          prMap.set(key, {
            id: co.pricingId,
            installerId: inst.id, capacityOptionId: co.capacityOptionId,
            price: co.price, available: co.available, label: null,
          });
        }
      }

      setInstallers(Array.from(instMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
      setPricingMap(prMap);
    } finally { setLoading(false); }
  }, [batteryId]);

  useEffect(() => { load(); }, [load]);

  const getKey = (installerId: string, capId: string) => `${installerId}::${capId}`;
  const getPricing = (installerId: string, capId: string) => pricingMap.get(getKey(installerId, capId));

  const handleSavePrice = async (installerId: string, capId: string) => {
    const existing = getPricing(installerId, capId);
    const priceVal = editPrice.trim() ? Number(editPrice) : null;
    try {
      const result = await saveInstallerPricing({
        id: existing?.id || undefined,
        installerId, capacityOptionId: capId,
        price: priceVal, available: true,
      });
      const key = getKey(installerId, capId);
      setPricingMap(prev => {
        const next = new Map(prev);
        next.set(key, {
          id: result.id, installerId, capacityOptionId: capId,
          price: priceVal, available: true, label: null,
        });
        return next;
      });
      toast.success('Price saved');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save');
    }
    setEditingCell(null);
  };

  const handleToggleAvailable = async (installerId: string, capId: string, available: boolean) => {
    const existing = getPricing(installerId, capId);
    if (!existing) return;
    try {
      await saveInstallerPricing({
        id: existing.id, installerId, capacityOptionId: capId,
        price: existing.price, available,
      });
      const key = getKey(installerId, capId);
      setPricingMap(prev => {
        const next = new Map(prev);
        next.set(key, { ...existing, available });
        return next;
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update');
    }
  };

  const handleDeletePricing = async (installerId: string, capId: string) => {
    const existing = getPricing(installerId, capId);
    if (!existing) return;
    try {
      await deleteInstallerPricing({ id: existing.id });
      const key = getKey(installerId, capId);
      setPricingMap(prev => { const next = new Map(prev); next.delete(key); return next; });
      toast.success('Pricing removed');
    } catch (err: any) { toast.error(err?.message || 'Failed to delete'); }
  };

  const handleAddInstaller = async (installerId: string) => {
    // Add pricing entries for all capacity options (price TBD)
    if (capacityOptions.length === 0) {
      toast.error('Add capacity options first');
      return;
    }
    for (const cap of capacityOptions) {
      const key = getKey(installerId, cap.id);
      if (!pricingMap.has(key)) {
        await saveInstallerPricing({ installerId, capacityOptionId: cap.id, price: null, available: true });
      }
    }
    setShowAddInstaller(false);
    toast.success('Installer added — set prices below');
    load();
  };

  const unusedInstallers = allInstallers.filter(i =>
    !installers.some(existing => existing.id === i.id) && i.status === 'Active'
  );

  if (loading) return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Installer Pricing</h3>
      <div className="h-32 bg-muted animate-pulse rounded-lg" />
    </div>
  );

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
        <span className="font-semibold text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4" /> Installer Pricing
          <Badge variant="secondary" className="text-xs">{installers.length} installers</Badge>
        </span>
        <Button variant="ghost" size="sm" onClick={() => setShowAddInstaller(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Installer
        </Button>
      </div>

      {capacityOptions.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground text-center">
          Add capacity options first, then assign installer pricing per configuration.
        </div>
      ) : installers.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground text-center">
          No installers have pricing for this battery yet. Add one to get started.
        </div>
      ) : (
        <div className="divide-y">
          {installers.map(inst => (
            <InstallerPricingRow
              key={inst.id}
              installer={inst}
              capacityOptions={capacityOptions}
              getPricing={(capId) => getPricing(inst.id, capId)}
              expanded={expandedInstaller === inst.id}
              onToggle={() => setExpandedInstaller(expandedInstaller === inst.id ? null : inst.id)}
              editingCell={editingCell}
              editPrice={editPrice}
              onStartEdit={(capId) => {
                const p = getPricing(inst.id, capId);
                setEditingCell(getKey(inst.id, capId));
                setEditPrice(p?.price != null ? String(p.price) : '');
              }}
              onSavePrice={(capId) => handleSavePrice(inst.id, capId)}
              onCancelEdit={() => setEditingCell(null)}
              onEditPriceChange={setEditPrice}
              onToggleAvailable={(capId, avail) => handleToggleAvailable(inst.id, capId, avail)}
              onDeletePricing={(capId) => handleDeletePricing(inst.id, capId)}
            />
          ))}
        </div>
      )}

      <AddInstallerDialog
        open={showAddInstaller}
        onOpenChange={setShowAddInstaller}
        unusedInstallers={unusedInstallers}
        onSelect={handleAddInstaller}
      />
    </div>
  );
}

function InstallerPricingRow({ installer, capacityOptions, getPricing, expanded, onToggle,
  editingCell, editPrice, onStartEdit, onSavePrice, onCancelEdit, onEditPriceChange,
  onToggleAvailable, onDeletePricing,
}: {
  installer: InstallerInfo;
  capacityOptions: CapacityOption[];
  getPricing: (capId: string) => PricingEntry | undefined;
  expanded: boolean;
  onToggle: () => void;
  editingCell: string | null;
  editPrice: string;
  onStartEdit: (capId: string) => void;
  onSavePrice: (capId: string) => void;
  onCancelEdit: () => void;
  onEditPriceChange: (v: string) => void;
  onToggleAvailable: (capId: string, available: boolean) => void;
  onDeletePricing: (capId: string) => void;
}) {
  const pricedCount = capacityOptions.filter(co => getPricing(co.id)?.price != null).length;
  const totalCount = capacityOptions.length;

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/20 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-medium text-sm">{installer.name}</span>
          {installer.status && (
            <Badge variant="secondary" className={
              installer.status === 'Active' ? 'bg-emerald-100 text-emerald-700 text-[11px]' :
              'bg-gray-100 text-gray-600 text-[11px]'
            }>{installer.status}</Badge>
          )}
          {installer.region && (
            <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{installer.region}</span>
          )}
          <Badge variant="outline" className="text-[11px]">
            {pricedCount}/{totalCount} priced
          </Badge>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex gap-1.5">
            {capacityOptions.map(co => {
              const p = getPricing(co.id);
              return (
                <Badge key={co.id} variant={p?.price != null ? 'default' : 'outline'}
                  className={`text-[10px] font-normal ${p?.price != null ? '' : 'text-muted-foreground border-dashed'}`}>
                  {co.capacityKwh != null ? `${co.capacityKwh}kWh` : co.label}
                  {p?.price != null && ` $${p.price.toLocaleString()}`}
                </Badge>
              );
            })}
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t bg-muted/5 px-4 py-3 space-y-3">
          {/* Contact info */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {installer.contactPerson && <span>{installer.contactPerson}</span>}
            {installer.contactEmail && (
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{installer.contactEmail}</span>
            )}
            {installer.phone && (
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{installer.phone}</span>
            )}
          </div>

          {/* Pricing per capacity option */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pricing by Capacity Configuration
            </Label>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-left">
                    <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Configuration</th>
                    <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Capacity</th>
                    <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Installed Price</th>
                    <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Available</th>
                    <th className="px-3 py-2 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {capacityOptions.map(co => {
                    const pricing = getPricing(co.id);
                    const cellKey = `${installer.id}::${co.id}`;
                    const isEditing = editingCell === cellKey;

                    return (
                      <tr key={co.id} className="group">
                        <td className="px-3 py-2 font-medium">{co.label}</td>
                        <td className="px-3 py-2 text-muted-foreground">{co.capacityKwh != null ? `${co.capacityKwh} kWh` : '—'}</td>
                        <td className="px-3 py-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">$</span>
                              <Input
                                type="number" value={editPrice}
                                onChange={e => onEditPriceChange(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') onSavePrice(co.id); if (e.key === 'Escape') onCancelEdit(); }}
                                className="h-7 w-28 text-sm"
                                autoFocus
                              />
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onSavePrice(co.id)}>
                                <Check className="h-3 w-3 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancelEdit}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span
                              className={`cursor-pointer hover:text-primary transition-colors ${pricing?.price != null ? 'font-semibold' : 'text-muted-foreground italic'}`}
                              onClick={e => { e.stopPropagation(); onStartEdit(co.id); }}
                            >
                              {pricing?.price != null ? `$${pricing.price.toLocaleString()}` : 'Set price...'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {pricing ? (
                            <Switch
                              checked={pricing.available}
                              onCheckedChange={v => onToggleAvailable(co.id, v)}
                              className="scale-75"
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {pricing && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove this pricing?</AlertDialogTitle>
                                  <AlertDialogDescription>This will remove the pricing for {co.label} from {installer.name}.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onDeletePricing(co.id)}>Remove</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddInstallerDialog({ open, onOpenChange, unusedInstallers, onSelect }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  unusedInstallers: { id: string; name: string; region: string | null }[];
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = unusedInstallers.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader><DialogTitle>Add Installer to Battery</DialogTitle></DialogHeader>
        <Input placeholder="Search installers..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex-1 overflow-y-auto space-y-1 mt-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {unusedInstallers.length === 0 ? 'All active installers are already assigned to this battery.' : 'No match found.'}
            </p>
          ) : filtered.map(inst => (
            <button key={inst.id}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-muted text-left transition-colors"
              onClick={() => onSelect(inst.id)}>
              <div>
                <div className="text-sm font-medium">{inst.name}</div>
                {inst.region && <div className="text-xs text-muted-foreground">{inst.region}</div>}
              </div>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
