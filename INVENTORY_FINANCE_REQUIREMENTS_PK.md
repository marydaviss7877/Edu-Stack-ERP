# Pakistan Education Inventory & Finance Module

## Purpose

This module is designed for Pakistani schools, college groups, and universities. It supports private, nonprofit, and public-sector terminology and keeps regulatory thresholds configurable because federal and provincial procurement rules differ.

The system must answer four management questions reliably:

1. What does each campus own, where is it, who holds it, and what condition is it in?
2. What stock is available, issued, low, lost, under repair, transferred, or disposed?
3. What income and expenses have actually been received or paid, and what is awaiting approval?
4. What is the institution's cash surplus and operating surplus after payroll, expenses, and depreciation?

## Pakistan-specific design principles

- Currency is PKR; payment methods include cash, cheque, bank transfer, JazzCash, and Easypaisa.
- Vendors can store NTN, STRN, filer/non-filer/exempt status, banking information, suspension, and blacklisting.
- Public-sector procurement configuration must support the applicable federal or provincial PPRA regime rather than assuming one national threshold.
- Procurement records preserve planning, specifications, approvals, quotations/bids, evaluation, purchase order, receipt, contract closure, grievances, and audit history.
- Fixed assets support owner campus, category, beginning cost, additions, disposals, and ending cost reporting.
- Physical verification is scheduled at least annually, with discrepancies, losses, and corrective action recorded.
- Disposal records preserve approval, valuation/reserve price, method, purchaser, proceeds, and separate disposal expenses.
- For public or nonprofit institutions, dashboard “profit” is labelled operating surplus/deficit. Private institutions can interpret the same figure as operating profit/loss.
- Statutory financial statements remain the responsibility of the institution's qualified accountant/auditor; this dashboard is a management view.

## Functional scope

### Fixed assets

- Unique asset code / QR-ready identifier
- Campus, building/room, department, and custodian
- Category/subcategory, description, make/model, serial number
- Acquisition and in-service dates, vendor, purchase reference, funding source
- Quantity, unit cost, salvage value, useful life, straight-line depreciation
- Warranty, condition, operational status, photographs/documents
- Assignment, return, internal transfer, inter-campus transfer
- Repair/maintenance history, downtime, cost, warranty claim
- Annual physical verification, discrepancy and loss registers
- Surplus, obsolete, unserviceable, lost, donated, transferred, and disposed states

### Consumable inventory

- Units of measure, opening quantity, receipts, issues, returns, and adjustments
- Minimum/reorder level and low-stock alerts
- Store/location, batch/lot and expiry fields where required
- Department/class/lab/event issue tracking and receiver acknowledgement
- Stock count, variance, damaged/expired/write-off workflow

### Education asset categories

- Land/buildings; furniture/fixtures; computers/networking; laboratory equipment
- Library assets; vehicles; generators/solar/UPS; security/CCTV
- Sports equipment; medical/first aid; teaching aids; office equipment
- Electrical/HVAC; uniforms/stationery; cleaning supplies; general stores

### Procurement

- Annual/periodic procurement plan and budget head
- Purchase requisition with purpose, specifications, quantity and estimated cost
- Configurable approval matrix by campus, category, value and funding source
- Petty purchase, quotations, open bidding, direct contracting, framework and other methods
- Vendor prequalification, quotations/bids, evaluation and conflict-of-interest record
- Purchase order/contract, delivery milestones, performance security where applicable
- Goods receipt note, inspection/acceptance, rejected/short supply, invoice matching
- Partial receipts, returns, contract closure, supplier performance and blacklisting

### Expenses and payables

- Voucher number, date, campus, category/subcategory and cost centre
- Gross amount, sales tax, withholding tax, deductions, and net payment
- Vendor, procurement reference, funding source and supporting documents
- Draft → submitted → approved/rejected → paid/void workflow
- Maker/checker separation: Accountant records; Principal or Group Admin approves
- Cash, bank, cheque and wallet references; recurring expense flag
- Core categories include utilities, rent, repairs, teaching/lab supplies, IT, transport, security, cleaning, exams, student activities, professional services, government fees/taxes, scholarships and capital purchases

### Other income

- Separate from fee challans to prevent double counting
- Admission/registration, transport, hostel, canteen, grants, donations, endowment, rent/facility hire, asset disposal, bank/investment income, events and other income
- Receipt number, payer, payment method/reference, restricted fund and funding source
- Asset disposal proceeds are recorded gross; disposal costs remain separate expenses

### Financial management dashboard

- Fee receipts: sum of actual challan payment transactions in the selected period
- Other income: sum of received non-fee income in the selected period
- Total income = fee receipts + other income
- Cash expenses = paid operating expenses + paid payroll
- Cash surplus/deficit = total income - cash expenses
- Depreciation = period straight-line depreciation for active fixed assets within useful life
- Operating surplus/deficit = cash surplus/deficit - depreciation
- Operating margin = operating surplus/deficit ÷ total income
- Outstanding fees are shown separately and are not counted as cash income
- Group Admin sees consolidated totals plus campus-by-campus revenue, expense and surplus comparison
- Principal sees only their branch; Accountant sees the branch ledger and workflow

## Roles

- Group Admin: organization-wide visibility, configuration, approvals, branch comparison and exports
- Principal: branch visibility, expense/procurement approvals, asset oversight and financial surplus
- Accountant: creates income/expense entries, records payments, maintains vendors and inventory transactions; cannot self-approve
- IT Admin: may maintain technology assets and submit procurement, without financial approval
- Other staff: future custodian/read/issue permissions can be added without exposing financial results

## Implemented in the current mobile/backend pass

- MongoDB models for assets/stock, inventory transactions, vendors, procurement, expenses and other income
- Tenant and campus scoping, indexes, RBAC and maker/checker controller guards
- REST APIs for registers, create workflows, approvals, payments, transactions and summaries
- Fixed-asset depreciation and branch/consolidated financial calculations
- Flutter module with Overview, Assets & Stock, Expenses, Income and Procurement tabs
- Mobile navigation for Group Admin, Principal and Accountant
- Group Admin consolidated finance/branch dashboard
- Principal branch financial position and asset health dashboard
- Accountant income/expenditure dashboard and entry points
- Narrow-phone and 200% text-scale regression tests

## Required next deployment steps

1. Deploy backend code before the mobile release.
2. Start the backend against the target MongoDB environment so Mongoose creates the new collection indexes, or run an approved explicit index migration if production disables automatic index creation.
3. Configure institution-specific useful lives, approval limits, procurement regime, budget heads, cost centres and fiscal year.
4. Seed opening asset balances, stock counts, accumulated depreciation and unpaid obligations under accountant supervision.
5. Reconcile the first monthly dashboard against bank receipts, challan collections, payroll and the general ledger.
6. Complete physical-device QA and role-based user acceptance testing before production rollout.

## Primary research sources

- Federal PPRA, Public Procurement Rules 2004 (amended): https://epms.ppra.gov.pk/public/procurement-rules
- PPRA downloads, including federal and provincial documents: https://collab.eprocure.gov.pk/downloads
- Government of Pakistan General Financial Rules 2025, especially fixed-assets reporting, annual verification and disposal: https://finance.gov.pk/budget/gfr2025_28032025.pdf
- Controller General of Accounts manuals and Chart of Accounts: https://cga.gov.pk/Detail/ZDgyMzc0ZGEtZTA1ZS00ZDBhLWIxODctNDdkYWUzMWZjMjdl
- IFRS Foundation Pakistan jurisdiction profile (IFRS, IFRS for SMEs, ICAP/SECP frameworks): https://www.ifrs.org/use-around-the-world/use-of-ifrs-standards-by-jurisdiction/view-jurisdiction/pakistan/
