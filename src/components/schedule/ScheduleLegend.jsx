import React from 'react';

const LEGEND_ITEMS = [
  { key: 'client_visit', label: 'Client Visit', color: 'bg-blue-500' },
  { key: 'office', label: 'Office', color: 'bg-green-500' },
  { key: 'leave', label: 'Leave', color: 'bg-red-500' },
  { key: 'meeting', label: 'Meeting', color: 'bg-purple-500' },
  { key: 'fieldwork', label: 'Fieldwork', color: 'bg-orange-500' },
  { key: 'wfh', label: 'Work from Home', color: 'bg-teal-500' },
  { key: 'other', label: 'Other', color: 'bg-gray-400' },
];

export default function ScheduleLegend() {
  return (
    <div className="flex flex-wrap gap-4">
      {LEGEND_ITEMS.map(item => (
        <div key={item.key} className="flex items-center gap-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export const TYPE_DOT_COLORS = {
  client_visit: 'bg-blue-500',
  office: 'bg-green-500',
  leave: 'bg-red-500',
  meeting: 'bg-purple-500',
  fieldwork: 'bg-orange-500',
  wfh: 'bg-teal-500',
  other: 'bg-gray-400',
};

export const TYPE_BG_COLORS = {
  client_visit: 'bg-blue-50 border-l-2 border-blue-400',
  office: 'bg-green-50 border-l-2 border-green-400',
  leave: 'bg-red-50 border-l-2 border-red-400',
  meeting: 'bg-purple-50 border-l-2 border-purple-400',
  fieldwork: 'bg-orange-50 border-l-2 border-orange-400',
  wfh: 'bg-teal-50 border-l-2 border-teal-400',
  other: 'bg-gray-50 border-l-2 border-gray-300',
};