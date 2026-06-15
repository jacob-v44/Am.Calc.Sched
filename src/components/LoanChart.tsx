/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useId } from 'react';
import { AmortizationRow } from '../utils/solver';

interface LoanChartProps {
  rows: AmortizationRow[];
  loanAmount: number;
  totalInterest: number;
}

export default function LoanChart({ rows, loanAmount, totalInterest }: LoanChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const chartId = useId();

  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl text-zinc-400 text-sm">
        No active schedule to plot
      </div>
    );
  }

  // To avoid cluttering the chart, we can select at most ~60 data points (e.g., sample every N months)
  const totalMonths = rows.length;
  const sampleFreq = Math.max(1, Math.ceil(totalMonths / 60));
  
  const sampledRows: AmortizationRow[] = [];
  for (let i = 0; i < totalMonths; i++) {
    if (i % sampleFreq === 0 || i === totalMonths - 1) {
      sampledRows.push(rows[i]);
    }
  }

  const width = 600;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };

  const usableWidth = width - padding.left - padding.right;
  const usableHeight = height - padding.top - padding.bottom;

  // Find max values
  const maxVal = Math.max(loanAmount, loanAmount + totalInterest, ...rows.map(r => r.beginningBalance));

  // Compute coordinate mapping functions
  const getX = (index: number) => {
    return padding.left + (index / (sampledRows.length - 1)) * usableWidth;
  };

  const getY = (val: number) => {
    return padding.top + usableHeight - (val / maxVal) * usableHeight;
  };

  // Generate paths
  // 1. Remaining Balance Area Path
  let balancePoints = sampledRows.map((row, idx) => `${getX(idx)},${getY(row.beginningBalance)}`);
  // Append end coordinates to close the area path at the base
  const balanceAreaPath = balancePoints.length > 0
    ? `M${getX(0)},${getY(0)} L${balancePoints.join(' L')} L${getX(sampledRows.length - 1)},${getY(0)} Z`
    : '';

  const balanceLinePath = balancePoints.length > 0
    ? `M${balancePoints.join(' L')}`
    : '';

  // 2. Cumulative Interest Paid Line Path
  const interestPoints = sampledRows.map((row, idx) => `${getX(idx)},${getY(row.cumulativeInterest)}`);
  const interestLinePath = interestPoints.length > 0
    ? `M${interestPoints.join(' L')}`
    : '';

  // Formatter for axis values ($K or $M)
  const formatYAxis = (val: number) => {
    if (val >= 1000000) {
      return `$${(val / 1000000).toFixed(1)}M`;
    }
    if (val >= 1000) {
      return `$${(val / 1000).toFixed(0)}k`;
    }
    return `$${val}`;
  };

  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  const activeRow = hoveredIdx !== null ? sampledRows[hoveredIdx] : null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6" id={`loan-chart-container-${chartId}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Repayment &amp; Balance Profile
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Visualizing the amortization journey over {Math.round(totalMonths / 12)} years
          </p>
        </div>
        
        {/* Legends */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-indigo-500/20 border border-indigo-500" />
            <span className="text-zinc-600 dark:text-zinc-400">Remaining Balance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-amber-500 rounded-xs" />
            <span className="text-zinc-600 dark:text-zinc-400">Total Interest Paid</span>
          </div>
        </div>
      </div>

      <div className="relative w-full h-[240px]">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full overflow-visible font-mono text-[10px] select-none"
        >
          {/* Grid lines */}
          {yTicks.map((tick, idx) => {
            const y = getY(tick);
            return (
              <g key={idx}>
                <line 
                  x1={padding.left} 
                  y1={y} 
                  x2={width - padding.right} 
                  y2={y} 
                  className="stroke-zinc-100 dark:stroke-zinc-800/60" 
                  strokeDasharray={idx === 0 ? "0" : "4 4"}
                />
                <text 
                  x={padding.left - 8} 
                  y={y + 3} 
                  textAnchor="end" 
                  className="fill-zinc-400 dark:fill-zinc-600"
                >
                  {formatYAxis(tick)}
                </text>
              </g>
            );
          })}

          {/* X Axis label ticks (represented in Years) */}
          {Array.from({ length: 5 }).map((_, idx) => {
            const fraction = idx / 4;
            const sampledRowIdx = Math.round(fraction * (sampledRows.length - 1));
            const row = sampledRows[sampledRowIdx];
            if (!row) return null;
            const x = getX(sampledRowIdx);
            const yrs = Math.round(row.paymentNumber / 12);
            return (
              <g key={idx}>
                <line 
                  x1={x} 
                  y1={height - padding.bottom} 
                  x2={x} 
                  y2={height - padding.bottom + 4} 
                  className="stroke-zinc-200 dark:stroke-zinc-800"
                />
                <text 
                  x={x} 
                  y={height - padding.bottom + 16} 
                  textAnchor="middle" 
                  className="fill-zinc-400 dark:fill-zinc-600"
                >
                  {yrs > 0 ? `Yr ${yrs}` : 'Start'}
                </text>
              </g>
            );
          })}

          {/* Area under Remaining Balance */}
          {balanceAreaPath && (
            <path 
              d={balanceAreaPath} 
              className="fill-indigo-500/5 dark:fill-indigo-500/10 transition-all duration-300"
            />
          )}

          {/* Remaining Balance Line */}
          {balanceLinePath && (
            <path 
              d={balanceLinePath} 
              fill="none" 
              className="stroke-indigo-500 dark:stroke-indigo-400 transition-all duration-300" 
              strokeWidth="2"
            />
          )}

          {/* Cumulative Interest Line */}
          {interestLinePath && (
            <path 
              d={interestLinePath} 
              fill="none" 
              className="stroke-amber-500 dark:stroke-amber-400 transition-all duration-300" 
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
          )}

          {/* Invisible interactive bars for precise hovering */}
          {sampledRows.map((_, idx) => {
            const x = getX(idx);
            const barWidth = usableWidth / sampledRows.length;
            return (
              <rect
                key={idx}
                x={x - barWidth / 2}
                y={padding.top}
                width={barWidth}
                height={usableHeight}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}

          {/* Hover helper line & points */}
          {hoveredIdx !== null && (
            <g className="pointer-events-none">
              <line 
                x1={getX(hoveredIdx)} 
                y1={padding.top} 
                x2={getX(hoveredIdx)} 
                y2={height - padding.bottom} 
                className="stroke-zinc-300 dark:stroke-zinc-700" 
                strokeWidth="1"
              />
              <circle 
                cx={getX(hoveredIdx)} 
                cy={getY(sampledRows[hoveredIdx].beginningBalance)} 
                r="4.5" 
                className="fill-indigo-500 stroke-white dark:stroke-zinc-900" 
                strokeWidth="1.5"
              />
              <circle 
                cx={getX(hoveredIdx)} 
                cy={getY(sampledRows[hoveredIdx].cumulativeInterest)} 
                r="4.5" 
                className="fill-amber-500 stroke-white dark:stroke-zinc-900" 
                strokeWidth="1.5"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Hover Info Tooltip Bar */}
      <div className="h-12 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/40 rounded-xl px-4 text-xs">
        {activeRow ? (
          <div className="flex justify-between w-full text-zinc-600 dark:text-zinc-400 animate-fade-in">
            <span>
              <strong className="text-zinc-900 dark:text-zinc-200">Payment {activeRow.paymentNumber}</strong> ({activeRow.paymentDate.toLocaleString('default', { month: 'short', year: 'numeric' })})
            </span>
            <div className="flex gap-4">
              <span>
                Remaining Balance: <strong className="text-indigo-600 dark:text-indigo-400">${activeRow.beginningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
              <span>
                Cumulative Interest: <strong className="text-amber-600 dark:text-amber-400">${activeRow.cumulativeInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </span>
            </div>
          </div>
        ) : (
          <span className="text-zinc-400 dark:text-zinc-500 font-sans italic text-center">
            Hover or drag your cursor across the chart to view data details over time
          </span>
        )}
      </div>
    </div>
  );
}
