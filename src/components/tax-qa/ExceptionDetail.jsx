import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, CheckCircle2, XCircle, ShieldAlert, AlertTriangle, Loader2, Send, FileCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function ExceptionDetail({ filing, canApprove, canResubmit, userEmail, onBack }) {
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [overrideFlag, setOverrideFlag] = useState(null);
  const [overrideNote, setOverrideNote] = useState('');
  const queryClient = useQueryClient();

  const { data: flags = [], refetch: refetchFlags } = useQuery({
    queryKey: ['taxqa_flags', filing.id],
    queryFn: () => base44.entities.TaxQA_ExceptionFlag.filter({ filing_id: filing.id }, '-created_date', 200),
  });

  const { data: lineItems = [] } = useQuery({
    queryKey: ['taxqa_lines', filing.id],
    queryFn: () => base44.entities.TaxQA_LineItem.filter({ filing_id: filing.id }, 'seq_in_file', 500),
  });

  const { data: currentFiling } = useQuery({
    queryKey: ['taxqa_filing_detail', filing.id],
    queryFn: async () => {
      const res = await base44.entities.TaxQA_Filing.filter({ id: filing.id });
      return res[0] || filing;
    },
  });

  const f = currentFiling || filing;
  const openErrors = flags.filter(fl => fl.severity === 'error' && fl.status === 'open');
  const openWarnings = flags.filter(fl => fl.severity === 'warning' && fl.status === 'open');
  const isPreparer = f.prepared_by === userEmail;

  const callAction = async (actionName, payload) => {
    setBusy(true);
    const res = await base44.functions.invoke('taxqaReview', { action: actionName, ...payload });
    setBusy(false);
    if (res.data.error) {
      toast.error(res.data.error);
      return false;
    }
    return true;
  };

  const handleOpenReview = async () => {
    if (await callAction('open_review', { filing_id: f.id })) {
      toast.success('เปิดตรวจ exception แล้ว');
      queryClient.invalidateQueries({ queryKey: ['taxqa_filing_detail', f.id] });
    }
  };

  const handleApprove = async () => {
    if (await callAction('approve_exception', { filing_id: f.id })) {
      toast.success('อนุมัติ filing แล้ว');
      onBack();
    }
  };

  const handleReject = async () => {
    if (await callAction('reject_exception', { filing_id: f.id, rejection_note: rejectNote })) {
      toast.success('ตีกลับแล้ว');
      setRejectOpen(false);
      onBack();
    }
  };

  const handleOverride = async () => {
    if (!overrideFlag) return;
    if (await callAction('override_flag', { flag_id: overrideFlag.id, resolution_note: overrideNote })) {
      toast.success('Override flag แล้ว');
      setOverrideFlag(null);
      setOverrideNote('');
      refetchFlags();
    }
  };

  const handleResubmit = async () => {
    if (await callAction('resubmit', { filing_id: f.id })) {
      toast.success('ส่งตรวจใหม่แล้ว');
      onBack();
    }
  };

  const handleMarkFiled = async () => {
    if (await callAction('mark_filed', { filing_id: f.id })) {
      toast.success('ยืนยันยื่นแล้ว');
      onBack();
    }
  };

  const handleRevalidate = async () => {
    setBusy(true);
    const res = await base44.functions.invoke('taxqaValidate', { filing_id: f.id, is_revalidation: true });
    setBusy(false);
    if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      toast.success(`ตรวจซ้ำเสร็จ: ${res.data.errors || 0} error, ${res.data.warnings || 0} warning`);
      refetchFlags();
      queryClient.invalidateQueries({ queryKey: ['taxqa_filing_detail', f.id] });
      queryClient.invalidateQueries({ queryKey: ['taxqa_filings_exception'] });
    }
  };

  // Group line items by cert_no for WHT, or show flat for VAT
  const isWht = ['PND1', 'PND3', 'PND53', 'PND54'].includes(f.form_type);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />กลับ</Button>
        <h2 className="text-lg font-bold">{f.form_type} — {f.customer_name}</h2>
        <Badge variant="outline">{f.tax_period}</Badge>
        <Badge className={f.status === 'rejected' ? 'bg-red-100 text-red-700' : f.status === 'under_review' ? 'bg-amber-100 text-amber-700' : f.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
          {f.status}
        </Badge>
      </div>

      {/* Filing Header Info */}
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><span className="text-muted-foreground">ผู้จัดทำ:</span> {f.prepared_by_name || f.prepared_by || '-'}</div>
          <div><span className="text-muted-foreground">ผู้ตรวจ:</span> {f.reviewed_by_name || f.reviewed_by || '-'}</div>
          <div><span className="text-muted-foreground">ยอดภาษี:</span> {f.header_total_tax != null ? Number(f.header_total_tax).toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}</div>
          <div><span className="text-muted-foreground">จำนวนรายการ:</span> {f.line_count || lineItems.length}</div>
        </CardContent>
      </Card>

      {/* Rejection note */}
      {f.status === 'rejected' && f.rejection_note && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          <strong>เหตุผลที่ตีกลับ:</strong> {f.rejection_note}
        </div>
      )}

      {/* Exception Flags */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            Exception Flags ({flags.length})
            {openErrors.length > 0 && <Badge className="bg-red-100 text-red-700">{openErrors.length} error</Badge>}
            {openWarnings.length > 0 && <Badge className="bg-amber-100 text-amber-700">{openWarnings.length} warning</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {flags.length === 0 ? (
            <p className="text-sm text-muted-foreground">ไม่มี flag</p>
          ) : (
            <div className="space-y-2">
              {flags.map(fl => (
                <div key={fl.id} className={`border rounded-lg p-3 ${fl.status === 'open' ? (fl.severity === 'error' ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50') : 'border-green-200 bg-green-50'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={fl.severity === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>{fl.severity}</Badge>
                        <span className="text-xs font-mono text-muted-foreground">{fl.rule_code}</span>
                        <Badge variant="outline" className="text-xs">{fl.status}</Badge>
                      </div>
                      <p className="text-sm">{fl.message}</p>
                      {fl.status === 'overridden' && (
                        <p className="text-xs text-green-700 mt-1">Override โดย {fl.resolved_by_name || fl.resolved_by}: {fl.resolution_note}</p>
                      )}
                    </div>
                    {fl.status === 'open' && canApprove && f.status === 'under_review' && (
                      <Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={() => { setOverrideFlag(fl); setOverrideNote(''); }}>
                        Override
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line Items (compact) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">รายการ ({lineItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {lineItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">ไม่มีรายการ</p>
          ) : (
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-1 pr-2">#</th>
                    {isWht ? (
                      <>
                        <th className="pb-1 pr-2">เลขหนังสือรับรอง</th>
                        <th className="pb-1 pr-2">ผู้รับ</th>
                        <th className="pb-1 pr-2">ประเภทเงินได้</th>
                        <th className="pb-1 pr-2 text-right">ฐานภาษี</th>
                        <th className="pb-1 pr-2 text-right">ภาษีหัก</th>
                        <th className="pb-1 text-right">อัตรา %</th>
                      </>
                    ) : (
                      <>
                        <th className="pb-1 pr-2">เลขใบกำกับ</th>
                        <th className="pb-1 pr-2">คู่ค้า</th>
                        <th className="pb-1 pr-2 text-right">ฐาน VAT 7%</th>
                        <th className="pb-1 pr-2 text-right">VAT</th>
                        <th className="pb-1 text-right">รวม</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((li, idx) => (
                    <tr key={li.id} className="border-b last:border-0">
                      <td className="py-1 pr-2 text-muted-foreground">{li.seq_in_file || idx + 1}</td>
                      {isWht ? (
                        <>
                          <td className="py-1 pr-2 font-mono">{li.cert_no || '-'}</td>
                          <td className="py-1 pr-2">{li.payee_name || '-'}</td>
                          <td className="py-1 pr-2">{li.income_desc || '-'}</td>
                          <td className="py-1 pr-2 text-right font-mono">{li.tax_base != null ? Number(li.tax_base).toLocaleString() : '-'}</td>
                          <td className="py-1 pr-2 text-right font-mono">{li.wht_amount != null ? Number(li.wht_amount).toLocaleString() : '-'}</td>
                          <td className="py-1 text-right">{li.wht_rate != null ? li.wht_rate : '-'}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-1 pr-2 font-mono">{li.tax_invoice_no || '-'}</td>
                          <td className="py-1 pr-2">{li.counterparty_name || '-'}</td>
                          <td className="py-1 pr-2 text-right font-mono">{li.vat7_base != null ? Number(li.vat7_base).toLocaleString() : '-'}</td>
                          <td className="py-1 pr-2 text-right font-mono">{li.vat_amount != null ? Number(li.vat_amount).toLocaleString() : '-'}</td>
                          <td className="py-1 text-right font-mono">{li.total_incl_vat != null ? Number(li.total_incl_vat).toLocaleString() : '-'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Reviewer: open review if flagged */}
        {canApprove && f.status === 'flagged' && (
          <Button className="gap-1.5" onClick={handleOpenReview} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            เปิดตรวจ
          </Button>
        )}

        {/* Reviewer: approve exception */}
        {canApprove && f.status === 'under_review' && (
          <>
            <Button className="gap-1.5 bg-green-600 hover:bg-green-700" onClick={handleApprove} disabled={busy || openErrors.length > 0}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              อนุมัติ
            </Button>
            <Button variant="destructive" className="gap-1.5" onClick={() => setRejectOpen(true)} disabled={busy}>
              <XCircle className="w-4 h-4" />ตีกลับ
            </Button>
            {openErrors.length > 0 && (
              <span className="text-xs text-red-600">ต้อง override error flag ทั้งหมดก่อนอนุมัติ</span>
            )}
          </>
        )}

        {/* Re-validate (for validating or flagged or under_review) */}
        {canApprove && ['validating', 'flagged', 'under_review'].includes(f.status) && (
          <Button variant="outline" className="gap-1.5" onClick={handleRevalidate} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            ตรวจซ้ำ
          </Button>
        )}

        {/* Preparer: resubmit if rejected */}
        {canResubmit && isPreparer && f.status === 'rejected' && (
          <Button className="gap-1.5" onClick={handleResubmit} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            ส่งตรวจใหม่
          </Button>
        )}

        {/* Mark filed */}
        {canApprove && f.status === 'approved' && (
          <Button className="gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={handleMarkFiled} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            ยืนยันยื่นแล้ว
          </Button>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>ตีกลับ Filing</DialogTitle></DialogHeader>
          <Textarea placeholder="เหตุผลที่ตีกลับ..." value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>ยกเลิก</Button>
            <Button variant="destructive" onClick={handleReject} disabled={busy || !rejectNote.trim()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}ตีกลับ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={!!overrideFlag} onOpenChange={(v) => { if (!v) setOverrideFlag(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Override Flag: {overrideFlag?.rule_code}</DialogTitle></DialogHeader>
          <div className="text-sm mb-2 bg-muted p-2 rounded">{overrideFlag?.message}</div>
          <Textarea placeholder="เหตุผลที่ override..." value={overrideNote} onChange={e => setOverrideNote(e.target.value)} rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideFlag(null)}>ยกเลิก</Button>
            <Button onClick={handleOverride} disabled={busy || !overrideNote.trim()}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}