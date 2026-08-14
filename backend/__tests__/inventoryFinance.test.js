const { hasPermission } = require('../dist/middleware/rbac/permissions');
const { calculateOperatingResult } = require('../dist/utils/finance');

describe('Pakistan education inventory permissions', () => {
  test('group admin can manage and approve inventory workflows', () => {
    expect(hasPermission('group_admin', 'inventory', 'create')).toBe(true);
    expect(hasPermission('group_admin', 'procurement', 'approve')).toBe(true);
    expect(hasPermission('group_admin', 'expense_management', 'approve')).toBe(true);
  });

  test('principal sees finance and approves but cannot create income', () => {
    expect(hasPermission('branch_principal', 'finance_dashboard', 'read')).toBe(true);
    expect(hasPermission('branch_principal', 'expense_management', 'approve')).toBe(true);
    expect(hasPermission('branch_principal', 'income_management', 'create')).toBe(false);
  });

  test('accountant records transactions but cannot approve them', () => {
    expect(hasPermission('accountant', 'expense_management', 'create')).toBe(true);
    expect(hasPermission('accountant', 'income_management', 'create')).toBe(true);
    expect(hasPermission('accountant', 'expense_management', 'approve')).toBe(false);
  });
});

describe('operating surplus calculation', () => {
  test('includes other income, payroll, expenses, and depreciation', () => {
    const result = calculateOperatingResult({
      feeRevenue: 800000,
      otherIncome: 100000,
      operatingExpenses: 250000,
      payroll: 500000,
      depreciation: 25000,
    });

    expect(result.totalRevenue).toBe(900000);
    expect(result.cashSurplus).toBe(150000);
    expect(result.operatingSurplus).toBe(125000);
    expect(result.operatingMargin).toBeCloseTo(13.8889, 3);
  });

  test('does not divide by zero when there is no income', () => {
    const result = calculateOperatingResult({
      feeRevenue: 0,
      otherIncome: 0,
      operatingExpenses: 1000,
      payroll: 0,
      depreciation: 0,
    });
    expect(result.operatingSurplus).toBe(-1000);
    expect(result.operatingMargin).toBe(0);
  });
});
