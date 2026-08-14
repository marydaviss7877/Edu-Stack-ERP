/**
 * Idempotent inventory + finance seed for the organization owned by subhan@gmail.com.
 * Existing records are preserved; only missing records with deterministic seed keys
 * are inserted.
 *
 * Preview: node scripts/seedMphssInventory.js
 * Apply:   node scripts/seedMphssInventory.js --apply
 */

require('dotenv/config');
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI;
const TARGET_EMAIL = 'subhan@gmail.com';
const APPLY = process.argv.includes('--apply');
if (!MONGO_URI) { console.error('MONGODB_URI not set'); process.exit(1); }

const now = new Date();
const monthDate = (day, hour = 10) => new Date(now.getFullYear(), now.getMonth(), Math.min(day, now.getDate()), hour, 0, 0);
const yearsAgo = (years, monthOffset = 0) => new Date(now.getFullYear() - years, Math.max(0, now.getMonth() - monthOffset), 15);
const addYears = (date, years) => new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
const money = (value, branchIndex) => Math.round(value * (1 + branchIndex * 0.06));
const codePart = (value) => String(value).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);

const vendors = [
  ['CampusTech Supplies (Demo)', '9000001-1', 'Adeel Raza', '0300-0000101', 'filer', 'Computers, networking and classroom technology'],
  ['National Scientific Traders (Demo)', '9000002-2', 'Hina Malik', '0300-0000102', 'filer', 'Laboratory equipment and consumables'],
  ['EduStationers Pakistan (Demo)', '9000003-3', 'Waqas Ahmed', '0300-0000103', 'filer', 'Stationery, paper and examination materials'],
  ['Bright Power Services (Demo)', '9000004-4', 'Bilal Khan', '0300-0000104', 'filer', 'Solar, UPS, generators and electrical maintenance'],
  ['SafeCampus Systems (Demo)', '9000005-5', 'Sana Iqbal', '0300-0000105', 'filer', 'CCTV, access control and fire safety'],
  ['CleanPro Institutional Supply (Demo)', '9000006-6', 'Usman Ali', '0300-0000106', 'filer', 'Cleaning and sanitation supplies'],
  ['Learning Spaces Furniture (Demo)', '9000007-7', 'Rabia Sheikh', '0300-0000107', 'filer', 'Classroom and office furniture'],
  ['Metro Fleet Workshop (Demo)', '9000008-8', 'Fahad Hussain', '0300-0000108', 'non_filer', 'Vehicle parts and maintenance'],
];

const itemTemplates = [
  // key, name, type, category, unit, qty, available, reorder, unitCost, lifeMonths, ageYears, location, department, condition, status, vendor index
  ['DESKTOP', 'Desktop Computer Lab Set', 'fixed_asset', 'Computers & IT Equipment', 'unit', 24, 24, 0, 118000, 48, 2, 'Computer Lab', 'Computer Science', 'good', 'assigned', 0],
  ['LAPTOP', 'Faculty Laptop', 'fixed_asset', 'Computers & IT Equipment', 'unit', 10, 10, 0, 165000, 48, 1, 'Faculty Offices', 'Administration', 'good', 'assigned', 0],
  ['SMARTBOARD', 'Interactive Smart Board', 'fixed_asset', 'Teaching Aids', 'unit', 5, 5, 0, 295000, 60, 1, 'Classrooms', 'Academics', 'good', 'assigned', 0],
  ['PROJECTOR', 'Multimedia Projector', 'fixed_asset', 'Teaching Aids', 'unit', 7, 6, 0, 145000, 48, 3, 'AV Store', 'Academics', 'fair', 'assigned', 0],
  ['MICROSCOPE', 'Binocular Laboratory Microscope', 'fixed_asset', 'Laboratory Equipment', 'unit', 20, 20, 0, 72000, 72, 2, 'Biology Lab', 'Science', 'good', 'assigned', 1],
  ['LABSET', 'Chemistry Laboratory Apparatus Set', 'fixed_asset', 'Laboratory Equipment', 'set', 6, 6, 0, 210000, 72, 3, 'Chemistry Lab', 'Science', 'good', 'assigned', 1],
  ['CHAIR', 'Student Classroom Chair', 'fixed_asset', 'Furniture & Fixtures', 'unit', 320, 305, 0, 6800, 120, 4, 'Classrooms', 'Academics', 'good', 'assigned', 6],
  ['DESK', 'Two-Seat Student Desk', 'fixed_asset', 'Furniture & Fixtures', 'unit', 160, 156, 0, 14500, 120, 4, 'Classrooms', 'Academics', 'good', 'assigned', 6],
  ['PRINTER', 'Network Laser Printer', 'fixed_asset', 'Office Equipment', 'unit', 8, 7, 0, 89000, 60, 2, 'Offices', 'Administration', 'good', 'assigned', 0],
  ['CCTV', 'CCTV Camera and NVR System', 'fixed_asset', 'Security & Surveillance', 'system', 1, 1, 0, 875000, 84, 2, 'Campus', 'Security', 'good', 'assigned', 4],
  ['SOLAR', 'Solar Power System 25kW', 'fixed_asset', 'Generators & Solar', 'system', 1, 1, 0, 3950000, 180, 2, 'Main Building Roof', 'Facilities', 'good', 'assigned', 3],
  ['GENERATOR', 'Standby Diesel Generator', 'fixed_asset', 'Generators & Solar', 'unit', 1, 1, 0, 1850000, 120, 5, 'Utility Area', 'Facilities', 'fair', 'under_maintenance', 3],
  ['BUS', 'Student Transport Bus', 'fixed_asset', 'Vehicles', 'unit', 2, 2, 0, 7850000, 120, 4, 'Transport Yard', 'Transport', 'good', 'assigned', 7],
  ['WATER', 'Electric Water Cooler', 'fixed_asset', 'Electrical & HVAC', 'unit', 5, 5, 0, 128000, 72, 3, 'Student Blocks', 'Facilities', 'fair', 'assigned', 3],
  ['SPORTS', 'Sports Equipment Bundle', 'fixed_asset', 'Sports Equipment', 'set', 4, 4, 0, 175000, 60, 2, 'Sports Store', 'Physical Education', 'good', 'in_stock', 2],
  ['FIRSTAID', 'First Aid and Medical Cabinet', 'fixed_asset', 'Medical & First Aid', 'unit', 3, 3, 0, 65000, 60, 1, 'Medical Room', 'Student Affairs', 'good', 'in_stock', 5],
  ['A4PAPER', 'A4 Photocopy Paper', 'consumable', 'Consumable Stores', 'ream', 180, 74, 45, 1550, null, 0, 'Main Store', 'Administration', 'good', 'in_stock', 2],
  ['TONER', 'Laser Printer Toner', 'consumable', 'Consumable Stores', 'cartridge', 28, 7, 10, 18500, null, 0, 'IT Store', 'Administration', 'good', 'in_stock', 0],
  ['MARKER', 'Whiteboard Marker Pack', 'consumable', 'Teaching Aids', 'pack', 95, 34, 25, 980, null, 0, 'Academic Store', 'Academics', 'good', 'in_stock', 2],
  ['ANSWER', 'Examination Answer Sheet', 'consumable', 'Consumable Stores', 'sheet', 6000, 2150, 1500, 24, null, 0, 'Exam Store', 'Examinations', 'good', 'in_stock', 2],
  ['CHEMICAL', 'Laboratory Chemical Reagent Pack', 'consumable', 'Consumable Stores', 'pack', 45, 9, 12, 8500, null, 0, 'Chemistry Lab Store', 'Science', 'good', 'in_stock', 1],
  ['CLEANER', 'Floor Cleaner 5L', 'consumable', 'Cleaning Supplies', 'bottle', 60, 18, 20, 1650, null, 0, 'Facilities Store', 'Facilities', 'good', 'in_stock', 5],
  ['SANITIZER', 'Hand Sanitizer 5L', 'consumable', 'Cleaning Supplies', 'bottle', 36, 14, 10, 2350, null, 0, 'Medical Store', 'Student Affairs', 'good', 'in_stock', 5],
  ['REGISTER', 'Attendance Register', 'consumable', 'Uniforms & Stationery', 'book', 80, 22, 20, 650, null, 0, 'Academic Store', 'Academics', 'good', 'in_stock', 2],
  ['PEN', 'Ballpoint Pen Box', 'consumable', 'Uniforms & Stationery', 'box', 70, 16, 18, 1200, null, 0, 'Main Store', 'Administration', 'good', 'in_stock', 2],
  ['BULB', 'LED Light 18W', 'consumable', 'Electrical & HVAC', 'unit', 75, 12, 20, 1450, null, 0, 'Electrical Store', 'Facilities', 'good', 'in_stock', 3],
];

const expenseTemplates = [
  ['ELEC', 'Utilities', 'Monthly electricity bill', 245000, 'paid', 'bank_transfer'],
  ['NET', 'IT & Software', 'Internet and campus connectivity', 62000, 'paid', 'bank_transfer'],
  ['CLEAN', 'Cleaning & Sanitation', 'Cleaning services and materials', 78000, 'paid', 'bank_transfer'],
  ['LAB', 'Teaching & Laboratory Supplies', 'Laboratory consumables replenishment', 115000, 'paid', 'cheque'],
  ['BUSREP', 'Transport', 'Student bus preventive maintenance', 168000, 'paid', 'bank_transfer'],
  ['SEC', 'Security', 'Monthly security service invoice', 132000, 'approved', 'bank_transfer'],
  ['BUILD', 'Repairs & Maintenance', 'Classroom repair and paint work', 96000, 'submitted', 'cheque'],
  ['EXAM', 'Examinations', 'Examination printing and stationery', 54000, 'submitted', 'bank_transfer'],
];

const incomeTemplates = [
  ['TRANS', 'Transport', 'Monthly student transport receipts', 285000, 'bank_transfer'],
  ['CANTEEN', 'Canteen', 'Campus canteen concession income', 82000, 'bank_transfer'],
  ['FACILITY', 'Rent & Facility Hire', 'Auditorium and ground facility hire', 65000, 'cheque'],
  ['DONATION', 'Donations', 'Alumni-supported student welfare contribution', 150000, 'bank_transfer'],
  ['ACTIVITY', 'Events & Activities', 'Student activity and event receipts', 48000, 'cash'],
];

const procurementTemplates = [
  ['ITLAB', 'Computer lab workstation refresh', 'Computers & IT Equipment', 10, 'unit', 155000, 'submitted', 'quotation'],
  ['SCIENCE', 'Physics laboratory equipment upgrade', 'Laboratory Equipment', 1, 'set', 650000, 'approved', 'quotation'],
  ['FURN', 'Additional classroom furniture', 'Furniture & Fixtures', 40, 'unit', 14500, 'draft', 'quotation'],
  ['SAFETY', 'Fire extinguishers and safety signage', 'Security & Surveillance', 16, 'unit', 18500, 'quotation', 'petty_purchase'],
];

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db();

  try {
    const owner = await db.collection('users').findOne({ email: TARGET_EMAIL.toLowerCase(), role: 'group_admin' });
    if (!owner?.orgId) throw new Error(`Group Admin ${TARGET_EMAIL} was not found`);
    const org = await db.collection('organizations').findOne({ _id: owner.orgId });
    const branches = await db.collection('branches').find({ orgId: owner.orgId }).sort({ code: 1 }).toArray();
    if (branches.length !== 5) throw new Error(`Expected 5 branches for ${TARGET_EMAIL}, found ${branches.length}; no data changed`);

    console.log(`${APPLY ? 'APPLY' : 'PREVIEW'}: ${org?.name || owner.orgId} · ${branches.length} branches`);
    branches.forEach((branch) => console.log(`  ${branch.code}: ${branch.name}`));
    console.log(`Planned: ${vendors.length} vendors, ${itemTemplates.length * branches.length} inventory items, ${itemTemplates.length * branches.length} opening transactions, ${expenseTemplates.length * branches.length} expenses, ${incomeTemplates.length * branches.length} income records, ${procurementTemplates.length * branches.length} procurement requests`);
    if (!APPLY) {
      console.log('Preview only. Re-run with --apply to insert missing seeded records.');
      return;
    }

    const vendorOps = vendors.map(([name, ntn, contactPerson, phone, taxStatus, notes], index) => ({
      updateOne: {
        filter: { orgId: owner.orgId, ntn },
        update: { $setOnInsert: { orgId: owner.orgId, name, ntn, contactPerson, phone, email: `vendor${index + 1}@inventory-seed.example`, taxStatus, status: 'active', notes, createdAt: now, updatedAt: now } },
        upsert: true,
      },
    }));
    const vendorResult = await db.collection('vendors').bulkWrite(vendorOps, { ordered: false });
    const vendorDocs = await db.collection('vendors').find({ orgId: owner.orgId, ntn: { $in: vendors.map(v => v[1]) } }).toArray();
    const vendorByNtn = Object.fromEntries(vendorDocs.map(v => [v.ntn, v]));

    const totals = { vendors: vendorResult.upsertedCount, items: 0, transactions: 0, expenses: 0, income: 0, procurement: 0 };
    for (let branchIndex = 0; branchIndex < branches.length; branchIndex++) {
      const branch = branches[branchIndex];
      const branchCode = codePart(branch.code || `B${branchIndex + 1}`);
      const principal = await db.collection('users').findOne({ orgId: owner.orgId, branchId: branch._id, role: 'branch_principal' });
      const accountant = await db.collection('users').findOne({ orgId: owner.orgId, branchId: branch._id, role: 'accountant' });
      const makerId = accountant?._id || principal?._id || owner._id;
      const approverId = principal?._id || owner._id;

      const assetCodes = [];
      const itemOps = itemTemplates.map((template, itemIndex) => {
        const [key, name, type, category, unit, baseQty, baseAvailable, reorderLevel, baseCost, usefulLifeMonths, ageYears, location, department, condition, status, vendorIndex] = template;
        const assetCode = `${type === 'fixed_asset' ? 'AST' : 'STK'}-${branchCode}-${key}`;
        assetCodes.push(assetCode);
        const purchaseDate = type === 'fixed_asset' ? yearsAgo(ageYears, itemIndex % 4) : monthDate(1);
        return {
          updateOne: {
            filter: { orgId: owner.orgId, branchId: branch._id, assetCode },
            update: { $setOnInsert: {
              orgId: owner.orgId, branchId: branch._id, assetCode, name, type, category, unit,
              quantity: Number(baseQty), availableQuantity: Number(baseAvailable), reorderLevel: Number(reorderLevel),
              unitCost: money(Number(baseCost), branchIndex), salvageValue: type === 'fixed_asset' ? Math.round(money(Number(baseCost), branchIndex) * 0.05) : 0,
              purchaseDate, inServiceDate: purchaseDate, usefulLifeMonths: usefulLifeMonths || undefined,
              depreciationMethod: type === 'fixed_asset' ? 'straight_line' : 'none', location, department,
              vendorId: vendorByNtn[vendors[Number(vendorIndex)][1]]?._id, condition, status,
              lastVerifiedAt: monthDate(2), nextVerificationDue: addYears(monthDate(2), 1),
              fundingSource: itemIndex % 7 === 0 ? 'Institution Development Fund' : 'Operating Budget',
              notes: 'Demo inventory seed; verify physically before operational use.', createdById: makerId,
              createdAt: now, updatedAt: now,
            } },
            upsert: true,
          },
        };
      });
      const itemResult = await db.collection('inventoryitems').bulkWrite(itemOps, { ordered: false });
      totals.items += itemResult.upsertedCount;

      const seededItems = await db.collection('inventoryitems').find({ orgId: owner.orgId, branchId: branch._id, assetCode: { $in: assetCodes } }).toArray();
      const transactionOps = seededItems.map(item => ({
        updateOne: {
          filter: { orgId: owner.orgId, branchId: branch._id, itemId: item._id, type: 'opening', referenceNo: `SEED-${item.assetCode}` },
          update: { $setOnInsert: { orgId: owner.orgId, branchId: branch._id, itemId: item._id, type: 'opening', quantity: item.quantity, unitCost: item.unitCost, referenceNo: `SEED-${item.assetCode}`, occurredAt: item.purchaseDate || monthDate(1), notes: 'Opening balance from demo inventory seed', performedById: makerId, createdAt: now, updatedAt: now } },
          upsert: true,
        },
      }));
      const transactionResult = await db.collection('inventorytransactions').bulkWrite(transactionOps, { ordered: false });
      totals.transactions += transactionResult.upsertedCount;

      const expenseOps = expenseTemplates.map(([key, category, description, baseAmount, status, paymentMethod], index) => {
        const grossAmount = money(Number(baseAmount), branchIndex);
        const expenseDate = monthDate(2 + index);
        return { updateOne: {
          filter: { orgId: owner.orgId, branchId: branch._id, voucherNo: `EXP-${branchCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${key}` },
          update: { $setOnInsert: {
            orgId: owner.orgId, branchId: branch._id, voucherNo: `EXP-${branchCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${key}`,
            expenseDate, category, costCenter: category, description, grossAmount, salesTax: 0, withholdingTax: 0, otherDeductions: 0, netPaid: grossAmount,
            paymentMethod, status, attachmentUrls: [], recurring: ['ELEC', 'NET', 'CLEAN', 'SEC'].includes(key),
            submittedById: makerId, approvedById: ['approved', 'paid'].includes(status) ? approverId : undefined,
            paidById: status === 'paid' ? makerId : undefined, approvedAt: ['approved', 'paid'].includes(status) ? expenseDate : undefined,
            paidAt: status === 'paid' ? expenseDate : undefined, createdById: makerId, createdAt: expenseDate, updatedAt: expenseDate,
          } }, upsert: true,
        } };
      });
      const expenseResult = await db.collection('expenses').bulkWrite(expenseOps, { ordered: false });
      totals.expenses += expenseResult.upsertedCount;

      const incomeOps = incomeTemplates.map(([key, category, description, baseAmount, paymentMethod], index) => {
        const receivedAt = monthDate(3 + index * 2);
        return { updateOne: {
          filter: { orgId: owner.orgId, branchId: branch._id, receiptNo: `INC-${branchCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${key}` },
          update: { $setOnInsert: {
            orgId: owner.orgId, branchId: branch._id, receiptNo: `INC-${branchCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${key}`,
            receivedAt, category, description, amount: money(Number(baseAmount), branchIndex), paymentMethod,
            paymentReference: `SEED-${branchCode}-${key}`, payerName: key === 'DONATION' ? 'Alumni Welfare Circle (Demo)' : undefined,
            restrictedFund: key === 'DONATION', fundingSource: key === 'DONATION' ? 'Student Welfare Fund' : 'Campus Operations',
            attachmentUrls: [], status: 'received', createdById: makerId, createdAt: receivedAt, updatedAt: receivedAt,
          } }, upsert: true,
        } };
      });
      const incomeResult = await db.collection('incomeentries').bulkWrite(incomeOps, { ordered: false });
      totals.income += incomeResult.upsertedCount;

      const procurementOps = procurementTemplates.map(([key, title, category, quantity, unit, unitCost, status, procurementMethod], index) => {
        const createdAt = monthDate(4 + index * 2);
        const estimatedUnitCost = money(Number(unitCost), branchIndex);
        return { updateOne: {
          filter: { orgId: owner.orgId, branchId: branch._id, requestNo: `PR-${branchCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${key}` },
          update: { $setOnInsert: {
            orgId: owner.orgId, branchId: branch._id, requestNo: `PR-${branchCode}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${key}`,
            title, purpose: `${title} for ${branch.name}`, department: category.includes('Laboratory') ? 'Science' : 'Administration', budgetHead: category,
            procurementMethod, items: [{ name: title, specifications: 'Demo specification; finalize before purchase', quantity, unit, estimatedUnitCost }],
            estimatedTotal: Number(quantity) * estimatedUnitCost, quotationRefs: [], requiredBy: addYears(createdAt, 0), status,
            requestedById: makerId, approvedById: ['approved', 'quotation'].includes(status) ? approverId : undefined,
            approvedAt: ['approved', 'quotation'].includes(status) ? createdAt : undefined, createdAt, updatedAt: createdAt,
          } }, upsert: true,
        } };
      });
      const procurementResult = await db.collection('procurementrequests').bulkWrite(procurementOps, { ordered: false });
      totals.procurement += procurementResult.upsertedCount;

      console.log(`✓ ${branch.name}: +${itemResult.upsertedCount} items, +${expenseResult.upsertedCount} expenses, +${incomeResult.upsertedCount} income, +${procurementResult.upsertedCount} procurement`);
    }

    console.log('\nInserted missing records:', totals);
    console.log('Seed complete. Records marked “Demo” should be reviewed before operational use.');
  } finally {
    await client.close();
  }
}

main().catch(error => { console.error(error.message || error); process.exit(1); });
