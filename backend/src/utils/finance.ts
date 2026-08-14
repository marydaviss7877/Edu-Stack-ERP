export interface OperatingResultInput {
  feeRevenue: number;
  otherIncome: number;
  operatingExpenses: number;
  payroll: number;
  depreciation: number;
}

export interface OperatingResult extends OperatingResultInput {
  totalRevenue: number;
  cashSurplus: number;
  operatingSurplus: number;
  operatingMargin: number;
}

export function calculateOperatingResult(input: OperatingResultInput): OperatingResult {
  const totalRevenue = input.feeRevenue + input.otherIncome;
  const cashSurplus = totalRevenue - input.operatingExpenses - input.payroll;
  const operatingSurplus = cashSurplus - input.depreciation;
  const operatingMargin = totalRevenue > 0 ? (operatingSurplus / totalRevenue) * 100 : 0;
  return { ...input, totalRevenue, cashSurplus, operatingSurplus, operatingMargin };
}
