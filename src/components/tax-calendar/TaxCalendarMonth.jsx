import React from 'react';
import { format, differenceInDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const CATEGORY_LABEL = {
  withholding_tax: 'ภาษีหัก ณ ที่จ่าย',
  vat: 'ภาษีมูลค่าเพิ่ม',
  sbt: 'ภาษีธุรกิจเฉพาะ',
  sso: 'ประกันสังคม',
  annual_cit: 'ภาษีนิติบุคคลรายปี',
  annual_filing: 'งานยื่นรายปี',
};

export const CATEGORY_COLOR = {
  withholding_tax: 'bg-blue-50 text-blue-700 border-blue-200',
  vat: 'bg-green-50 text-green-700 border-green-200',
  sbt: 'bg-purple-50 text-purple-700 border-purple-200',
  sso: 'bg-teal-50 text-teal-700 border-teal-200',
  annual_cit: 'bg-orange-50 text-orange-700 border-orange-200',
  annual_filing: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function TaxCalendarMonth({ month, year, items, monthLabel }) {
  const sorted = [...items].sort((a, b) => a.deadline.localeCompare(b.deadline) || (a.tax_label || '').localeCompare(b.tax_label || ''));

  return (
    <Card className="shadow-sm border">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold">
          รอบ {monthLabel} {year + 543}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="py-1.5 text-[10px] font-semibold text-muted-foreground">ประเภท</th>
              <th className="py-1.5 text-[10px] font-semibold text-muted-foreground">หมวด</th>
              <th className="py-1.5 text-[10px] font-semibold text-muted-foreground text-center">กำหนดยื่น</th>
              <th className="py-1.5 text-[10px] font-semibold text-muted-foreground text-center hidden sm:table-cell">สถานะ</th>
              <th className="py-1.5 text-[10px] font-semibold text-muted-foreground hidden md:table-cell">หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(d => {
              const daysLeft = differenceInDays(new Date(d.deadline), new Date());
              const isPast = daysLeft < 0;
              const isToday = daysLeft === 0;
              const isUrgent = daysLeft > 0 && daysLeft <= 3;
              const isSoon = daysLeft > 3 && daysLeft <= 7;

              return (
                <tr key={d.id || `${d.tax_type}_${d.for_month}`} className={`border-b last:border-b-0 ${isPast ? 'opacity-40' : ''}`}>
                  <td className="py-2 text-xs font-medium">{d.tax_label}</td>
                  <td className="py-2">
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${CATEGORY_COLOR[d.category] || ''}`}>
                      {CATEGORY_LABEL[d.category] || d.category}
                    </Badge>
                  </td>
                  <td className="py-2 text-center">
                    <span className={`text-xs font-mono font-medium ${
                      isToday ? 'text-red-600 font-bold' : isUrgent ? 'text-red-600' : isSoon ? 'text-amber-600' : ''
                    }`}>
                      {format(new Date(d.deadline), 'd MMM yy', { locale: th })}
                    </span>
                    {d.was_shifted && <span className="text-[9px] text-amber-500 ml-1">*</span>}
                  </td>
                  <td className="py-2 text-center hidden sm:table-cell">
                    {isPast ? (
                      <Badge variant="outline" className="text-[9px] bg-gray-50 text-gray-400">ผ่านแล้ว</Badge>
                    ) : isToday ? (
                      <Badge variant="outline" className="text-[9px] bg-red-100 text-red-700 border-red-300">วันนี้!</Badge>
                    ) : isUrgent ? (
                      <Badge variant="outline" className="text-[9px] bg-red-50 text-red-600 border-red-200">อีก {daysLeft} วัน</Badge>
                    ) : isSoon ? (
                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-600 border-amber-200">อีก {daysLeft} วัน</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] bg-green-50 text-green-600">อีก {daysLeft} วัน</Badge>
                    )}
                  </td>
                  <td className="py-2 text-[10px] text-muted-foreground hidden md:table-cell">
                    {d.was_shifted ? <span className="text-amber-600">⚠ {d.shift_reason} (เดิม: วันที่ {d.original_day})</span> : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}