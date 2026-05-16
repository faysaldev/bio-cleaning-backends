"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundStatus = exports.TransactionType = exports.TransactionStatus = exports.MyPostBrowseType = exports.SellerBrowseType = exports.ConversationType = exports.NotificationType = exports.OrderStatus = exports.OfferStatus = exports.BoostingType = exports.SellerCategories = exports.SellerType = exports.Role = exports.roles = void 0;
exports.roles = ["user", "admin", "buyer", "seller"];
exports.Role = {
    USER: "user",
    ADMIN: "admin",
    BUYER: "buyer",
    SELLER: "seller",
};
exports.SellerType = {
    INDIVIDUAL: "individual",
    COMPANY: "company",
};
exports.SellerCategories = {
    BOOSTING: "boosting",
};
exports.BoostingType = {
    RANK_BOOST: "rank_boost",
    PLACEMENT_MATCHES: "placement_matches",
    NET_WINS: "net_wins",
    CUSTOM_REQUEST: "custom_request",
};
exports.OfferStatus = {
    PENDING: "pending",
    ACCEPTED: "accepted",
    DECLINED: "declined",
};
exports.OrderStatus = {
    UNPAID: "unpaid",
    PAID: "paid",
    IN_PROGRESS: "in_progress",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
};
exports.NotificationType = {
    // Boosting types
    RANK_BOOST: "rank_boost",
    PLACEMENT_MATCHES: "placement_matches",
    NET_WINS: "net_wins",
    CUSTOM_REQUEST: "custom_request",
    // Offer notifications
    NEW_OFFER: "new_offer",
    OFFER_SENT: "offer_sent",
    OFFER_ACCEPTED: "offer_accepted",
    OFFER_DECLINED: "offer_declined",
    // Order notifications
    ORDER_CREATED: "order_created",
    ORDER_COMPLETED: "order_completed",
    ORDER_CANCELLED: "order_cancelled",
    // General
    SYSTEM: "system",
};
exports.ConversationType = {
    BOOSTING: "boosting",
    ORDERS: "orders",
    SUPPORT: "support",
};
// Seller browse types for filtering boosting posts
exports.SellerBrowseType = {
    WAITING_FOR_OFFER: "waiting_for_offer", // Active posts where seller hasn't made an offer
    OFFER_SUBMITTED: "offer_submitted", // Posts where seller's offer is pending
    OFFER_ACCEPTED: "offer_accepted", // Posts where seller's offer was accepted
    OFFER_LOST: "offer_lost", // Posts where seller's offer was declined or someone else got it
};
// User's own post browse types
exports.MyPostBrowseType = {
    ALL: "all", // All posts
    IN_PROGRESS: "in_progress", // Active posts that have offers but not completed
    COMPLETED: "completed", // Completed posts
    CANCELLED: "cancelled", // Cancelled posts
};
// Transaction status
exports.TransactionStatus = {
    PAID: "paid",
    UNPAID: "unpaid",
    PENDING: "pending",
    REJECTED: "rejected",
};
// Transaction type
exports.TransactionType = {
    WITHDRAWAL: "withdrawal",
    EARNING: "earning",
};
// Refund status
exports.RefundStatus = {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    RESOLVED: "resolved",
};
