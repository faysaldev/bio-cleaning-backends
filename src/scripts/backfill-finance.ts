import connectDB from "../config/db";
import Booking from "../domains/Booking/booking.model";
import PaymentTransaction from "../domains/Payment/paymentTransaction.model";
import { ensureJobForBooking } from "../domains/FieldOps/fieldOps.services";
import { money } from "../domains/Finance/finance.utils";

(async()=>{
  await connectDB();
  let depositCredits=0,processed=0,failed=0;

  // Preserve deposits that were successfully collected before the finance ledger
  // existed. This is idempotent per booking and prevents completed jobs from
  // being invoiced for money the customer already paid.
  const paidBookings:any[]=await Booking.find({"payment.status":"PAID","payment.depositAmount":{$gt:0}});
  for(const booking of paidBookings){
    try{
      const exists=await PaymentTransaction.exists({bookingId:booking._id,purpose:"DEPOSIT",status:"SUCCEEDED"});
      if(exists)continue;
      await PaymentTransaction.create({
        type:"PAYMENT",purpose:"DEPOSIT",provider:"MANUAL",status:"SUCCEEDED",
        amount:money(Number(booking.payment.depositAmount||0)),currency:booking.payment.currency||"USD",
        bookingId:booking._id,bookingIds:[booking._id],customerId:booking.customerId,
        recurrenceGroupId:booking.recurrenceGroupId,
        allocations:[{bookingId:booking._id,amount:money(Number(booking.payment.depositAmount||0))}],
        metadata:{backfilledFrom:"booking.payment",legacyCheckoutSessionId:booking.payment.checkoutSessionId},
        processedAt:booking.payment.paidAt||booking.updatedAt||new Date(),
      });
      depositCredits+=1;
    }catch(error){failed+=1;console.error("Deposit ledger backfill failed for booking",booking._id,error);}
  }

  // ensureJobForBooking is idempotent and creates/refreshes the invoice for
  // already-completed work, including installations that did not run the older
  // field-ops backfill first.
  const completed:any[]=await Booking.find({status:"COMPLETED"});
  for(const booking of completed){
    try{await ensureJobForBooking(booking);processed+=1;}catch(error){failed+=1;console.error("Finance backfill failed for booking",booking._id,error);}
  }

  console.log(JSON.stringify({paidBookings:paidBookings.length,depositCreditsCreated:depositCredits,completedBookings:completed.length,processed,failed},null,2));
  process.exit(failed?1:0);
})().catch((error)=>{console.error(error);process.exit(1);});
