import React from 'react';
import { Badge } from '@/components/ui/badge';

const COLOR_MAP = {
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  green: 'bg-green-100 text-green-700 border-green-300',
  blue: 'bg-blue-100 text-blue-700 border-blue-300',
  amber: 'bg-amber-100 text-amber-700 border-amber-300',
  orange: 'bg-orange-100 text-orange-700 border-orange-300',
  red: 'bg-red-100 text-red-700 border-red-300',
};

export default function ScoreGradeBadge({ grade, size = 'md' }) {
  if (!grade) return null;
  const cls = COLOR_MAP[grade.color] || COLOR_MAP.blue;
  const textSize = size === 'lg' ? 'text-sm px-3 py-1' : 'text-[10px]';
  return (
    <Badge variant="outline" className={`${cls} ${textSize} font-bold`}>
      {grade.letter} — {grade.label}
    </Badge>
  );
}

export function scoreColor(score) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}