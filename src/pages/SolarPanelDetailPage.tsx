import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getSolarPanelDetail, deleteSolarPanel, GetSolarPanelDetailOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Badge } from '@project/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import SolarPanelFormDialog from '../components/SolarPanelFormDialog';

type Detail = GetSolarPanelDetailOutputType;

export default function SolarPanelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try { setPanel(await getSolarPanelDetail({ id })); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!id) return;
    await deleteSolarPanel({ id });
    toast.success('Solar panel deleted');
    navigate('/solar-panels');
  };

  if (loading) return <div className="p-6"><div className="h-64 rounded-lg bg-muted animate-pulse" /></div>;
  if (!panel) return <div className="p-6 text-muted-foreground">Solar panel not found.</div>;

  const specRows: [string, string][] = [
    ['Wattage', panel.wattage != null ? `${panel.wattage} W` : '—'],
    ['Efficiency', panel.efficiency != null ? `${panel.efficiency}%` : '—'],
    ['Cell Type', panel.cellType || '—'],
    ['Voltage Mpp', panel.voltageMpp != null ? `${panel.voltageMpp} V` : '—'],
    ['Current Mpp', panel.currentMpp != null ? `${panel.currentMpp} A` : '—'],
    ['Open Circuit Voltage', panel.openCircuitVoltage != null ? `${panel.openCircuitVoltage} V` : '—'],
    ['Short Circuit Current', panel.shortCircuitCurrent != null ? `${panel.shortCircuitCurrent} A` : '—'],
    ['Weight', panel.weightKg != null ? `${panel.weightKg} kg` : '—'],
    ['Dimensions', panel.dimensions || '—'],
    ['Warranty', panel.warrantyYears != null ? `${panel.warrantyYears} years` : '—'],
    ['Performance Warranty', panel.performanceWarrantyPct != null ? `${panel.performanceWarrantyPct}%` : '—'],
  ];

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/solar-panels')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex flex-col md:flex-row gap-6">
        {panel.images && panel.images.length > 0 ? (
          <div className="w-full md:w-64 h-52 rounded-lg bg-muted overflow-hidden shrink-0">
            <img src={panel.images[0].url} alt={panel.name} className="w-full h-full object-contain" />
          </div>
        ) : null}

        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">{panel.name}</h2>
              <p className="text-muted-foreground">{panel.manufacturer} · {panel.model}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
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
                    <AlertDialogTitle>Delete this solar panel?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently remove {panel.name} and cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {panel.status && (
            <Badge variant="secondary" className={
              panel.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
              panel.status === 'Discontinued' ? 'bg-red-100 text-red-700' :
              'bg-blue-100 text-blue-700'
            }>{panel.status}</Badge>
          )}

          {panel.description && <p className="text-sm">{panel.description}</p>}
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
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

      {panel.additionalInfo && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-2">Additional Info</h3>
          <p className="text-sm whitespace-pre-wrap">{panel.additionalInfo}</p>
        </div>
      )}

      {panel.manufacturerOverview && (
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-2">Manufacturer Overview</h3>
          <p className="text-sm whitespace-pre-wrap">{panel.manufacturerOverview}</p>
        </div>
      )}

      <SolarPanelFormDialog open={editOpen} onOpenChange={setEditOpen} onSaved={load} editPanel={panel} />
    </div>
  );
}
