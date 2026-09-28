import mongoose from "mongoose";
import { env } from "../config/env.js";
import { connectDB } from "../config/db.js";
import Invoice from "../models/Invoice.model.js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const onlyMissing = args.has("--only-missing");

const calculateAmount = (invoice) => {
  const budgetAmount = Number(invoice.budget?.amount) || 0;
  const durationDays = Number(invoice.durationDays) || 0;
  const rate = Number(invoice.rate) || 0;
  const discountAmount = Number(invoice.discountAmount) || 0;
  const correctionAmount = Number(invoice.correctionAmount) || 0;
  const baseAmount = invoice.budget?.type === "daily" ? budgetAmount * durationDays * rate : budgetAmount * rate;
  return Math.max(0, baseAmount - discountAmount + correctionAmount);
};

const hasLegacyMismatch = (invoice) => {
  if (!invoice?.budget || invoice.rate == null || invoice.amount == null) return true;
  return calculateAmount(invoice) !== Number(invoice.amount);
};

async function main() {
  await connectDB();
  const invoices = await Invoice.find({}).select("agency client adRequest budget durationDays rate amount discountAmount correctionAmount status paidAt paymentMethod");
  const targets = onlyMissing ? invoices.filter(hasLegacyMismatch) : invoices;
  let updated = 0;

  for (const invoice of targets) {
    const amount = calculateAmount(invoice);
    if (dryRun) {
      console.log(`[dry-run] ${invoice.invoiceNumber}: ${invoice.amount} -> ${amount}`);
      continue;
    }
    await Invoice.updateOne(
      { _id: invoice._id },
      { $set: { amount, discountAmount: Number(invoice.discountAmount) || 0, correctionAmount: Number(invoice.correctionAmount) || 0 } }
    );
    updated += 1;
  }

  console.log(dryRun ? `Dry run complete for ${targets.length} invoice(s)` : `Backfilled ${updated} invoice(s)`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (error) => {
  console.error("Backfill failed:", error?.stack || error?.message || error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
