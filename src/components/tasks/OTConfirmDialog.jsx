import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Sun } from 'lucide-react';

/**
 * Popup ถามว่าเป็น OT หรือไม่ เมื่อเปลี่ยน status นอกเวลาทำงาน
 * onConfirm(isOT: boolean)
 */
export default function OTConfirmDialog({ open, onConfirm }) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            นอกเวลาทำงาน
          </DialogTitle>
          <DialogDescription>
            ขณะนี้อยู่นอกเวลาทำงานปกติ (09:00–18:00)<br />
            การเปลี่ยน status นี้เป็นการทำงานล่วงเวลา (OT) หรือไม่?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1 gap-1.5" onClick={() => onConfirm(false)}>
            <Sun className="w-4 h-4" />
            ไม่ใช่ OT
            <span className="text-[10px] text-muted-foreground ml-1">(นับเวลาปกติ)</span>
          </Button>
          <Button className="flex-1 gap-1.5 bg-amber-600 hover:bg-amber-700" onClick={() => onConfirm(true)}>
            <Clock className="w-4 h-4" />
            ใช่ เป็น OT
            <span className="text-[10px] text-amber-200 ml-1">(นับเวลาจริง)</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}