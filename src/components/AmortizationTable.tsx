/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { AmortizationRow, AmortizationSchedule } from '../utils/solver';
import { ChevronDown, ChevronRight, Download, Eye, Calendar, DollarSign, CalendarRange } from 'lucide-react';

interface AmortizationTableProps {
  schedule: AmortizationSchedule;
}

interface YearSummary {
  yearNumber: number;
  calendarYear: number;
  months: AmortizationRow[];
  startBalance: number;
  totalPaid: number;
  totalInterest: number;
  totalPrincipal: number;
  endBalance: number;
}

export default function AmortizationTable({ schedule }: AmortizationTableProps) {
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({ 1: true }); // Expand Year 1 by default
  const [monthlyPage, setMonthlyPage] = useState<number>(0);
  const rowsPerPage = 12;

  // Group columns year-by-year
  const yearlySummaries = useMemo<YearSummary[]>(() => {
    if (!schedule || schedule.rows.length === 0) return [];

    const summaries: YearSummary[] = [];
    let currentYearRows: AmortizationRow[] = [];
    let curYearNum = 1;

    schedule.rows.forEach((row, idx) => {
      currentYearRows.push(row);

      // Group every 12 months, or the absolute end
      if (currentYearRows.length === 12 || idx === schedule.rows.length - 1) {
        const startBalance = currentYearRows[0].beginningBalance;
        const totalPaid = currentYearRows.reduce((sum, r) => sum + r.monthlyPayment, 0);
        const totalInterest = currentYearRows.reduce((sum, r) => sum + r.interestPaid, 0);
        const totalPrincipal = currentYearRows.reduce((sum, r) => sum + r.principalPaid, 0);
        const endBalance = currentYearRows[currentYearRows.length - 1].endingBalance;
        const calendarYear = currentYearRows[0].paymentDate.getFullYear();

        summaries.push({
          yearNumber: curYearNum,
          calendarYear,
          months: currentYearRows,
          startBalance,
          totalPaid,
          totalInterest,
          totalPrincipal,
          endBalance,
        });

        currentYearRows = [];
        curYearNum++;
      }
    });

    return summaries;
  }, [schedule]);

  // Handle CSV export
  const exportToCSV = () => {
    if (!schedule || schedule.rows.length === 0) return;

    const headers = [
      'Payment Number',
      'Payment Date',
      'Beginning Balance ($)',
      'Monthly Payment ($)',
      'Principal Paid ($)',
      'Interest Paid ($)',
      'Ending Balance ($)',
      'Cumulative Principal ($)',
      'Cumulative Interest ($)'
    ];

    const csvRows = schedule.rows.map(row => [
      row.paymentNumber,
      `"${row.paymentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}"`,
      row.beginningBalance.toFixed(2),
      row.monthlyPayment.toFixed(2),
      row.principalPaid.toFixed(2),
      row.interestPaid.toFixed(2),
      row.endingBalance.toFixed(2),
      row.cumulativePrincipal.toFixed(2),
      row.cumulativeInterest.toFixed(2),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Amortization_Schedule_${schedule.rows.length}_months.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleYear = (yr: number) => {
    setExpandedYears(prev => ({
      ...prev,
      [yr]: !prev[yr]
    }));
  };

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const paginatedMonthlyRows = useMemo(() => {
    const start = monthlyPage * rowsPerPage;
    return schedule.rows.slice(start, start + rowsPerPage);
  }, [schedule, monthlyPage]);

  const maxPages = Math.ceil(schedule.rows.length / rowsPerPage);

  if (!schedule || schedule.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-100 dark:border-zinc-800/60 rounded-2xl">
        <CalendarRange className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Schedule Empty</h4>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-sm">
          Please fill in the calculator variables. A full scheduling timeline will automatically materialize here.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 rounded-2xl shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50">
        <div>
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            Amortization Table
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Full payback schedule broken down into {schedule.rows.length} equal installments
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5" role="group">
            <button
              id="view-yearly"
              type="button"
              onClick={() => setViewMode('yearly')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'yearly'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Yearly Summary
            </button>
            <button
              id="view-monthly"
              type="button"
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Monthly List
            </button>
          </div>

          {/* Export Button */}
          <button
            id="export-csv-btn"
            type="button"
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg transition-colors border border-indigo-200/40 dark:border-indigo-800/40 cursor-pointer"
            title="Download full schedule as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Yearly Summary View */}
      {viewMode === 'yearly' && (
        <div id="repayment-yearly-container" className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800/80 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider bg-zinc-50/20 dark:bg-zinc-900/20 font-sans">
                <th className="py-3 px-4 w-12 text-center"></th>
                <th className="py-3 px-4">Year</th>
                <th className="py-3 px-4 text-right">Start Balance</th>
                <th className="py-3 px-4 text-right">Total Payment</th>
                <th className="py-3 px-4 text-right">Principal Paid</th>
                <th className="py-3 px-4 text-right">Interest Paid</th>
                <th className="py-3 px-4 text-right">End Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-mono text-xs text-zinc-600 dark:text-zinc-300">
              {yearlySummaries.map((summary) => {
                const isExpanded = !!expandedYears[summary.yearNumber];
                return (
                  <g key={summary.yearNumber} className="group/year">
                    {/* Year Header Row */}
                    <tr 
                      id={`yearly-row-${summary.yearNumber}`}
                      onClick={() => toggleYear(summary.yearNumber)}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer text-zinc-900 dark:text-zinc-200 font-medium"
                    >
                      <td className="py-3 px-4 text-center">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500 inline" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 inline" />
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans font-semibold">
                        Year {summary.yearNumber} <span className="text-zinc-400 dark:text-zinc-500 font-normal">({summary.calendarYear})</span>
                      </td>
                      <td className="py-3 px-4 text-right">{formatter.format(summary.startBalance)}</td>
                      <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 font-semibold">{formatter.format(summary.totalPaid)}</td>
                      <td className="py-3 px-4 text-right">{formatter.format(summary.totalPrincipal)}</td>
                      <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-500">{formatter.format(summary.totalInterest)}</td>
                      <td className="py-3 px-4 text-right">{formatter.format(summary.endBalance)}</td>
                    </tr>

                    {/* Expandable monthly list for the selected year */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="p-0 bg-zinc-50/30 dark:bg-zinc-900/30">
                          <div className="overflow-x-auto border-l-2 border-indigo-500/40 ml-4 py-2 pr-4 pl-2 my-1">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="border-b border-zinc-100 dark:border-zinc-800/60 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-sans">
                                  <th className="py-1.5 px-3">Mo.</th>
                                  <th className="py-1.5 px-3">Date</th>
                                  <th className="py-1.5 px-3 text-right">Beginning Balance</th>
                                  <th className="py-1.5 px-3 text-right">Payment</th>
                                  <th className="py-1.5 px-3 text-right">Principal</th>
                                  <th className="py-1.5 px-3 text-right">Interest</th>
                                  <th className="py-1.5 px-3 text-right">Remaining</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100/50 dark:divide-zinc-850 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                                {summary.months.map((m) => (
                                  <tr key={m.paymentNumber} className="hover:bg-zinc-100/35 dark:hover:bg-zinc-800/20">
                                    <td className="py-1.5 px-3 text-zinc-400">{m.paymentNumber}</td>
                                    <td className="py-1.5 px-3 text-zinc-600 dark:text-zinc-300 font-sans">
                                      {m.paymentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="py-1.5 px-3 text-right">{formatter.format(m.beginningBalance)}</td>
                                    <td className="py-1.5 px-3 text-right font-medium text-zinc-700 dark:text-zinc-300">{formatter.format(m.monthlyPayment)}</td>
                                    <td className="py-1.5 px-3 text-right">{formatter.format(m.principalPaid)}</td>
                                    <td className="py-1.5 px-3 text-right text-amber-600/90 dark:text-amber-500/90">{formatter.format(m.interestPaid)}</td>
                                    <td className="py-1.5 px-3 text-right">{formatter.format(m.endingBalance)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </g>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Monthly Paginated View */}
      {viewMode === 'monthly' && (
        <div id="repayment-monthly-container" className="flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800/80 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider bg-zinc-50/20 dark:bg-zinc-900/20 font-sans">
                  <th className="py-3 px-4 w-16">Pmt #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Beginning Balance</th>
                  <th className="py-3 px-4 text-right">Payment</th>
                  <th className="py-3 px-4 text-right">Principal</th>
                  <th className="py-3 px-4 text-right">Interest</th>
                  <th className="py-3 px-4 text-right">Ending Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 font-mono text-xs text-zinc-650 dark:text-zinc-350">
                {paginatedMonthlyRows.map((m) => (
                  <tr key={m.paymentNumber} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                    <td className="py-3 px-4 text-zinc-400 text-center">{m.paymentNumber}</td>
                    <td className="py-3 px-4 font-sans font-medium text-zinc-800 dark:text-zinc-200">
                      {m.paymentDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4 text-right">{formatter.format(m.beginningBalance)}</td>
                    <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 font-semibold">{formatter.format(m.monthlyPayment)}</td>
                    <td className="py-3 px-4 text-right">{formatter.format(m.principalPaid)}</td>
                    <td className="py-3 px-4 text-right text-amber-600 dark:text-amber-500">{formatter.format(m.interestPaid)}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatter.format(m.endingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Simple Pagination Footer */}
          <div className="flex items-center justify-between gap-4 p-4 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/20 dark:bg-zinc-900/10 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">
              Showing <strong className="font-semibold text-zinc-900 dark:text-zinc-250">{monthlyPage * rowsPerPage + 1}-{Math.min(schedule.rows.length, (monthlyPage + 1) * rowsPerPage)}</strong> of <strong className="font-semibold text-zinc-900 dark:text-zinc-250">{schedule.rows.length}</strong> months
            </span>

            <div className="flex items-center gap-2">
              <button
                id="prev-page-btn"
                type="button"
                disabled={monthlyPage === 0}
                onClick={() => setMonthlyPage(p => p - 1)}
                className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold rounded-lg text-zinc-650 dark:text-zinc-400 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                Previous
              </button>
              <button
                id="next-page-btn"
                type="button"
                disabled={monthlyPage >= maxPages - 1}
                onClick={() => setMonthlyPage(p => p + 1)}
                className="px-3.5 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold rounded-lg text-zinc-650 dark:text-zinc-400 transition-colors disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
