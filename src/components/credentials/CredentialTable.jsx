import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2, ExternalLink } from 'lucide-react';

const SERVICE_LABELS = {
  peak_account: { label: 'Peak Account', color: 'bg-purple-100 text-purple-700' },
  dbd: { label: 'DBD', color: 'bg-blue-100 text-blue-700' },
  efiling: { label: 'e-Filing', color: 'bg-green-100 text-green-700' },
  email: { label: 'Email', color: 'bg-orange-100 text-orange-700' },
  social_security: { label: 'ประกันสังคม', color: 'bg-teal-100 text-teal-700' },
  vat: { label: 'VAT', color: 'bg-red-100 text-red-700' },
  other: { label: 'อื่นๆ', color: 'bg-gray-100 text-gray-700' },
};

export default function CredentialTable({ data, onView, onEdit, onDelete }) {
  return (
    <div className="bg-card rounded-lg border overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b bg-muted/20">
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">ลูกค้า</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">บริการ</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hidden md:table-cell">Username</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hidden md:table-cell">Password</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground hidden lg:table-cell">URL</th>
            <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground w-28"></th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 && (
            <tr><td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">ไม่มีข้อมูล Credential</td></tr>
          )}
          {data.map(row => {
            const svc = SERVICE_LABELS[row.service_type] || SERVICE_LABELS.other;
            return (
              <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/10">
                <td className="px-3 py-2.5">
                  <p className="text-xs font-medium">{row.customer_name}</p>
                </td>
                <td className="px-3 py-2.5">
                  <Badge className={`text-[10px] border-0 ${svc.color}`}>
                    {row.service_type === 'other' && row.service_label ? row.service_label : svc.label}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <span className="text-xs font-mono text-muted-foreground">••••••••</span>
                </td>
                <td className="px-3 py-2.5 hidden md:table-cell">
                  <span className="text-xs font-mono text-muted-foreground">••••••••</span>
                </td>
                <td className="px-3 py-2.5 hidden lg:table-cell">
                  {row.url ? (
                    <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> {row.url.replace(/^https?:\/\//, '').slice(0, 30)}
                    </a>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onView(row)} title="ดู (OTP)">
                      <Eye className="w-3.5 h-3.5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(row)} title="แก้ไข">
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(row)} title="ลบ">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}