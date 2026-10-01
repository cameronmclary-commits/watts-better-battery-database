import { useState, useEffect, useCallback } from 'react';
import { listCapacityOptions, saveCapacityOption, deleteCapacityOption, ListCapacityOptionsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Option = ListCapacityOptionsOutputType['options'][0];

export default function CapacityOptionsSection({ batteryId }: { batteryId: string }) {
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Option | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCapacityOptions({ batteryId });
      setOptions(res.options);
    } finally { setLoading(false); }
  }, [batteryId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteCapacityOption({ id });
    toast.success('Capacity option deleted');
    load();
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
        <span className="font-semibold text-sm">Capacity Options</span>
        <Button variant="ghost" size="sm" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
      {loading ? (
        <div className="p-4"><div className="h-12 bg-muted animate-pulse rounded" /></div>
      ) : options.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground text-center">No capacity options yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-t">
              <th className="px-4 py-2 font-medium text-muted-foreground">Label</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Capacity</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Modules</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Price Range</th>
              <th className="px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {options.map(o => (
              <tr key={o.id}>
                <td className="px-4 py-2">{o.label || '—'}</td>
                <td className="px-4 py-2">{o.capacityKwh != null ? `${o.capacityKwh} kWh` : '—'}</td>
                <td className="px-4 py-2">{o.numberOfModules ?? '—'}</td>
                <td className="px-4 py-2">
                  {o.priceMin != null || o.priceMax != null
                    ? `$${(o.priceMin ?? 0).toLocaleString()} – $${(o.priceMax ?? 0).toLocaleString()}`
                    : '—'}
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem(o); setShowForm(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this option?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(o.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <CapacityFormDialog open={showForm} onOpenChange={setShowForm} item={editItem} batteryId={batteryId} onSaved={load} />
    </div>
  );
}

function CapacityFormDialog({ open, onOpenChange, item, batteryId, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; item: Option | null; batteryId: string; onSaved: () => void }) {
  const [label, setLabel] = useState('');
  const [capacity, setCapacity] = useState('');
  const [modules, setModules] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLabel(item?.label || '');
      setCapacity(item?.capacityKwh != null ? String(item.capacityKwh) : '');
      setModules(item?.numberOfModules != null ? String(item.numberOfModules) : '');
      setPriceMin(item?.priceMin != null ? String(item.priceMin) : '');
      setPriceMax(item?.priceMax != null ? String(item.priceMax) : '');
    }
  }, [open, item]);

  const handleSave = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const num = (v: string) => v ? Number(v) : null;
      await saveCapacityOption({
        id: item?.id,
        batteryId,
        label: label.trim(),
        capacityKwh: num(capacity),
        numberOfModules: num(modules),
        priceMin: num(priceMin),
        priceMax: num(priceMax),
      });
      toast.success(item ? 'Option updated' : 'Option created');
      onOpenChange(false);
      onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{item ? 'Edit Option' : 'Add Capacity Option'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Label *</Label><Input placeholder="e.g. 10 kWh Config" value={label} onChange={e => setLabel(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Capacity (kWh)</Label><Input type="number" step="0.01" value={capacity} onChange={e => setCapacity(e.target.value)} /></div>
            <div><Label># Modules</Label><Input type="number" value={modules} onChange={e => setModules(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Price Min ($)</Label><Input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} /></div>
            <div><Label>Price Max ($)</Label><Input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} /></div>
          </div>
          <Button onClick={handleSave} disabled={saving || !label.trim()} className="w-full">
            {saving ? 'Saving...' : item ? 'Update' : 'Add Option'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
