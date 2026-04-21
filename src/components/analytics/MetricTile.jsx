import React from 'react';

export default function MetricTile({ label, value, hint, good, format = 'number' }) {
  const isGood = good === true;
  const isBad = good === false;
  const color = isGood ? 'text-emerald-600' : isBad ? 'text-red-600' : 'text-foreground';

  const displayValue = format === 'percent'
    ? `${Math.round(value * 100)}%`
    : format === 'decimal'
      ? (typeof value === 'number' ? value.toFixed(1) : value)
      : value;

  return (
    <div className="bg-muted/30 rounded-lg px-3 py-2.5 space-y-0.5">
      <p className="text-[10px] text-muted-foreground font-medium truncate">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{displayValue}</p>
      {hint && <p className="text-[9px] text-muted-foreground">{hint}</p>}
    </div>
  );
}