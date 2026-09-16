import Booking from "../Booking/booking.model";
import Customer from "../Customer/customer.model";
import Invoice from "../Invoice/invoice.model";
import PaymentTransaction from "../Payment/paymentTransaction.model";
import invoiceService from "../Invoice/invoice.services";

const calculateChange=(current:number,previous:number)=>previous===0?(current>0?100:0):Math.round(((current-previous)/previous)*100);
const getStats=async()=>{
  const now=new Date(),thirty=new Date(now.getTime()-30*86400000),sixty=new Date(now.getTime()-60*86400000);
  const [currentPaid,previousPaid,currentBookings,prevBookings,currentCompleted,prevCompleted,currentClientsCount,prevClientsCount,clientList,finance,paymentStatus]=await Promise.all([
    PaymentTransaction.aggregate([{$match:{status:"SUCCEEDED",createdAt:{$gte:thirty}}},{$group:{_id:null,total:{$sum:{$cond:[{$eq:["$type","REFUND"]},{$multiply:["$amount",-1]},"$amount"]}}}}]),
    PaymentTransaction.aggregate([{$match:{status:"SUCCEEDED",createdAt:{$gte:sixty,$lt:thirty}}},{$group:{_id:null,total:{$sum:{$cond:[{$eq:["$type","REFUND"]},{$multiply:["$amount",-1]},"$amount"]}}}}]),
    Booking.countDocuments({createdAt:{$gte:thirty}}),Booking.countDocuments({createdAt:{$gte:sixty,$lt:thirty}}),
    Booking.countDocuments({status:"COMPLETED",createdAt:{$gte:thirty}}),Booking.countDocuments({status:"COMPLETED",createdAt:{$gte:sixty,$lt:thirty}}),
    Customer.countDocuments({createdAt:{$gte:thirty},status:"ACTIVE"}),Customer.countDocuments({createdAt:{$gte:sixty,$lt:thirty},status:"ACTIVE"}),
    Customer.find({status:"ACTIVE"}).sort({lastActivityAt:-1,createdAt:-1}).limit(5).select("name email phone").lean(),
    invoiceService.financeSummary(),
    Invoice.aggregate([{$group:{_id:"$status",count:{$sum:1},amount:{$sum:"$total"}}},{$sort:{count:-1}}]),
  ]);
  const currentRevenue=currentPaid[0]?.total||0,prevRevenue=previousPaid[0]?.total||0;
  return {revenue:{value:currentRevenue,change:calculateChange(currentRevenue,prevRevenue)},bookings:{value:currentBookings,change:calculateChange(currentBookings,prevBookings)},completed:{value:currentCompleted,change:calculateChange(currentCompleted,prevCompleted)},clients:{value:currentClientsCount,change:calculateChange(currentClientsCount,prevClientsCount)},clientList,finance:{...finance,paymentStatus:paymentStatus.map((item:any)=>({status:item._id,count:item.count,amount:item.amount}))}};
};
const getRecentBookings=async()=>{const rows=await Booking.find().sort({createdAt:-1}).limit(10).select("customerDetails.name serviceType date status reference");return rows.map(b=>({name:b.customerDetails.name,type:b.serviceType,date:b.date,status:b.status,reference:b.reference}));};
export default {getStats,getRecentBookings};
