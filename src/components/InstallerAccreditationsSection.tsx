import { useState, useEffect, useCallback } from 'react';
import {
  listInstallerAccreditations, saveInstallerAccreditation, deleteInstallerAccreditation,
  ListInstallerAccreditationsOutputType,
} from 'zitejs/api';
import { useUpload } from 'zitejs/upload';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Badge } from '@project/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@project/components/ui/alert-dialog';
import { Plus, Trash2, Pencil, Award, ImagePlus, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type Accreditation = ListInstallerAccreditationsOutputType['accreditations'][0];
type Attachment = { url: string; filename: string };

export default function InstallerAccreditationsSection({ installerId }: { installerId: string }) {
  const [items, setItems] = useState<Accreditation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Accreditation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listInstallerAccreditations({ installerId }); setItems(r.accreditations); }
    finally { setLoading(false); }
  }, [installerId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteInstallerAccreditation({ id });
    toast.success('Accreditation deleted');
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Accreditations</h4>
        <Button size="sm" variant="outline" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Accreditation
        </Button>
      </div>

      {loading ? (
        <div className="h-12 bg-muted animate-pulse rounded" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3">No accreditations yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map(a => (
            <AccreditationCard key={a.id} accreditation={a}
              onEdit={() => { setEditItem(a); setShowForm(true); }}
              onDelete={() => handleDelete(a.id)}
            />
          ))}
        </div>
      )}

      <AccreditationFormDialog
        open={showForm} onOpenChange={setShowForm}
        installerId={installerId} accreditation={editItem} onSaved={load}
      />
    </div>
  );
}

function AccreditationCard({ accreditation, onEdit, onDelete }: {
  accreditation: Accreditation; onEdit: () => void; onDelete: () => void;
}) {
  const statusColor: Record<string, string> = {
    current: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      <div className="flex gap-3 p-3">
        {/* Certificate image thumbnail */}
        {accreditation.certificateImage.length > 0 ? (
          <a href={accreditation.certificateImage[0].url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 w-16 h-16 rounded-lg overflow-hidden border">
            <img src={accreditation.certificateImage[0].url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
          </a>
        ) : (
          <div className="shrink-0 w-16 h-16 rounded-lg bg-muted/50 flex items-center justify-center border">
            <Award className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-medium text-sm">{accreditation.accreditationName}</span>
              {accreditation.status && (
                <Badge className={`ml-2 text-[10px] ${statusColor[accreditation.status] || ''}`}>
                  {accreditation.status === 'current' ? 'Current' : accreditation.status === 'expired' ? 'Expired' : 'Pending'}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete accreditation?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently remove this accreditation.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {accreditation.accreditationNumber && (
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded">#{accreditation.accreditationNumber}</span>
            )}
            {accreditation.issuingBody && <span>{accreditation.issuingBody}</span>}
            {accreditation.expiryDate && (
              <span className="flex items-center gap-0.5">
                <Calendar className="h-3 w-3" /> Exp: {new Date(accreditation.expiryDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccreditationFormDialog({ open, onOpenChange, installerId, accreditation, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; installerId: string; accreditation: Accreditation | null; onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [issuingBody, setIssuingBody] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [status, setStatus] = useState('current');
  const [images, setImages] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const { upload, isUploading } = useUpload();

  useEffect(() => {
    if (open) {
      setName(accreditation?.accreditationName || '');
      setNumber(accreditation?.accreditationNumber || '');
      setIssuingBody(accreditation?.issuingBody || '');
      setExpiryDate(accreditation?.expiryDate ? accreditation.expiryDate.split('T')[0] : '');
      setStatus(accreditation?.status || 'current');
      setImages((accreditation?.certificateImage as Attachment[]) || []);
    }
  }, [open, accreditation]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await upload(file);
      setImages([{ url, filename: file.name }]);
    } catch { toast.error('Upload failed'); }
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await saveInstallerAccreditation({
        id: accreditation?.id, installerId,
        accreditationName: name.trim(),
        accreditationNumber: number.trim() || null,
        certificateImage: images,
        issuingBody: issuingBody.trim() || null,
        expiryDate: expiryDate || null, status,
      });
      toast.success(accreditation ? 'Updated' : 'Accreditation added');
      onOpenChange(false); onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{accreditation ? 'Edit Accreditation' : 'Add Accreditation'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Accreditation Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. CEC Approved Solar Retailer" /></div>
          <div><Label>Accreditation Number</Label><Input value={number} onChange={e => setNumber(e.target.value)} placeholder="e.g. A1234567" /></div>
          <div><Label>Issuing Body</Label><Input value={issuingBody} onChange={e => setIssuingBody(e.target.value)} placeholder="e.g. Clean Energy Council" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Expiry Date</Label><Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} /></div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Certificate / Badge Image</Label>
            <div className="mt-1.5 space-y-2">
              {images.length > 0 ? (
                <div className="relative group w-full aspect-[3/2] rounded-lg overflow-hidden border">
                  <img src={images[0].url} alt={images[0].filename} className="w-full h-full object-contain bg-muted/30" />
                  <button
                    className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setImages([])}
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{isUploading ? 'Uploading...' : 'Upload image'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                </label>
              )}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || !name.trim() || isUploading} className="w-full">
            {saving ? 'Saving...' : accreditation ? 'Update' : 'Add Accreditation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
