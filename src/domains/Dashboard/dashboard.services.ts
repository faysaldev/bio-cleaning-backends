import Booking from "../Booking/booking.model";

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

const getStats = async () => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  // 1. Revenue
  const currentRevenueData = await Booking.aggregate([
    { $match: { status: "COMPLETED", createdAt: { $gte: thirtyDaysAgo } } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  const prevRevenueData = await Booking.aggregate([
    { $match: { status: "COMPLETED", createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  const currentRevenue = currentRevenueData[0]?.total || 0;
  const prevRevenue = prevRevenueData[0]?.total || 0;

  // 2. Bookings (Total created)
  const currentBookings = await Booking.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
  const prevBookings = await Booking.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });

  // 3. Completed Bookings
  const currentCompleted = await Booking.countDocuments({ status: "COMPLETED", createdAt: { $gte: thirtyDaysAgo } });
  const prevCompleted = await Booking.countDocuments({ status: "COMPLETED", createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });

  // 4. Unique Clients
  const currentClientsData = await Booking.distinct("customerDetails.email", { createdAt: { $gte: thirtyDaysAgo } });
  const prevClientsData = await Booking.distinct("customerDetails.email", { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
  const currentClientsCount = currentClientsData.length;
  const prevClientsCount = prevClientsData.length;

  // 5. Latest 5 Unique Clients
  const clientList = await Booking.aggregate([
    { $sort: { createdAt: -1 } },
    { $group: { 
        _id: "$customerDetails.email", 
        name: { $first: "$customerDetails.name" }, 
        phone: { $first: "$customerDetails.phone" },
        lastBooking: { $first: "$createdAt" }
      } 
    },
    { $sort: { lastBooking: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, email: "$_id", name: 1, phone: 1 } }
  ]);

  return {
    revenue: {
      value: currentRevenue,
      change: calculateChange(currentRevenue, prevRevenue)
    },
    bookings: {
      value: currentBookings,
      change: calculateChange(currentBookings, prevBookings)
    },
    completed: {
      value: currentCompleted,
      change: calculateChange(currentCompleted, prevCompleted)
    },
    clients: {
      value: currentClientsCount,
      change: calculateChange(currentClientsCount, prevClientsCount)
    },
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
