import Booking from "../Booking/booking.model";
import Contact from "../Contact/contact.model";

const getStats = async () => {
  const totalBookings = await Booking.countDocuments();
  const confirmedBookings = await Booking.countDocuments({ status: "CONFIRMED" });
  const completedBookings = await Booking.countDocuments({ status: "COMPLETED" });
  
  const revenueData = await Booking.aggregate([
    { $match: { status: "COMPLETED" } },
    { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" } } },
  ]);

  const totalRevenue = revenueData.length > 0 ? revenueData[0].totalRevenue : 0;

  // Get client list (unique emails)
  const clientList = await Booking.aggregate([
    { $group: { _id: "$customerDetails.email", name: { $first: "$customerDetails.name" }, phone: { $first: "$customerDetails.phone" } } },
    { $project: { _id: 0, email: "$_id", name: 1, phone: 1 } },
    { $limit: 100 }
  ]);

  return {
    totalRevenue,
    totalBookings,
    confirmedBookings,
    completedBookings,
    totalClients: clientList.length,
    clientList
  };
};

const getRecentBookings = async () => {
  const recentBookings = await Booking.find()
    .sort({ createdAt: -1 })
    .limit(10)
    .select("customerDetails.name serviceType date status reference");
  
  return recentBookings.map(b => ({
    name: b.customerDetails.name,
    type: b.serviceType,
    date: b.date,
    status: b.status,
    reference: b.reference
  }));
};

const dashboardService = {
  getStats,
  getRecentBookings,
};

export default dashboardService;
