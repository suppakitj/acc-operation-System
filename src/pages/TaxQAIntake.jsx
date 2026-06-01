import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileEdit } from 'lucide-react';
import TaxQAUploadForm from '../components/tax-qa/TaxQAUploadForm';
import TaxQAManualEntry from '../components/tax-qa/TaxQAManualEntry';
import TaxQARecentBatches from '../components/tax-qa/TaxQARecentBatches';

export default function TaxQAIntake() {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleComplete = () => setRefreshKey(k => k + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax QA Intake</h1>
        <p className="text-muted-foreground text-sm mt-1">อัปโหลดไฟล์ภาษีจาก PEAK หรือกรอกมือสำหรับ ภ.ง.ด.54 / ภ.พ.36</p>
      </div>

      <Tabs defaultValue="upload">
        <TabsList>
          <TabsTrigger value="upload" className="gap-1.5"><Upload className="w-4 h-4" /> อัปโหลด Excel</TabsTrigger>
          <TabsTrigger value="manual" className="gap-1.5"><FileEdit className="w-4 h-4" /> กรอกมือ ภงด.54/ภพ.36</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-4">
          <TaxQAUploadForm onParseComplete={handleComplete} />
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <TaxQAManualEntry onSaveComplete={handleComplete} />
        </TabsContent>
      </Tabs>

      <TaxQARecentBatches key={refreshKey} />
    </div>
  );
}