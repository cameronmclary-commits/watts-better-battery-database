import { useState, useEffect, useCallback } from 'react';
import { listInspectors, saveInspector, deleteInspector, ListInspectorsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@project/components/ui/alert-dialog';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

type Inspector = ListInspectorsOutputType['inspectors'][0];

export default function InspectorsPage() {
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<Inspector | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await listInspectors({}); setInspectors(res.inspectors); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteInspector({ id });
    toast.success('Inspector deleted');
    load();
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Inspectors</h2>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Inspector
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : inspectors.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No inspectors yet.</div>
      ) : (
        <div className="space-y-3">
          {inspectors.map(insp => (
            <InspectorCard
              key={insp.id} insp={insp}
              expanded={expandedId === insp.id}
              onToggle={() => setExpandedId(expandedId === insp.id ? null : insp.id)}
              onEdit={() => { setEditItem(insp); setShowForm(true); }}
              onDelete={() => handleDelete(insp.id)}
            />
          ))}
        </div>
      )}

      <InspectorFormDialog open={showForm} onOpenChange={setShowForm} inspector={editItem} onSaved={load} />
    </div>
  );
}

function InspectorCard({ insp, expanded, onToggle, onEdit, onDelete }: {
  insp: Inspector; expanded: boolean; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <span className="font-semibold">{insp.name}</span>
          {insp.status && (
            <Badge variant="secondary" className={insp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}>
              {insp.status}
            </Badge>
          )}
          {insp.region && <span className="text-sm text-muted-foreground">{insp.region}</span>}
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
                <AlertDialogTitle>Delete this inspector?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove {insp.name}.</AlertDialogDescription>
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
        <div className="border-t px-4 py-3 grid grid-cols-2 gap-x-8 gap-y-2 text-sm bg-muted/10">
          <Detail label="Contact Person" value={insp.contactPerson} />
          <Detail label="Email" value={insp.contactEmail} />
          <Detail label="Mobile" value={insp.mobilePhone} />
          <Detail label="Office" value={insp.officePhone} />
          <Detail label="Address" value={insp.address} className="col-span-2" />
          <Detail label="ABN" value={insp.abn} />
          <Detail label="QLD Electrical Licence" value={insp.qldElectricalLicence} />
          <Detail label="Licence Holder" value={insp.electricalLicenceHolder} />
          <Detail label="Region" value={insp.region} />
          <Detail label="Specialisations" value={insp.specialisations} className="col-span-2" />
          <Detail label="Notes" value={insp.notes} className="col-span-2" />
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

function InspectorFormDialog({ open, onOpenChange, inspector, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; inspector: Inspector | null; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '', contactEmail: '', contactPerson: '', mobilePhone: '', officePhone: '',
    address: '', region: '', status: 'Active', qldElectricalLicence: '',
    electricalLicenceHolder: '', abn: '', specialisations: '', notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const i = inspector;
      setForm({
        name: i?.name || '', contactEmail: i?.contactEmail || '',
        contactPerson: i?.contactPerson || '', mobilePhone: i?.mobilePhone || '',
        officePhone: i?.officePhone || '', address: i?.address || '',
        region: i?.region || '', status: i?.status || 'Active',
        qldElectricalLicence: i?.qldElectricalLicence || '',
        electricalLicenceHolder: i?.electricalLicenceHolder || '',
        abn: i?.abn || '',
        specialisations: i?.specialisations || '', notes: i?.notes || '',
      });
    }
  }, [open, inspector]);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await saveInspector({
        id: inspector?.id, name: form.name.trim(),
        contactEmail: form.contactEmail.trim() || null,
        contactPerson: form.contactPerson.trim() || null,
        mobilePhone: form.mobilePhone.trim() || null,
        officePhone: form.officePhone.trim() || null,
        address: form.address.trim() || null,
        region: form.region.trim() || null, status: form.status,
        qldElectricalLicence: form.qldElectricalLicence.trim() || null,
        electricalLicenceHolder: form.electricalLicenceHolder.trim() || null,
        abn: form.abn.trim() || null,
        specialisations: form.specialisations.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast.success(inspector ? 'Inspector updated' : 'Inspector created');
      onOpenChange(false); onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{inspector ? 'Edit Inspector' : 'Add Inspector'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Business Name *</Label><Input value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div><Label>ABN</Label><Input value={form.abn} onChange={e => set('abn', e.target.value)} placeholder="XX XXX XXX XXX" /></div>
          <div><Label>Address</Label><Textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} /></div>
          <div><Label>Region</Label><Input value={form.region} onChange={e => set('region', e.target.value)} placeholder="e.g. Brisbane, Gold Coast, Sunshine Coast" /></div>

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

          <div className="border-t pt-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</Label>
          </div>
          <div><Label>Specialisations</Label><Textarea value={form.specialisations} onChange={e => set('specialisations', e.target.value)} rows={2} placeholder="e.g. Solar inspections, battery commissioning, compliance audits..." /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></div>

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
            {saving ? 'Saving...' : inspector ? 'Update' : 'Create Inspector'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
