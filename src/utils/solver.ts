/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LoanInputs {
  purchasePrice: string; // From input fields (can be empty string)
  downPaymentPct: string;
  downPaymentAmt: string;
  loanAmount: string;
  interestRate: string;
  loanTerm: string;
  monthlyPayment: string;
}

export interface SolvedResults {
  purchasePrice: number | null;
  downPaymentPct: number | null;
  downPaymentAmt: number | null;
  loanAmount: number | null;
  interestRate: number | null;
  loanTerm: number | null;
  monthlyPayment: number | null;
  
  // Sources tell whether a variable was entered by the user or calculated
  sources: {
    purchasePrice: 'user' | 'calc' | 'none';
    downPaymentPct: 'user' | 'calc' | 'none';
    downPaymentAmt: 'user' | 'calc' | 'none';
    loanAmount: 'user' | 'calc' | 'none';
    interestRate: 'user' | 'calc' | 'none';
    loanTerm: 'user' | 'calc' | 'none';
    monthlyPayment: 'user' | 'calc' | 'none';
  };
  
  errorMsg: string | null;
  isFullySolved: boolean;
}

export interface AmortizationRow {
  paymentNumber: number;
  paymentDate: Date;
  beginningBalance: number;
  monthlyPayment: number;
  principalPaid: number;
  interestPaid: number;
  endingBalance: number;
  cumulativeInterest: number;
  cumulativePrincipal: number;
}

export interface AmortizationSchedule {
  rows: AmortizationRow[];
  totalInterestPaid: number;
  totalPrincipalPaid: number;
  totalCost: number;
  payoffDate: Date | null;
}

/**
 * Solves for interest rate given P, Term, and M using Bisection method.
 * We want to find APR such that computed monthly payment is M.
 */
export function solveInterestRate(P: number, Term: number, M: number): number | null {
  const n = Term * 12;
  // If payment total is less than principal, interest rate is <= 0
  if (M * n <= P) {
    return 0;
  }

  let low = 0;
  let high = 200; // supports up to 200% APR
  let mid = 0;
  
  for (let iter = 0; iter < 60; iter++) {
    mid = (low + high) / 2;
    const r_mid = mid / 100 / 12;
    let calcM = 0;
    if (r_mid === 0) {
      calcM = P / n;
    } else {
      calcM = P * (r_mid * Math.pow(1 + r_mid, n)) / (Math.pow(1 + r_mid, n) - 1);
    }

    if (calcM > M) {
      high = mid; // Interest is too high, decrease range
    } else {
      low = mid; // Interest is too low, increase range
    }
  }

  return Math.round(mid * 10000) / 10000; // Round to 4 decimal places
}

/**
 * Solves for missing variables in the loan setup.
 * Uses iterative propagation rules for Purchase Price, Down Payment and Loan Amount,
 * combined with the four-way core amortization formula.
 */
export function solveLoan(inputs: LoanInputs): SolvedResults {
  // Extract user values
  const r: SolvedResults = {
    purchasePrice: inputs.purchasePrice !== '' ? parseFloat(inputs.purchasePrice) : null,
    downPaymentPct: inputs.downPaymentPct !== '' ? parseFloat(inputs.downPaymentPct) : null,
    downPaymentAmt: inputs.downPaymentAmt !== '' ? parseFloat(inputs.downPaymentAmt) : null,
    loanAmount: inputs.loanAmount !== '' ? parseFloat(inputs.loanAmount) : null,
    interestRate: inputs.interestRate !== '' ? parseFloat(inputs.interestRate) : null,
    loanTerm: inputs.loanTerm !== '' ? parseFloat(inputs.loanTerm) : null,
    monthlyPayment: inputs.monthlyPayment !== '' ? parseFloat(inputs.monthlyPayment) : null,
    sources: {
      purchasePrice: inputs.purchasePrice !== '' ? 'user' : 'none',
      downPaymentPct: inputs.downPaymentPct !== '' ? 'user' : 'none',
      downPaymentAmt: inputs.downPaymentAmt !== '' ? 'user' : 'none',
      loanAmount: inputs.loanAmount !== '' ? 'user' : 'none',
      interestRate: inputs.interestRate !== '' ? 'user' : 'none',
      loanTerm: inputs.loanTerm !== '' ? 'user' : 'none',
      monthlyPayment: inputs.monthlyPayment !== '' ? 'user' : 'none',
    },
    errorMsg: null,
    isFullySolved: false,
  };

  // Convert negative or NaN values safely to null
  const keys: (keyof Omit<SolvedResults, 'sources' | 'errorMsg' | 'isFullySolved'>)[] = [
    'purchasePrice', 'downPaymentPct', 'downPaymentAmt', 'loanAmount', 'interestRate', 'loanTerm', 'monthlyPayment'
  ];
  for (const k of keys) {
    if (r[k] !== null && (isNaN(r[k] as number) || (r[k] as number) < 0)) {
      r[k] = null;
      r.sources[k] = 'none';
    }
  }

  // Iteratively propagate known info to unknown info (run up to 4 times to ensure convergence across scopes)
  for (let pass = 0; pass < 5; pass++) {
    let changed = false;

    // --- SUB-SYSTEM 1: Purchase Price, Down Payment Pct, Down Payment Amt, Loan Amount ---
    
    // Rule: Down Payment Amount = Purchase Price * Pct / 100
    if (r.purchasePrice !== null && r.downPaymentPct !== null && r.downPaymentAmt === null) {
      r.downPaymentAmt = r.purchasePrice * (r.downPaymentPct / 100);
      r.sources.downPaymentAmt = 'calc';
      changed = true;
    }

    // Rule: Down Payment Pct = (Amt / Price) * 100
    if (r.purchasePrice !== null && r.downPaymentAmt !== null && r.purchasePrice > 0 && r.downPaymentPct === null) {
      r.downPaymentPct = (r.downPaymentAmt / r.purchasePrice) * 100;
      r.sources.downPaymentPct = 'calc';
      changed = true;
    }

    // Rule: Loan Amount = Purchase Price - Down Payment Amt
    if (r.purchasePrice !== null && r.downPaymentAmt !== null && r.loanAmount === null) {
      r.loanAmount = r.purchasePrice - r.downPaymentAmt;
      r.sources.loanAmount = 'calc';
      changed = true;
    }

    // Rule: Purchase Price = Loan Amount + Down Payment Amt
    if (r.loanAmount !== null && r.downPaymentAmt !== null && r.purchasePrice === null) {
      r.purchasePrice = r.loanAmount + r.downPaymentAmt;
      r.sources.purchasePrice = 'calc';
      changed = true;
    }

    // Rule: Purchase Price from Loan Amount and Pct
    if (r.loanAmount !== null && r.downPaymentPct !== null && r.downPaymentPct < 100 && r.purchasePrice === null) {
      r.purchasePrice = r.loanAmount / (1 - r.downPaymentPct / 100);
      r.sources.purchasePrice = 'calc';
      changed = true;
    }

    // Rule: Down Payment Amt from Loan Amount and Pct
    if (r.purchasePrice !== null && r.loanAmount !== null && r.downPaymentAmt === null) {
      r.downPaymentAmt = r.purchasePrice - r.loanAmount;
      r.sources.downPaymentAmt = 'calc';
      changed = true;
    }

    // Rule: Down Payment Percent from Down Payment Amt + Loan Amount
    if (r.downPaymentAmt !== null && r.loanAmount !== null && r.downPaymentPct === null) {
      const price = r.loanAmount + r.downPaymentAmt;
      r.downPaymentPct = price > 0 ? (r.downPaymentAmt / price) * 100 : 0;
      r.sources.downPaymentPct = 'calc';
      changed = true;
    }

    // --- SUB-SYSTEM 2: Loan Amount, Interest Rate, Term, Monthly Payment ---
    // Count how many are known of `{ loanAmount, interestRate, loanTerm, monthlyPayment }`
    const pKnown = r.loanAmount !== null;
    const rKnown = r.interestRate !== null;
    const tKnown = r.loanTerm !== null;
    const mKnown = r.monthlyPayment !== null;

    const knownCount = (pKnown ? 1 : 0) + (rKnown ? 1 : 0) + (tKnown ? 1 : 0) + (mKnown ? 1 : 0);

    if (knownCount === 3) {
      // We can solve for the remaining 4th variable!

      // 1. Solve for Monthly Payment (M)
      if (pKnown && rKnown && tKnown && !mKnown) {
        const P = r.loanAmount!;
        const rate = r.interestRate!;
        const Term = r.loanTerm!;
        const monthlyRate = rate / 100 / 12;
        const n = Term * 12;

        if (n <= 0) {
          r.errorMsg = "Loan term must be greater than 0.";
        } else if (monthlyRate === 0) {
          r.monthlyPayment = P / n;
          r.sources.monthlyPayment = 'calc';
          changed = true;
        } else {
          r.monthlyPayment = P * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
          r.sources.monthlyPayment = 'calc';
          changed = true;
        }
      }

      // 2. Solve for Loan Amount (P)
      if (!pKnown && rKnown && tKnown && mKnown) {
        const rate = r.interestRate!;
        const Term = r.loanTerm!;
        const M = r.monthlyPayment!;
        const monthlyRate = rate / 100 / 12;
        const n = Term * 12;

        if (n <= 0) {
          r.errorMsg = "Loan term must be greater than 0.";
        } else if (monthlyRate === 0) {
          r.loanAmount = M * n;
          r.sources.loanAmount = 'calc';
          changed = true;
        } else {
          r.loanAmount = M * (Math.pow(1 + monthlyRate, n) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, n));
          r.sources.loanAmount = 'calc';
          changed = true;
        }
      }

      // 3. Solve for Loan Term (Term)
      if (pKnown && rKnown && !tKnown && mKnown) {
        const P = r.loanAmount!;
        const rate = r.interestRate!;
        const M = r.monthlyPayment!;
        const monthlyRate = rate / 100 / 12;

        if (monthlyRate === 0) {
          if (M <= 0) {
            r.errorMsg = "Monthly payment must be greater than 0.";
          } else {
            const n = P / M;
            r.loanTerm = n / 12;
            r.sources.loanTerm = 'calc';
            changed = true;
          }
        } else {
          const k = M / P;
          if (k <= monthlyRate) {
            r.errorMsg = "Monthly payment is too low. It must exceed the monthly interest accrued.";
          } else {
            const n = Math.log(k / (k - monthlyRate)) / Math.log(1 + monthlyRate);
            r.loanTerm = n / 12;
            r.sources.loanTerm = 'calc';
            changed = true;
          }
        }
      }

      // 4. Solve for Interest Rate (APR)
      if (pKnown && !rKnown && tKnown && mKnown) {
        const P = r.loanAmount!;
        const Term = r.loanTerm!;
        const M = r.monthlyPayment!;

        if (Term <= 0) {
          r.errorMsg = "Loan term must be greater than 0.";
        } else if (M * Term * 12 < P) {
          // Total payment is less than the loan amount, i.e., negative interest rate
          r.interestRate = 0;
          r.sources.interestRate = 'calc';
          changed = true;
        } else {
          const solvedRate = solveInterestRate(P, Term, M);
          if (solvedRate !== null) {
            r.interestRate = solvedRate;
            r.sources.interestRate = 'calc';
            changed = true;
          }
        }
      }
    }

    if (!changed) {
      break;
    }
  }

  // Calculate if it's fully solved
  // Perfect satisfaction of core variables: Loan Amount, Interest Rate, Loan Term, and Monthly Payment
  r.isFullySolved = r.loanAmount !== null && r.interestRate !== null && r.loanTerm !== null && r.monthlyPayment !== null;

  return r;
}

/**
 * Generates the month-by-month amortization schedule
 */
export function generateSchedule(
  P: number,
  apr: number,
  termInYears: number,
  monthlyPayment: number,
  startDate: Date = new Date()
): AmortizationSchedule {
  const rows: AmortizationRow[] = [];
  const totalPayments = Math.round(termInYears * 12);
  const monthlyRate = apr / 100 / 12;

  let balance = P;
  let cumulativeInterest = 0;
  let cumulativePrincipal = 0;

  for (let i = 1; i <= totalPayments; i++) {
    if (balance <= 0) {
      break;
    }

    const interestPaid = balance * monthlyRate;
    let principalPaid = monthlyPayment - interestPaid;
    let payment = monthlyPayment;

    // Handle last payment adjustments to avoid rounding issues & close balance to 0
    if (balance - principalPaid < 0.01 || i === totalPayments) {
      principalPaid = balance;
      payment = principalPaid + interestPaid;
    }

    const beginningBalance = balance;
    balance = balance - principalPaid;
    if (balance < 0) {
      balance = 0;
    }

    // Keep running tallies
    cumulativeInterest += interestPaid;
    cumulativePrincipal += principalPaid;

    // Calculate billing date for the row (add i months)
    const rowDate = new Date(startDate.getTime());
    rowDate.setMonth(startDate.getMonth() + i);

    rows.push({
      paymentNumber: i,
      paymentDate: rowDate,
      beginningBalance: Math.round(beginningBalance * 100) / 100,
      monthlyPayment: Math.round(payment * 100) / 100,
      principalPaid: Math.round(principalPaid * 100) / 100,
      interestPaid: Math.round(interestPaid * 100) / 100,
      endingBalance: Math.round(balance * 100) / 100,
      cumulativeInterest: Math.round(cumulativeInterest * 100) / 100,
      cumulativePrincipal: Math.round(cumulativePrincipal * 100) / 100,
    });

    if (balance <= 0) {
      break;
    }
  }

  const totalInterestPaid = rows.reduce((acc, row) => acc + row.interestPaid, 0);
  const totalPrincipalPaid = rows.reduce((acc, row) => acc + row.principalPaid, 0);
  const totalCost = totalPrincipalPaid + totalInterestPaid;
  const payoffDate = rows.length > 0 ? rows[rows.length - 1].paymentDate : null;

  return {
    rows,
    totalInterestPaid: Math.round(totalInterestPaid * 100) / 100,
    totalPrincipalPaid: Math.round(totalPrincipalPaid * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    payoffDate,
  };
}
