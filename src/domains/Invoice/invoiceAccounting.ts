import Invoice from "./invoice.model";
import PaymentTransaction from "../Payment/paymentTransaction.model";
import { money } from "../Finance/finance.utils";

export const refreshInvoiceFinancials = async (invoiceId: string) => {
  const invoice: any = await Invoice.findById(invoiceId);
  if (!invoice) return null;
  if (invoice.status === "VOID") return invoice;
  const transactions: any[] = await PaymentTransaction.find({
    status: "SUCCEEDED",
    $or: [{ invoiceId: invoice._id }, { "allocations.invoiceId": invoice._id }],
  }).lean();
  const paymentIds = new Set<string>();
  let paid = 0;
  let refunded = 0;
  for (const tx of transactions) {
    if (tx.type === "PAYMENT") {
      if (tx.invoiceId && String(tx.invoiceId) === String(invoice._id)) {
        if (!paymentIds.has(String(tx._id))) { paid += Number(tx.amount || 0); paymentIds.add(String(tx._id)); }
      } else {
        const allocated = (tx.allocations || []).filter((a:any)=>String(a.invoiceId||"")===String(invoice._id)).reduce((s:number,a:any)=>s+Number(a.amount||0),0);
        paid += allocated;
      }
    } else if (tx.type === "REFUND") {
      refunded += Number(tx.amount || 0);
    }
  }
  paid = money(paid); refunded = money(refunded);
  invoice.amountPaid = paid;
  invoice.amountRefunded = refunded;
  invoice.amountDue = money(Math.max(0, invoice.total - paid));
  if (paid > 0 && refunded >= paid) invoice.status = "REFUNDED";
  else if (refunded > 0) invoice.status = "PARTIALLY_REFUNDED";
  else if (paid >= invoice.total) invoice.status = "PAID";
  else if (paid > 0) invoice.status = "PARTIALLY_PAID";
  else invoice.status = "OPEN";
  if (paid >= invoice.total && !invoice.paidAt) invoice.paidAt = new Date();
  if (paid < invoice.total) invoice.paidAt = undefined;
  await invoice.save();
  return invoice;
};
