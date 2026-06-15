/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  solveLoan, 
  generateSchedule, 
  LoanInputs, 
  SolvedResults, 
  AmortizationSchedule 
} from './utils/solver';
import LoanChart from './components/LoanChart';
import AmortizationTable from './components/AmortizationTable';
import { 
  Calculator, 
  CalendarRange, 
  RotateCcw, 
  Sun, 
  Moon, 
  Sparkles, 
  CheckCircle2, 
  Info, 
  DollarSign, 
  Percent, 
  Calendar, 
  CreditCard,
  HelpCircle,
  TrendingDown
} from 'lucide-react';

export default function App() {
  // Theme state: defaults to light mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('amortization_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Current screen state: 'calculator' or 'schedule'
  const [activeTab, setActiveTab] = useState<'calculator' | 'schedule'>('calculator');

  // Core form inputs state
  const [inputs, setInputs] = useState<LoanInputs>({
    purchasePrice: '',
    downPaymentPct: '',
    downPaymentAmt: '',
    loanAmount: '',
    interestRate: '',
    loanTerm: '',
    monthlyPayment: '',
  });

  // Load theme side-effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('amortization_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('amortization_theme', 'light');
    }
  }, [isDarkMode]);

  // Solver logic run on every state change
  const solved: SolvedResults = useMemo(() => {
    return solveLoan(inputs);
  }, [inputs]);

  // Try to generate schedule if we are fully solved!
  const schedule: AmortizationSchedule | null = useMemo(() => {
    if (
      solved.isFullySolved && 
      solved.loanAmount !== null && 
      solved.interestRate !== null && 
      solved.loanTerm !== null && 
      solved.monthlyPayment !== null
    ) {
      return generateSchedule(
        solved.loanAmount,
        solved.interestRate,
        solved.loanTerm,
        solved.monthlyPayment,
        new Date()
      );
    }
    return null;
  }, [solved]);

  // Handles updating a single input field
  const handleInputChange = (key: keyof LoanInputs, rawValue: string) => {
    // Basic filter to prevent non-numeric characters except decimals, commas and percentiles
    let cleanVal = rawValue.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point in numbers
    const parts = cleanVal.split('.');
    if (parts.length > 2) {
      cleanVal = parts[0] + '.' + parts.slice(1).join('');
    }

    setInputs(prev => ({
      ...prev,
      [key]: cleanVal
    }));
  };

  // Pre-load the user's specific MVP example
  const loadExample = () => {
    setInputs({
      purchasePrice: '420000',
      downPaymentPct: '20',
      downPaymentAmt: '',
      loanAmount: '',
      interestRate: '6',
      loanTerm: '30',
      monthlyPayment: '',
    });
    setActiveTab('calculator');
  };

  // Reset/Clear everything back to empty
  const resetForm = () => {
    setInputs({
      purchasePrice: '',
      downPaymentPct: '',
      downPaymentAmt: '',
      loanAmount: '',
      interestRate: '',
      loanTerm: '',
      monthlyPayment: '',
    });
    setActiveTab('calculator');
  };

  // Helper formats
  const formatDollar = (val: number | null) => {
    if (val === null) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formatPercentage = (val: number | null) => {
    if (val === null) return '--';
    return `${val.toFixed(2)}%`;
  };

  const getSourceBadgeText = (key: keyof LoanInputs) => {
    const src = solved.sources[key];
    if (src === 'user') return 'Entered';
    if (src === 'calc') return 'Calculated';
    return null;
  };

  // Check how many variables are missing
  const missingCoreVariables = useMemo(() => {
    const missing: string[] = [];
    const pKnown = solved.loanAmount !== null;
    const rKnown = solved.interestRate !== null;
    const tKnown = solved.loanTerm !== null;
    const mKnown = solved.monthlyPayment !== null;

    if (!pKnown) missing.push('Loan Amount / Principal');
    if (!rKnown) missing.push('Interest Rate');
    if (!tKnown) missing.push('Loan Term');
    if (!mKnown) missing.push('Monthly Payment');

    return missing;
  }, [solved]);

  return (
    <div className={`min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-zinc-800 dark:text-zinc-200 transition-colors`}>
      {/* Upper Navigation/Header Layout */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-100 dark:border-zinc-800/80 transition-all px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-md shadow-indigo-600/10">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 id="app-title-header" className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                Amortization Calculator
              </h1>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                Professional Loan Payment &amp; Scheduling Suite
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Quick pre-fill template */}
            <button
              id="pref-init-btn"
              type="button"
              onClick={loadExample}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Load Example</span>
            </button>

            {/* Global Reset */}
            <button
              id="clear-form-btn"
              type="button"
              onClick={resetForm}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-500 dark:text-zinc-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            {/* Standard Light / Dark mode slider */}
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">
        {/* State Overview Progress Banner */}
        <div className="w-full">
          {solved.errorMsg ? (
            <div id="solver-critical-error" className="flex items-start gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/50 rounded-2xl">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Calculation Error</h4>
                <p className="text-xs mt-0.5">{solved.errorMsg}</p>
              </div>
            </div>
          ) : solved.isFullySolved ? (
            <div id="solver-complete-banner" className="flex flex-wrap items-center justify-between gap-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/50 rounded-2xl">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold">Equation Balanced &amp; Solved</h4>
                  <p className="text-xs mt-0.5">
                    All financial fields derived cleanly. You can now scrutinize full monthly payments and amortization schedules.
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/30">
                Principal &amp; Interest Only
              </div>
            </div>
          ) : (
            <div id="solver-missing-banner" className="flex items-start gap-3 p-4 bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/80 rounded-2xl">
              <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Smart Equation Solver Active</h4>
                <p className="text-xs mt-0.5">
                  The calculator requires at least <strong className="font-semibold text-zinc-900 dark:text-white">three</strong> of the 4 core variables to solve the standard mortgage formula. 
                  Missing: <span className="underline decoration-dotted font-medium">{missingCoreVariables.join(', ')}</span>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Home & Amortization Section Tabs */}
        {solved.isFullySolved && (
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <button
              id="tab-calculator-select"
              onClick={() => setActiveTab('calculator')}
              className={`pb-4 px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'calculator'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Interactive Calculator</span>
            </button>
            <button
              id="tab-schedule-select"
              onClick={() => setActiveTab('schedule')}
              className={`pb-4 px-6 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'schedule'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <CalendarRange className="w-4 h-4" />
              <span>Amortization Schedule</span>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full border border-indigo-200/40 font-mono">
                {schedule?.rows.length || 0}m
              </span>
            </button>
          </div>
        )}

        {/* View Layout Tabs Condition */}
        {activeTab === 'calculator' || !solved.isFullySolved ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input fields panel - occupies Left Col */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex flex-col gap-6">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  1. Enter Loan Details
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Fill in parameters. Any values left blank will be solved automatically if enough other inputs exist.
                </p>
              </div>

              {/* Form Fields Stack */}
              <div className="flex flex-col gap-4 font-mono">
                {/* 1. Purchase Price */}
                <div id="field-purchasePrice-container" className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-sans">
                    Purchase Price
                  </span>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-400"><DollarSign className="w-3.5 h-3.5" /></span>
                    <input
                      id="input-purchase-price"
                      type="text"
                      className={`w-full pl-8 pr-16 py-2.5 text-sm rounded-xl border font-semibold outline-none transition-all ${
                        solved.sources.purchasePrice === 'calc'
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-250 dark:border-indigo-900/85'
                          : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-700 focus:border-indigo-500'
                      }`}
                      placeholder={solved.purchasePrice ? solved.purchasePrice.toFixed(2) : "0.00"}
                      value={inputs.purchasePrice}
                      onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
                    />
                    {getSourceBadgeText('purchasePrice') && (
                      <span className={`absolute right-3 text-[10px] px-2 py-0.5 rounded-md font-sans font-bold border ${
                        solved.sources.purchasePrice === 'calc'
                          ? 'bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-500 border-indigo-200 dark:border-indigo-850'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {getSourceBadgeText('purchasePrice')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Down Payment Side-by-Side Flex Box */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 2. Down Payment % */}
                  <div id="field-downPaymentPct-container" className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-sans">
                      Down Payment %
                    </span>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-zinc-400"><Percent className="w-3.5 h-3.5" /></span>
                      <input
                        id="input-down-payment-pct"
                        type="text"
                        className={`w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border font-semibold outline-none transition-all ${
                          solved.sources.downPaymentPct === 'calc'
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-250 dark:border-indigo-900/85'
                            : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-700 focus:border-indigo-500'
                        }`}
                        placeholder={solved.downPaymentPct ? solved.downPaymentPct.toFixed(1) : "0.0"}
                        value={inputs.downPaymentPct}
                        onChange={(e) => handleInputChange('downPaymentPct', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 3. Down Payment Amount */}
                  <div id="field-downPaymentAmt-container" className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-sans">
                      Down Payment $
                    </span>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-zinc-400"><DollarSign className="w-3.5 h-3.5" /></span>
                      <input
                        id="input-down-payment-amt"
                        type="text"
                        className={`w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border font-semibold outline-none transition-all ${
                          solved.sources.downPaymentAmt === 'calc'
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-250 dark:border-indigo-900/85'
                            : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-700 focus:border-indigo-500'
                        }`}
                        placeholder={solved.downPaymentAmt ? solved.downPaymentAmt.toFixed(2) : "0.00"}
                        value={inputs.downPaymentAmt}
                        onChange={(e) => handleInputChange('downPaymentAmt', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Loan Amount (Principal) */}
                <div id="field-loanAmount-container" className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-sans">
                    Loan Amount (Principal)
                  </span>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-400"><DollarSign className="w-3.5 h-3.5" /></span>
                    <input
                      id="input-loan-amount"
                      type="text"
                      className={`w-full pl-8 pr-16 py-2.5 text-sm rounded-xl border font-semibold outline-none transition-all ${
                        solved.sources.loanAmount === 'calc'
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-250 dark:border-indigo-900/85'
                          : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-700 focus:border-indigo-500'
                      }`}
                      placeholder={solved.loanAmount ? solved.loanAmount.toFixed(2) : "0.00"}
                      value={inputs.loanAmount}
                      onChange={(e) => handleInputChange('loanAmount', e.target.value)}
                    />
                    {getSourceBadgeText('loanAmount') && (
                      <span className={`absolute right-3 text-[10px] px-2 py-0.5 rounded-md font-sans font-bold border ${
                        solved.sources.loanAmount === 'calc'
                          ? 'bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-500 border-indigo-200 dark:border-indigo-850'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {getSourceBadgeText('loanAmount')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* 5. Interest Rate % */}
                  <div id="field-interestRate-container" className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-sans">
                      Interest Rate % (APR)
                    </span>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-zinc-400"><Percent className="w-3.5 h-3.5" /></span>
                      <input
                        id="input-interest-rate"
                        type="text"
                        className={`w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border font-semibold outline-none transition-all ${
                          solved.sources.interestRate === 'calc'
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-250 dark:border-indigo-900/85'
                            : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-700 focus:border-indigo-500'
                        }`}
                        placeholder={solved.interestRate ? solved.interestRate.toFixed(2) : "0.00"}
                        value={inputs.interestRate}
                        onChange={(e) => handleInputChange('interestRate', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* 6. Loan Term in Years */}
                  <div id="field-loanTerm-container" className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-sans">
                      Loan Term (Years)
                    </span>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-zinc-400"><Calendar className="w-3.5 h-3.5" /></span>
                      <input
                        id="input-loan-term"
                        type="text"
                        className={`w-full pl-8 pr-3 py-2.5 text-sm rounded-xl border font-semibold outline-none transition-all ${
                          solved.sources.loanTerm === 'calc'
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-250 dark:border-indigo-900/85'
                            : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-700 focus:border-indigo-500'
                        }`}
                        placeholder={solved.loanTerm ? solved.loanTerm.toFixed(0) : "0"}
                        value={inputs.loanTerm}
                        onChange={(e) => handleInputChange('loanTerm', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 7. Monthly Payment */}
                <div id="field-monthlyPayment-container" className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-zinc-550 dark:text-zinc-400 uppercase tracking-wider font-sans">
                    Monthly Payment
                  </span>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-zinc-400"><CreditCard className="w-3.5 h-3.5" /></span>
                    <input
                      id="input-monthly-payment"
                      type="text"
                      className={`w-full pl-8 pr-16 py-2.5 text-sm rounded-xl border font-semibold outline-none transition-all ${
                        solved.sources.monthlyPayment === 'calc'
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border-indigo-250 dark:border-indigo-900/85'
                          : 'bg-zinc-50 dark:bg-zinc-800/40 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-850 hover:border-zinc-350 dark:hover:border-zinc-700 focus:border-indigo-500'
                      }`}
                      placeholder={solved.monthlyPayment ? solved.monthlyPayment.toFixed(2) : "0.00"}
                      value={inputs.monthlyPayment}
                      onChange={(e) => handleInputChange('monthlyPayment', e.target.value)}
                    />
                    {getSourceBadgeText('monthlyPayment') && (
                      <span className={`absolute right-3 text-[10px] px-2 py-0.5 rounded-md font-sans font-bold border ${
                        solved.sources.monthlyPayment === 'calc'
                          ? 'bg-indigo-100/60 dark:bg-indigo-900/40 text-indigo-500 border-indigo-200 dark:border-indigo-850'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                      }`}>
                        {getSourceBadgeText('monthlyPayment')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Cards (Grid Columns) - occupies 7 Layout Rows */}
            <div className="lg:col-span-7 flex flex-col gap-6 w-full">
              {/* Cards Grid Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Monthly Payment Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Monthly Installment</span>
                    <strong id="result-monthly-payment" className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1 font-mono">
                      {formatDollar(solved.monthlyPayment)}
                    </strong>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5 italic">
                      Principal &amp; Interest Payment Only
                    </span>
                  </div>
                </div>

                {/* 2. Loan Principal Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex items-start gap-4">
                  <div className="p-3 bg-zinc-100 dark:bg-zinc-800/40 text-zinc-650 dark:text-zinc-400 rounded-xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Loan Principal</span>
                    <strong id="result-loan-amount" className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1 font-mono">
                      {formatDollar(solved.loanAmount)}
                    </strong>
                    {solved.purchasePrice !== null && solved.downPaymentAmt !== null && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                        {formatPercentage(solved.downPaymentPct)} down payment
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Total Interest Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex items-start gap-4">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-650 dark:text-amber-400 rounded-xl">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Total Interest Paid</span>
                    <strong id="result-total-interest" className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1 font-mono">
                      {schedule ? formatDollar(schedule.totalInterestPaid) : '--'}
                    </strong>
                    <span className="text-[10px] text-zinc-405 mt-0.5 text-zinc-400 dark:text-zinc-500 font-semibold font-mono">
                      {schedule && solved.loanAmount ? `${((schedule.totalInterestPaid / solved.loanAmount) * 100).toFixed(0)}% of principal` : '--'}
                    </span>
                  </div>
                </div>

                {/* 4. Total Amount Paid Card */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex items-start gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Total Loan Cost</span>
                    <strong id="result-total-paid" className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mt-1 font-mono">
                      {schedule ? formatDollar(schedule.totalCost) : '--'}
                    </strong>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium mt-0.5">
                      Principal + Interest paid
                    </span>
                  </div>
                </div>
              </div>

              {/* Fully Solved Interactive Chart / Static Placeholder details */}
              {solved.isFullySolved && schedule ? (
                <div className="flex flex-col gap-6 animate-fade-in">
                  <LoanChart 
                    rows={schedule.rows} 
                    loanAmount={solved.loanAmount!} 
                    totalInterest={schedule.totalInterestPaid} 
                  />
                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Estimated Payoff Date:
                    </span>
                    <span id="result-payoff-date" className="text-sm font-bold text-zinc-800 dark:text-zinc-200 font-mono">
                      {schedule.payoffDate ? schedule.payoffDate.toLocaleString('default', { month: 'long', year: 'numeric' }) : '--'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl h-full min-h-[280px]">
                  <HelpCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-700/80 mb-4 stroke-[1.5]" />
                  <h3 className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
                    Awaiting Solver Completion
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 max-w-sm leading-relaxed">
                    Once you input enough fields, a complete mortgage chart and remaining balance line graph will populate this space immediately.
                  </p>
                  <button
                    id="pref-init-body-btn"
                    onClick={loadExample}
                    className="mt-6 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md cursor-pointer transition-colors"
                  >
                    Load Standard Mortgage Demo
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-fade-in">
            {schedule && (
              <AmortizationTable schedule={schedule} />
            )}
          </div>
        )}
      </main>

      {/* Footer credits and details */}
      <footer className="w-full border-t border-zinc-100 dark:border-zinc-900 py-6 mt-12 bg-white/50 dark:bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            Amortization Calculator Applet. Calculation outputs represents Principal and Interest Payment Only.
          </p>
        </div>
      </footer>
    </div>
  );
}
