import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';

const PRESETS = ['ค่าเดินทาง', 'ค่าโรงแรม', 'ค่าอากรแสตมป์', 'ค่าจดทะเบียน', 'ค่าธรรมเนียม', 'อื่นๆ'];

export default function ExtraCostEditor({ items = [], onChange }) {
  const addItem = (label = '') => {
    onChange([...items, { label, amount: 0 }]);
  };

  const updateItem = (idx, field, value) => {
    const next = items.map((item, i) => i === idx ? { ...item, [field]: value } : item);
    onChange(next);
  };

  const removeItem = (idx) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={item.label}
            onChange={e => updateItem(idx, 'label', e.target.value)}
            placeholder="ชื่อรายการ"
            className="flex-1 h-8 text-xs"
          />
          <Input
            type="number"
            min={0}
            step="0.01"
            value={item.amount || ''}
            onChange={e => updateItem(idx, 'amount', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="w-28 h-8 text-xs text-right"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeItem(idx)}>
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}

      {/* Quick-add presets */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.filter(p => !items.some(i => i.label === p)).map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => addItem(preset)}
            className="text-[10px] px-2 py-1 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + {preset}
          </button>
        ))}
        <button
          type="button"
          onClick={() => addItem('')}
          className="text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3 h-3 inline mr-0.5" />เพิ่มรายการ
        </button>
      </div>
    </div>
  );
}