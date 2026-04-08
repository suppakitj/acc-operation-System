import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export default function TaxCalendarInfo() {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-4 space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground">กฎเกณฑ์การยื่นออนไลน์</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• <b>ภ.ง.ด.1/2/3/53/54, ภ.พ.36</b> — ภายในวันที่ 15 ของเดือนถัดไป</p>
          <p>• <b>ภ.พ.30, ภ.ธ.40</b> — ภายในวันที่ 23 ของเดือนถัดไป</p>
          <p>• <b>ประกันสังคม (e-Payment)</b> — ภายในวันที่ 25 ของเดือนถัดไป</p>
          <p className="font-semibold mt-2">งานรายปี (สิ้นรอบ 31 ธ.ค.):</p>
          <p>• <b>ภ.ง.ด.50</b> — ภายใน 150 วันหลังสิ้นรอบบัญชี (~30 พ.ค.)</p>
          <p>• <b>ภ.ง.ด.51</b> — ภายใน 2 เดือนหลังครึ่งปี (~31 ส.ค.)</p>
          <p>• <b>ยื่นงบ DBD</b> — ภายใน 5 เดือนหลังสิ้นรอบ (~31 พ.ค.)</p>
          <p>• <b>บอจ.5</b> — ภายใน 14 วันหลังประชุมผู้ถือหุ้น (~14 พ.ค.)</p>
          <p>• <b>Disclosure Form (สบช.3)</b> — ภายใน 150 วันหลังสิ้นรอบ (~30 พ.ค.)</p>
          <p className="text-amber-600 mt-1">* หากกำหนดยื่นตรงกับวันหยุดราชการ/เสาร์/อาทิตย์ จะเลื่อนไปวันทำการถัดไป</p>
          <p className="text-blue-600">
            ข้อมูลอ้างอิง:{' '}
            <a href="https://www.rd.go.th/62348.html" target="_blank" rel="noopener noreferrer" className="underline">
              ปฏิทินภาษีอากร กรมสรรพากร
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}