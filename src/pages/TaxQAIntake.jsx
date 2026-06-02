import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileEdit, AlertTriangle } from 'lucide-react';
import TaxQAUploadForm from '../components/tax-qa/TaxQAUploadForm';
import TaxQAManualEntry from '../components/tax-qa/TaxQAManualEntry';
import TaxQARecentBatches from '../components/tax-qa/TaxQARecentBatches';

export default function TaxQAIntake() {
  const [refreshKey, setRefreshKey] = useState(0);
  const handleComplete = () => setRefreshKey(k => k + 1);

  // Fix mode: ?fix=<filing_id>
  const urlParams = new URLSearchParams(window.location.search);
  const fixFilingId = urlParams.get('fix') || '';

  const { data: fixFiling } = useQuery({
    queryKey: ['taxqa_fix_filing', fixFilingId],
    queryFn: async () => {
      const res = await base44.entities.TaxQA_Filing.filter({ id: fixFilingId });
      return res[0] || null;
    },
    enabled: !!fixFilingId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax QA Intake</h1>
        <p className="text-muted-foreground text-sm mt-1">อัปโหลดไฟล์ภาษีจาก PEAK หรือกรอกมือสำหรับ ภ.ง.ด.54 / ภ.พ.36</p>
      </div>

      {/* Fix mode banner */}
      {fixFiling && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <strong>โหมดแก้ไข:</strong> อัปโหลดไฟล์แก้ไขสำหรับใบที่ถูกตีกลับ (เวอร์ชันถัดไป)
            <br />
            <span className="text-xs">ใบเดิม: {fixFiling.form_type} งวด {fixFiling.tax_period} — {fixFiling.customer_name} (v{fixFiling.version || 1})</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload" className="gap-1.5"><Upload className="w-4 h-4" /> อัปโหลด Excel</TabsTrigger>
          {!fixFilingId && (
            <TabsTrigger value="manual" className="gap-1.5"><FileEdit className="w-4 h-4" /> กรอกมือ ภงด.54/ภพ.36</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <TaxQAUploadForm
            onParseComplete={handleComplete}
            fixFiling={fixFiling || null}
          />
        </TabsContent>

        {!fixFilingId && (
          <TabsContent value="manual" className="mt-4">
            <TaxQAManualEntry onSaveComplete={handleComplete} />
          </TabsContent>
        )}
      </Tabs>

      <TaxQARecentBatches key={refreshKey} />
    </div>
  );
}