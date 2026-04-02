import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Send, Loader2, X, Upload, FileText, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ArticleForm({ open, onOpenChange, article, categories, currentUser, isManager, onSave, saving }) {
  const [form, setForm] = useState({
    title: '', category_id: '', content_type: '', summary: '',
    content: '', tags: [], drive_url: '', drive_file_name: '', tagInput: '',
    attachments: [],
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (article) {
      setForm({
        title: article.title || '',
        category_id: article.category_id || '',
        content_type: article.content_type || '',
        summary: article.summary || '',
        content: article.content || '',
        tags: article.tags || [],
        drive_url: article.drive_url || '',
        drive_file_name: article.drive_file_name || '',
        tagInput: '',
        attachments: article.attachments || [],
      });
    } else {
      setForm({ title: '', category_id: '', content_type: '', summary: '', content: '', tags: [], drive_url: '', drive_file_name: '', tagInput: '', attachments: [] });
    }
  }, [article, open]);

  const handleCategoryChange = (catId) => {
    const cat = categories.find(c => c.id === catId);
    setForm(f => ({ ...f, category_id: catId, content_type: cat?.slug || '' }));
  };

  const addTag = () => {
    const tag = form.tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm(f => ({ ...f, tags: [...f.tags, tag], tagInput: '' }));
    }
  };

  const removeTag = (tag) => {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));
  };

  const handleSubmit = (status) => {
    const cat = categories.find(c => c.id === form.category_id);
    const today = new Date().toISOString().split('T')[0];
    const data = {
      title: form.title,
      category_id: form.category_id,
      category_name: cat?.name || '',
      category_slug: cat?.slug || '',
      content_type: form.content_type || cat?.slug || '',
      summary: form.summary,
      content: form.content,
      tags: form.tags,
      drive_url: form.drive_url,
      drive_file_name: form.drive_file_name,
      attachments: form.attachments,
      status,
      author_email: article?.author_email || currentUser?.email,
      author_name: article?.author_name || currentUser?.full_name,
    };

    if (status === 'published') {
      data.published_by = currentUser?.email;
      data.published_by_name = currentUser?.full_name;
      data.published_at = new Date().toISOString();
      data.last_reviewed_date = today;
      data.last_reviewed_by = currentUser?.email;
      data.last_reviewed_by_name = currentUser?.full_name;
    }

    onSave(data, article?.id);
  };

  const isTemplate = form.content_type === 'template';

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await base44.functions.invoke('uploadKbFile', formData);
        if (res.data?.success) {
          setForm(f => ({
            ...f,
            attachments: [...f.attachments, {
              name: res.data.name,
              drive_url: res.data.drive_url,
              drive_file_id: res.data.drive_file_id,
              size: res.data.size,
            }],
          }));
          toast.success(`อัปโหลด "${res.data.name}" สำเร็จ`);
        } else {
          toast.error(res.data?.error || 'อัปโหลดไม่สำเร็จ');
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || 'เกิดข้อผิดพลาดในการอัปโหลด');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (index) => {
    setForm(f => ({ ...f, attachments: f.attachments.filter((_, i) => i !== index) }));
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{article ? 'แก้ไขบทความ' : 'เพิ่มบทความใหม่'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs">ชื่อบทความ *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="ชื่อบทความ" />
          </div>

          <div>
            <Label className="text-xs">หมวดหมู่ *</Label>
            <Select value={form.category_id} onValueChange={handleCategoryChange}>
              <SelectTrigger><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
              <SelectContent>
                {categories.filter(c => c.status === 'active').map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">สรุปสั้น</Label>
            <Textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={2} placeholder="สรุปสั้น 1-2 ประโยค แสดงใน card" />
          </div>

          <div>
            <Label className="text-xs">Tags</Label>
            <div className="flex gap-2">
              <Input
                value={form.tagInput}
                onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                placeholder="พิมพ์แล้วกด Enter"
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>เพิ่ม</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                    {tag}
                    <button onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {!isTemplate && (
            <div>
              <Label className="text-xs">เนื้อหา (Markdown)</Label>
              <Textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={12}
                placeholder="รองรับ Markdown: **bold**, ## หัวข้อ, - bullet"
                className="font-mono text-xs"
              />
            </div>
          )}

          {isTemplate && (
            <div>
              <Label className="text-xs">หมายเหตุ / วิธีใช้</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="รายละเอียดเพิ่มเติม" />
            </div>
          )}

          {/* File attachments */}
          <div>
            <Label className="text-xs">แนบไฟล์</Label>
            <div className="mt-1">
              <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed cursor-pointer hover:bg-muted/50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm text-muted-foreground">{uploading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์'}</span>
                <input type="file" className="hidden" multiple onChange={handleFileUpload} disabled={uploading} />
              </label>
              <p className="text-[10px] text-muted-foreground mt-1">ไฟล์จะถูกอัปโหลดไป Google Drive อัตโนมัติ</p>
            </div>
            {form.attachments.length > 0 && (
              <div className="space-y-1.5 mt-2">
                {form.attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border">
                    <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <a href={att.drive_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline truncate block">
                        {att.name}
                      </a>
                      {att.size > 0 && <p className="text-[10px] text-muted-foreground">{formatFileSize(att.size)}</p>}
                    </div>
                    <button onClick={() => removeAttachment(i)} className="text-red-400 hover:text-red-600 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
            <Button
              variant="secondary"
              onClick={() => handleSubmit('draft')}
              disabled={saving || !form.title || !form.category_id}
              className="gap-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึก Draft
            </Button>
            {!isManager ? (
              <Button
                onClick={() => handleSubmit('pending_review')}
                disabled={saving || !form.title || !form.category_id}
                className="gap-1"
              >
                <Send className="w-4 h-4" /> ส่งขออนุมัติ
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit('published')}
                disabled={saving || !form.title || !form.category_id}
                className="gap-1"
              >
                <Send className="w-4 h-4" /> Publish ทันที
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}