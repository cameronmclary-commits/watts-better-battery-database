import { useState, useEffect, useCallback } from 'react';
import {
  listEnergyPlans, updateBatteryPlans, listPlanCompatibility,
  savePlanCompatibility, deletePlanCompatibility,
  ListEnergyPlansOutputType, ListPlanCompatibilityOutputType,
} from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Checkbox } from '@project/components/ui/checkbox';
import { Plus, X, AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Plan = ListEnergyPlansOutputType['plans'][0];
type CompatRecord = ListPlanCompatibilityOutputType['records'][0];

interface Props {
  batteryId: string;
  linkedPlanIds: string[];
  linkedPlans: { id: string; planName: string; tariffType: string | null; biDirectionalCharging: boolean }[];
  onUpdated: () => void;
}

export default function EnergyPlanLinkSection({ batteryId, linkedPlanIds, linkedPlans, onUpdated }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [compatRecords, setCompatRecords] = useState<CompatRecord[]>([]);
  const [compatLoaded, setCompatLoaded] = useState(false);

  useEffect(() => {
    listPlanCompatibility({ batteryId }).then(r => {
      setCompatRecords(r.records);
      setCompatLoaded(true);
    });
  }, [batteryId]);

  const handleUnlink = async (planId: string) => {
    const newIds = linkedPlanIds.filter(id => id !== planId);
    await updateBatteryPlans({ batteryId, energyPlanIds: newIds });
    toast.success('Plan unlinked');
    onUpdated();
  };

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

  // Merge linked plans with compatibility records for display
  const getCompatForPlan = (planId: string) => compatRecords.find(r => r.planId === planId);

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
        <span className="font-semibold text-sm">Compatible Energy Plans</span>
        <Button variant="ghost" size="sm" onClick={() => setShowPicker(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Link Plans
        </Button>
      </div>

      {linkedPlans.length === 0 && compatRecords.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground text-center">No energy plans linked yet.</div>
      ) : (
        <div className="divide-y">
          {linkedPlans.map(p => {
            const compat = getCompatForPlan(p.id);
            return (
              <div key={p.id} className="px-4 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{p.planName}</span>
                    {p.tariffType && <Badge variant="outline" className="text-xs">{p.tariffType}</Badge>}
                    {p.biDirectionalCharging && <Badge variant="secondary" className="text-xs">Bi-Directional</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    {compat && (
                      <Select value={compat.compatibilityStatus.toLowerCase()} onValueChange={v => handleStatusChange(compat, v)}>
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
                    )}
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleUnlink(p.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {compat?.restrictions && (
                  <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{compat.restrictions}</span>
                  </div>
                )}
                {compat?.compatibilityNotes && (
                  <p className="text-xs text-muted-foreground">{compat.compatibilityNotes}</p>
                )}
              </div>
            );
          })}

          {/* Show compatibility records for plans not in the direct link */}
          {compatRecords.filter(r => !linkedPlanIds.includes(r.planId)).map(rec => (
            <div key={rec.id} className="px-4 py-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{rec.planName}</span>
                  <Badge variant="outline" className="text-xs">via compatibility</Badge>
                </div>
                <div className="flex items-center gap-2">
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
              {rec.restrictions && (
                <div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{rec.restrictions}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <PlanPickerDialog open={showPicker} onOpenChange={setShowPicker} batteryId={batteryId} currentIds={linkedPlanIds} onUpdated={onUpdated} />
    </div>
  );
}

function PlanPickerDialog({ open, onOpenChange, batteryId, currentIds, onUpdated }: {
  open: boolean; onOpenChange: (o: boolean) => void; batteryId: string; currentIds: string[]; onUpdated: () => void;
}) {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected(new Set(currentIds));
      listEnergyPlans({}).then(r => setAllPlans(r.plans));
    }
  }, [open, currentIds]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBatteryPlans({ batteryId, energyPlanIds: Array.from(selected) });
      toast.success('Energy plans updated');
      onOpenChange(false);
      onUpdated();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col">
        <DialogHeader><DialogTitle>Link Energy Plans</DialogTitle></DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2">
          {allPlans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No energy plans exist yet. Create one first.</p>
          ) : allPlans.map(p => (
            <label key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted cursor-pointer">
              <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggle(p.id)} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{p.planName}</div>
                <div className="text-xs text-muted-foreground">{p.provider}{p.tariffType ? ` · ${p.tariffType}` : ''}</div>
              </div>
            </label>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
