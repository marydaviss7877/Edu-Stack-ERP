import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database';
import { Expense } from '../src/models/Expense';
import { IncomeEntry } from '../src/models/IncomeEntry';
import { InventoryItem } from '../src/models/InventoryItem';
import { InventoryTransaction } from '../src/models/InventoryTransaction';
import { ProcurementRequest } from '../src/models/ProcurementRequest';
import { Vendor } from '../src/models/Vendor';

async function main(): Promise<void> {
  await connectDatabase();
  const models = [
    InventoryItem,
    InventoryTransaction,
    Expense,
    IncomeEntry,
    ProcurementRequest,
    Vendor,
  ];
  for (const model of models) {
    await model.createIndexes();
    console.log(`✓ ${model.modelName} indexes created/verified`);
  }
  await mongoose.disconnect();
}

main().catch(async (error: unknown) => {
  console.error('Inventory index creation failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
