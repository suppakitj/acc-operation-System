import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Save, Send, Loader2, X } from 'lucide-react';

export default function ArticleForm({ open, onOpenChange, article, categories, currentUser, isManager, onSave, saving }) {
  const [form, setForm] = useState({
    title: '', category_id: '', content_type: '', summary: '',
    content: '', tags: [], drive_url: '', drive_file_name: '', tagInput: '',
  });

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
      });
    } else {
      setForm({ title: '', category_id: '', content_type: '', summary: '', content: '', tags: [], drive_url: '', drive_file_name: '', tagInput: '' });
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
            <>
              <div>
                <Label className="text-xs">Google Drive URL *</Label>
                <Input value={form.drive_url} onChange={e => setForm(f => ({ ...f, drive_url: e.target.value }))} placeholder="https://drive.google.com/..." />
              </div>
              <div>
                <Label className="text-xs">ชื่อไฟล์</Label>
                <Input value={form.drive_file_name} onChange={e => setForm(f => ({ ...f, drive_file_name: e.target.value }))} placeholder="เช่น แบบฟอร์ม ภ.พ.30.xlsx" />
              </div>
              <div>
                <Label className="text-xs">หมายเหตุ / วิธีใช้</Label>
                <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4} placeholder="รายละเอียดเพิ่มเติม" />
              </div>
            </>
          )}

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