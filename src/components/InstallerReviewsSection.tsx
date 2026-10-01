import { useState, useEffect, useCallback } from 'react';
import {
  listInstallerReviews, saveInstallerReview, deleteInstallerReview,
  ListInstallerReviewsOutputType,
} from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Checkbox } from '@project/components/ui/checkbox';
import { Badge } from '@project/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@project/components/ui/alert-dialog';
import { Plus, Star, Trash2, Pencil, ExternalLink, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type Review = ListInstallerReviewsOutputType['reviews'][0];

export default function InstallerReviewsSection({ installerId }: { installerId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Review | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await listInstallerReviews({ installerId }); setReviews(r.reviews); }
    finally { setLoading(false); }
  }, [installerId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await deleteInstallerReview({ id });
    toast.success('Review deleted');
    load();
  };

  const avgRating = reviews.filter(r => r.rating).length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.filter(r => r.rating).length).toFixed(1)
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Reviews</h4>
          {avgRating && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {avgRating} ({reviews.length})
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Review
        </Button>
      </div>

      {loading ? (
        <div className="h-12 bg-muted animate-pulse rounded" />
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground py-3">No reviews yet.</p>
      ) : (
        <div className="space-y-2">
          {reviews.map(r => (
            <ReviewCard key={r.id} review={r}
              onEdit={() => { setEditItem(r); setShowForm(true); }}
              onDelete={() => handleDelete(r.id)}
            />
          ))}
        </div>
      )}

      <ReviewFormDialog
        open={showForm} onOpenChange={setShowForm}
        installerId={installerId} review={editItem} onSaved={load}
      />
    </div>
  );
}

function ReviewCard({ review, onEdit, onDelete }: { review: Review; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="border rounded-lg p-3 bg-card space-y-1.5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{review.title}</span>
            {review.verified && (
              <Badge variant="outline" className="text-[10px] gap-0.5 text-emerald-600 border-emerald-200">
                <ShieldCheck className="h-3 w-3" /> Verified
              </Badge>
            )}
          </div>
          {review.rating != null && review.rating > 0 && (
            <div className="flex items-center gap-0.5 mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating! ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
              ))}
            </div>
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
                <AlertDialogTitle>Delete review?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently remove this review.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {review.reviewText && <p className="text-sm text-muted-foreground line-clamp-3">{review.reviewText}</p>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {review.reviewerName && <span>By {review.reviewerName}</span>}
        {review.sourceName && (
          review.sourceUrl ? (
            <a href={review.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
              {review.sourceName} <ExternalLink className="h-2.5 w-2.5" />
            </a>
          ) : <span>{review.sourceName}</span>
        )}
        {review.reviewDate && <span>{new Date(review.reviewDate).toLocaleDateString()}</span>}
      </div>
    </div>
  );
}

function ReviewFormDialog({ open, onOpenChange, installerId, review, onSaved }: {
  open: boolean; onOpenChange: (o: boolean) => void; installerId: string; review: Review | null; onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewerName, setReviewerName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [reviewDate, setReviewDate] = useState('');
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(review?.title || '');
      setRating(review?.rating || 0);
      setReviewText(review?.reviewText || '');
      setReviewerName(review?.reviewerName || '');
      setSourceUrl(review?.sourceUrl || '');
      setSourceName(review?.sourceName || '');
      setReviewDate(review?.reviewDate ? review.reviewDate.split('T')[0] : '');
      setVerified(review?.verified || false);
    }
  }, [open, review]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await saveInstallerReview({
        id: review?.id, installerId, title: title.trim(),
        rating: rating || null, reviewText: reviewText.trim() || null,
        reviewerName: reviewerName.trim() || null,
        sourceUrl: sourceUrl.trim() || null, sourceName: sourceName.trim() || null,
        reviewDate: reviewDate || null, verified,
      });
      toast.success(review ? 'Review updated' : 'Review added');
      onOpenChange(false); onSaved();
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{review ? 'Edit Review' : 'Add Review'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div>
            <Label>Rating</Label>
            <div className="flex gap-1 mt-1">
              {[1,2,3,4,5].map(i => (
                <button key={i} onClick={() => setRating(rating === i ? 0 : i)} className="p-0.5">
                  <Star className={`h-6 w-6 cursor-pointer transition-colors ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30 hover:text-amber-300'}`} />
                </button>
              ))}
            </div>
          </div>
          <div><Label>Review Text</Label><Textarea value={reviewText} onChange={e => setReviewText(e.target.value)} rows={3} /></div>
          <div><Label>Reviewer Name</Label><Input value={reviewerName} onChange={e => setReviewerName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Source Name</Label><Input value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="e.g. Google Reviews" /></div>
            <div><Label>Source URL</Label><Input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." /></div>
          </div>
          <div><Label>Review Date</Label><Input type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} /></div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={verified} onCheckedChange={v => setVerified(v === true)} />
            <span className="text-sm">Verified review</span>
          </label>
          <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full">
            {saving ? 'Saving...' : review ? 'Update' : 'Add Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
