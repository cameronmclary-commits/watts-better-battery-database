import { useState, useEffect, useCallback } from 'react';
import { getInstallerBatteryPricing, saveInstallerPricing, deleteInstallerPricing, GetInstallerBatteryPricingOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Checkbox } from '@project/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@project/components/ui/popover';
import { Loader2, Check, X, DollarSign, Battery, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { toast } from 'sonner';

type Battery = GetInstallerBatteryPricingOutputType['batteries'][0];
type CapOpt = Battery['capacityOptions'][0];

interface Props {
  installerId: string;
  installerName: string;
}

export default function InstallerBatteryPricingTable({ installerId, installerName }: Props) {
  const [batteries, setBatteries] = useState<Battery[]>([]);
  const [installerAreas, setInstallerAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInstallerBatteryPricing({ installerId });
      setBatteries(res.batteries);
      setInstallerAreas(res.installerServiceAreas);
      setExpanded(new Set(res.batteries.filter(b => b.selected).map(b => b.id)));
    } finally { setLoading(false); }
  }, [installerId]);

  useEffect(() => { load(); }, [load]);

  const toggleBattery = async (battery: Battery) => {
    if (battery.selected) {
      for (const cap of battery.capacityOptions) {
        if (cap.pricing) await deleteInstallerPricing({ id: cap.pricing.id });
      }
      toast.success(`Removed ${battery.name}`);
    } else {
      for (const cap of battery.capacityOptions) {
        await saveInstallerPricing({
          installerId, capacityOptionId: cap.id,
          priceMin: cap.defaultPriceMin, priceMax: cap.defaultPriceMax,
          price: cap.defaultPriceMin, available: true,
          availableAreas: installerAreas, // default to installer's service areas
        });
      }
      toast.success(`Added ${battery.name} — prices pre-filled, areas set from installer coverage`);
    }
    load();
  };

  const toggleExpand = (id: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (loading) return (
    <div className="p-4 space-y-2">
      {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
    </div>
  );

  const selected = batteries.filter(b => b.selected);
  const unselected = batteries.filter(b => !b.selected);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Battery Pricing</span>
          <Badge variant="secondary" className="text-xs">{selected.length} of {batteries.length}</Badge>
        </div>
        {installerAreas.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {installerAreas.map(a => (
              <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>
            ))}
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="space-y-2">
          {selected.map(battery => (
            <SelectedBatterySection key={battery.id} battery={battery}
              installerId={installerId} installerAreas={installerAreas}
              expanded={expanded.has(battery.id)} onToggleExpand={() => toggleExpand(battery.id)}
              onDeselect={() => toggleBattery(battery)} onPricingUpdated={load} />
          ))}
        </div>
      )}

      {unselected.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Available Batteries — tick to add</p>
          <div className="border rounded-lg divide-y">
            {unselected.map(battery => (
              <div key={battery.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                <Checkbox checked={false} onCheckedChange={() => toggleBattery(battery)} />
                <Battery className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm">{battery.name}</span>
                {battery.manufacturer && <span className="text-xs text-muted-foreground">{battery.manufacturer}</span>}
                <Badge variant="outline" className="text-[10px] ml-auto">
                  {battery.capacityOptions.length} option{battery.capacityOptions.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SelectedBatterySection({ battery, installerId, installerAreas, expanded, onToggleExpand, onDeselect, onPricingUpdated }: {
  battery: Battery; installerId: string; installerAreas: string[];
  expanded: boolean; onToggleExpand: () => void; onDeselect: () => void; onPricingUpdated: () => void;
}) {
  const pricedCount = battery.capacityOptions.filter(c => c.pricing && (c.pricing.priceMin != null || c.pricing.priceMax != null)).length;
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors" onClick={onToggleExpand}>
        <Checkbox checked onCheckedChange={() => onDeselect()} onClick={e => e.stopPropagation()} />
        <Battery className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-sm">{battery.name}</span>
        {battery.manufacturer && <span className="text-xs text-muted-foreground">{battery.manufacturer}</span>}
        <Badge variant="outline" className="text-[10px] ml-auto mr-1">{pricedCount}/{battery.capacityOptions.length} priced</Badge>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      {expanded && battery.capacityOptions.length > 0 && (
        <div className="border-t">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/20 text-left">
                <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Capacity</th>
                <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Default Range</th>
                <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Installer Min</th>
                <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Installer Max</th>
                <th className="px-3 py-2 font-medium text-xs text-muted-foreground">Areas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {battery.capacityOptions.map(cap => (
                <CapacityPricingRow key={cap.id} cap={cap} installerId={installerId}
                  installerAreas={installerAreas} onUpdated={onPricingUpdated} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {expanded && battery.capacityOptions.length === 0 && (
        <div className="p-3 text-xs text-muted-foreground text-center border-t">No capacity options defined yet.</div>
      )}
    </div>
  );
}

function CapacityPricingRow({ cap, installerId, installerAreas, onUpdated }: {
  cap: CapOpt; installerId: string; installerAreas: string[]; onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [minVal, setMinVal] = useState('');
  const [maxVal, setMaxVal] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setMinVal(cap.pricing?.priceMin != null ? String(cap.pricing.priceMin) : '');
    setMaxVal(cap.pricing?.priceMax != null ? String(cap.pricing.priceMax) : '');
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveInstallerPricing({
        id: cap.pricing?.id, installerId, capacityOptionId: cap.id,
        priceMin: minVal ? Number(minVal) : null,
        priceMax: maxVal ? Number(maxVal) : null,
        price: minVal ? Number(minVal) : null,
        available: true,
        availableAreas: cap.pricing?.availableAreas ?? installerAreas,
      });
      toast.success('Price updated');
      setEditing(false);
      onUpdated();
    } finally { setSaving(false); }
  };

  const toggleArea = async (area: string) => {
    if (!cap.pricing) return;
    const current = cap.pricing.availableAreas || [];
    const next = current.includes(area)
      ? current.filter(a => a !== area)
      : [...current, area];
    await saveInstallerPricing({
      id: cap.pricing.id, installerId, capacityOptionId: cap.id,
      priceMin: cap.pricing.priceMin, priceMax: cap.pricing.priceMax,
      price: cap.pricing.price, available: next.length > 0,
      availableAreas: next,
    });
    onUpdated();
  };

  const defaultRange = cap.defaultPriceMin != null || cap.defaultPriceMax != null
    ? `$${(cap.defaultPriceMin ?? 0).toLocaleString()} – $${(cap.defaultPriceMax ?? 0).toLocaleString()}`
    : '—';

  const areas = cap.pricing?.availableAreas || [];

  if (editing) {
    return (
      <tr className="bg-primary/5">
        <td className="px-3 py-2 font-medium">
          {cap.label}
          {cap.capacityKwh != null && <span className="text-muted-foreground ml-1">({cap.capacityKwh} kWh)</span>}
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground">{defaultRange}</td>
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">$</span>
            <Input type="number" value={minVal} onChange={e => setMinVal(e.target.value)}
              className="h-7 w-24 text-sm" placeholder="Min"
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
              autoFocus />
          </div>
        </td>
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground text-xs">$</span>
            <Input type="number" value={maxVal} onChange={e => setMaxVal(e.target.value)}
              className="h-7 w-24 text-sm" placeholder="Max"
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
          </div>
        </td>
        <td className="px-3 py-1.5">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-primary" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  const hasPrice = cap.pricing && (cap.pricing.priceMin != null || cap.pricing.priceMax != null);

  return (
    <tr className="group hover:bg-muted/10 transition-colors">
      <td className="px-3 py-2 font-medium">
        {cap.label}
        {cap.capacityKwh != null && <span className="text-muted-foreground ml-1">({cap.capacityKwh} kWh)</span>}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{defaultRange}</td>
      <td className="px-3 py-2 cursor-pointer" onClick={startEdit} colSpan={2}>
        {hasPrice ? (
          <span className="font-semibold">
            ${(cap.pricing!.priceMin ?? 0).toLocaleString()} – ${(cap.pricing!.priceMax ?? 0).toLocaleString()}
          </span>
        ) : (
          <span className="text-muted-foreground italic text-xs">Click to set price range...</span>
        )}
      </td>
      <td className="px-3 py-2">
        {cap.pricing && (
          <AreasPicker areas={areas} installerAreas={installerAreas} onToggle={toggleArea} />
        )}
      </td>
    </tr>
  );
}

function AreasPicker({ areas, installerAreas, onToggle }: {
  areas: string[]; installerAreas: string[]; onToggle: (area: string) => void;
}) {
  const allAreas = installerAreas.length > 0 ? installerAreas : areas;
  const displayAreas = [...new Set([...allAreas, ...areas])].sort();

  if (displayAreas.length === 0) {
    return <span className="text-xs text-muted-foreground">No areas</span>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs hover:text-primary transition-colors">
          <MapPin className="h-3 w-3" />
          <span>{areas.length} area{areas.length !== 1 ? 's' : ''}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground mb-2">Available in:</p>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {displayAreas.map(area => (
            <label key={area} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox checked={areas.includes(area)} onCheckedChange={() => onToggle(area)} />
              {area}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
