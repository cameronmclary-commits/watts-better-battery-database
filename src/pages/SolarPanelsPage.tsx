import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { listSolarPanels, ListSolarPanelsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';
import SolarPanelFormDialog from '../components/SolarPanelFormDialog';

type Panel = ListSolarPanelsOutputType['panels'][0];

export default function SolarPanelsPage() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const searchRef = useRef(search);
  searchRef.current = search;

  const fetchPanels = useCallback(async (q: string) => {
    setLoading(true);
    try { const res = await listSolarPanels({ search: q }); setPanels(res.panels); }
    finally { setLoading(false); }
  }, []);

  const debouncedFetch = useDebouncedCallback((q: string) => fetchPanels(q), 300);
  const load = useCallback(() => fetchPanels(searchRef.current), [fetchPanels]);
  useEffect(() => { fetchPanels(''); }, [fetchPanels]);

  const handleSearchChange = (value: string) => { setSearch(value); debouncedFetch(value); };

  const statusColor: Record<string, string> = {
    Active: 'bg-emerald-100 text-emerald-700',
    Discontinued: 'bg-red-100 text-red-700',
    'Coming Soon': 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Solar Panels</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Panel
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search solar panels..." value={search} onChange={e => handleSearchChange(e.target.value)} className="pl-9" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : panels.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {search ? 'No panels match your search.' : 'No solar panels yet. Add one to get started.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {panels.map(p => (
            <Link key={p.id} to={`/solar-panels/${p.id}`}
              className="group border rounded-lg bg-card hover:shadow-md transition-shadow overflow-hidden">
              {p.imageUrl ? (
                <div className="h-36 bg-muted overflow-hidden">
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="h-36 bg-muted flex items-center justify-center text-muted-foreground text-sm">No image</div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold truncate">{p.name}</h3>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground">{p.manufacturer} · {p.model}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {p.status && <Badge variant="secondary" className={statusColor[p.status] || ''}>{p.status}</Badge>}
                  {p.wattage != null && <Badge variant="outline">{p.wattage}W</Badge>}
                  {p.efficiency != null && <Badge variant="outline">{p.efficiency}%</Badge>}
                  {p.cellType && <Badge variant="outline" className="text-xs">{p.cellType}</Badge>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <SolarPanelFormDialog open={showForm} onOpenChange={setShowForm} onSaved={load} />
    </div>
  );
}
