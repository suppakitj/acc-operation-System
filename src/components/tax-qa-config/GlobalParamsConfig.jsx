import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

const GLOBAL_FIELDS = [
  { key: 'vat_rate', label: 'VAT Rate (%)', type: 'number', default: '7' },
  { key: 'input_vat_carryforward_months', label: 'Input VAT Carryforward (เดือน)', type: 'number', default: '6' },
  { key: 'amount_tolerance', label: 'Amount Tolerance (บาท)', type: 'number', default: '1' },
  { key: 'revenue_match_warning_pct', label: 'Revenue Match Warning (%)', type: 'number', default: '20' },
  { key: 'juristic_tax_id_prefix', label: 'Juristic Tax ID Prefix', type: 'text', default: '0' },
];

export default function GlobalParamsConfig({ user }) {
  const qc = useQueryClient();
  const [formData, setFormData] = useState({});

  // Fetch the GLOBAL_PARAMS rule
  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['validation_rules_global'],
    queryFn: () => base44.entities.TaxQA_ValidationRule.filter({ rule_code: 'GLOBAL_PARAMS' }, '-created_date', 1),
  });

  const rule = rules[0];

  useEffect(() => {
    if (rule?.parameters) {
      setFormData(rule.parameters);
    } else {
      // Set defaults
      const defaults = {};
      GLOBAL_FIELDS.forEach(f => { defaults[f.key] = f.default; });
      setFormData(defaults);
    }
  }, [rule]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const params = {};
      GLOBAL_FIELDS.forEach(f => {
        params[f.key] = f.type === 'number' ? parseFloat(formData[f.key]) || 0 : formData[f.key] || '';
      });

      if (rule) {
        await base44.entities.TaxQA_ValidationRule.update(rule.id, { parameters: params });
      } else {
        await base44.entities.TaxQA_ValidationRule.create({
          rule_code: 'GLOBAL_PARAMS',
          form_type: 'ALL',
          description: 'พารามิเตอร์ทั่วไปของระบบตรวจ',
          rule_category: 'structural',
          parameters: params,
          active: true,
        });
      }

      await base44.entities.AuditLog.create({
        action: 'update', entity_type: 'TaxQA_ValidationRule',
        entity_id: rule?.id || 'new',
        user_email: user?.email, user_name: user?.full_name,
        details: `แก้ไข GLOBAL_PARAMS: ${JSON.stringify(params)}`,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['validation_rules_global'] }); toast.success('บันทึกพารามิเตอร์แล้ว'); },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Global Parameters</CardTitle>
        <CardDescription>พารามิเตอร์ที่ใช้ทั่วทั้งระบบ validation</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-4 text-muted-foreground">กำลังโหลด...</p>
        ) : (
          <div className="space-y-4 max-w-md">
            {GLOBAL_FIELDS.map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-sm">{f.label}</Label>
                <Input
                  type={f.type}
                  value={formData[f.key] ?? f.default}
                  onChange={e => setFormData({ ...formData, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              <Save className="w-4 h-4 mr-1" />{saveMut.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}