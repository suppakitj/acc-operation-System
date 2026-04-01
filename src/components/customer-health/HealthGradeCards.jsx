import React from 'react';
import { cn } from '@/lib/utils';
import { GRADE_CONFIG } from '@/lib/customerHealth';

const GRADE_STYLES = {
  A: 'bg-green-50 border-green-300 text-green-700',
  B: 'bg-teal-50 border-teal-300 text-teal-700',
  C: 'bg-yellow-50 border-yellow-300 text-yellow-700',
  D: 'bg-orange-50 border-orange-300 text-orange-700',
  F: 'bg-red-50 border-red-300 text-red-700',
};

const GRADE_BG = {
  A: 'bg-green-500',
  B: 'bg-teal-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  F: 'bg-red-500',
};

export default function HealthGradeCards({ gradeCounts, activeGrade, onGradeClick }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {['A', 'B', 'C', 'D', 'F'].map(grade => {
        const cfg = GRADE_CONFIG[grade];
        const count = gradeCounts[grade] || 0;
        const isActive = activeGrade === grade;
        return (
          <div
            key={grade}
            onClick={() => onGradeClick(isActive ? 'all' : grade)}
            className={cn(
              "rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md",
              GRADE_STYLES[grade],
              isActive && "ring-2 ring-offset-1 ring-current shadow-md"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className={cn("text-xl font-black px-2 py-0.5 rounded-md text-white", GRADE_BG[grade])}>
                {grade}
              </span>
              <span className="text-2xl font-bold">{count}</span>
            </div>
            <p className="text-xs font-semibold">{cfg.label}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{cfg.description}</p>
          </div>
        );
      })}
    </div>
  );
}