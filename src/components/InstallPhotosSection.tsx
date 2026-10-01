import { useState, useEffect, useCallback } from 'react';
import {
  listInstallPhotos, saveInstallPhoto, deleteInstallPhoto,
  ListInstallPhotosOutputType,
} from 'zitejs/api';
import { useUpload } from 'zitejs/upload';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@project/components/ui/alert-dialog';
import { Plus, Trash2, Pencil, ImagePlus, X, MapPin, Calendar } from 'lucide-react';
import { toast } from 'sonner';

type PhotoEntry = ListInstallPhotosOutputType['photos'][0];
type Attachment = { url: string; filename: string };

export default function InstallPhotosSection({ installerId }: { installerId: string }) {
  const [entries, setEntries] = useState<PhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<PhotoEntry | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listInstallPhotos({ installerId }); setEntries(r.photos); }
    finally { setLoading(false); }
  }, [installerId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteInstallPhoto({ id });
    toast.success('Photo entry deleted');
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Install Photos & Examples</h4>
        <Button size="sm" variant="outline" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Photos
        </Button>
      </div>

      {loading ? (
        <div className="h-24 bg-muted animate-pulse rounded" />
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3">No install photos yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {entries.map(e => (
            <PhotoCard key={e.id} entry={e}
              onEdit={() => { setEditItem(e); setShowForm(true); }}
              onDelete={() => handleDelete(e.id)}
            />
          ))}
        </div>
      )}

      <PhotoFormDialog
        open={showForm} onOpenChange={setShowForm}
        installerId={installerId} entry={editItem} onSaved={load}
      />
    </div>
  );
}

function PhotoCard({ entry, onEdit, onDelete }: { entry: PhotoEntry; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {entry.photos.length > 0 && (
        <div className="grid grid-cols-2 gap-0.5 max-h-48 overflow-hidden">
          {entry.photos.slice(0, 4).map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="block aspect-video overflow-hidden">
              <img src={p.url} alt={p.filename} className="w-full h-full object-cover hover:scale-105 transition-transform" />
            </a>
          ))}
        </div>
      )}
      <div className="p-3 space-y-1">
        <div className="flex items-start justify-between">
          <div>
            <span className="font-medium text-sm">{entry.caption}</span>
            {entry.projectType && <span className="text-xs text-muted-foreground ml-2">({entry.projectType})</span>}
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"><Trash2 className="h-3 w-3" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete these photos.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        {entry.description && <p className="text-xs text-muted-foreground line-clamp-2">{entry.description}</p>}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {entry.location && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{entry.location}</span>}
          {entry.installDate && <span className="flex items-center gap-0.5"><Calendar className="h-3 w-3" />{new Date(entry.installDate).toLocaleDateString()}</span>}
        </div>
      </div>
    </div>
  );
}

function PhotoFormDialog({ open, onOpenChange, installerId, entry, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; installerId: string; entry: PhotoEntry | null; onSaved: () => void;
}) {
  const [caption, setCaption] = useState('');
  const [projectType, setProjectType] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [saving, setSaving] = useState(false);
  const { upload, isUploading } = useUpload();

  useEffect(() => {
    if (open) {
      setCaption(entry?.caption || '');
      setProjectType(entry?.projectType || '');
      setLocation(entry?.location || '');
      setDescription(entry?.description || '');
      setInstallDate(entry?.installDate ? entry.installDate.split('T')[0] : '');
      setPhotos((entry?.photos as Attachment[]) || []);
    }
  }, [open, entry]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        const { url } = await upload(file);
        setPhotos(prev => [...prev, { url, filename: file.name }]);
      } catch { toast.error(`Failed to upload ${file.name}`); }
    }
    e.target.value = '';
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!caption.trim()) return;
    setSaving(true);
    try {
      await saveInstallPhoto({
        id: entry?.id, installerId, caption: caption.trim(), photos,
        projectType: projectType.trim() || null, location: location.trim() || null,
        description: description.trim() || null, installDate: installDate || null,
      });
      toast.success(entry ? 'Updated' : 'Photos added');
      onOpenChange(false); onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{entry ? 'Edit Photos' : 'Add Install Photos'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Caption *</Label><Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. 10kW System Install — Residential" /></div>
          <div><Label>Project Type</Label><Input value={projectType} onChange={e => setProjectType(e.target.value)} placeholder="e.g. Residential, Commercial" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Location</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Brisbane" /></div>
            <div><Label>Install Date</Label><Input type="date" value={installDate} onChange={e => setInstallDate(e.target.value)} /></div>
          </div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>

          <div>
            <Label>Photos</Label>
            <div className="mt-1.5 space-y-2">
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border">
                      <img src={p.url} alt={p.filename} className="w-full h-full object-cover" />
                      <button
                        className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removePhoto(i)}
                      >
                        <X className="h-3.5 w-3.5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                <ImagePlus className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{isUploading ? 'Uploading...' : 'Upload photos'}</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
              </label>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || !caption.trim() || isUploading} className="w-full">
            {saving ? 'Saving...' : entry ? 'Update' : 'Add Photos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
