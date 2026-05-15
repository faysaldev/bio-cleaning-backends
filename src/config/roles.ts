export const roles = ["user", "admin", "buyer", "seller"] as const;

export const Role = {
  USER: "user",
  ADMIN: "admin",
  BUYER: "buyer",
  SELLER: "seller",
} as const;

export const SellerType = {
  INDIVIDUAL: "individual",
  COMPANY: "company",
} as const;

export const SellerCategories = {
  BOOSTING: "boosting",
} as const;

export const BoostingType = {
  RANK_BOOST: "rank_boost",
  PLACEMENT_MATCHES: "placement_matches",
  NET_WINS: "net_wins",
  CUSTOM_REQUEST: "custom_request",
} as const;

export const OfferStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
} as const;

export const OrderStatus = {
  UNPAID: "unpaid",
  PAID: "paid",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const NotificationType = {
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
} as const;

export const ConversationType = {
  BOOSTING: "boosting",
  ORDERS: "orders",
  SUPPORT: "support",
} as const;

// Seller browse types for filtering boosting posts
export const SellerBrowseType = {
  WAITING_FOR_OFFER: "waiting_for_offer", // Active posts where seller hasn't made an offer
  OFFER_SUBMITTED: "offer_submitted", // Posts where seller's offer is pending
  OFFER_ACCEPTED: "offer_accepted", // Posts where seller's offer was accepted
  OFFER_LOST: "offer_lost", // Posts where seller's offer was declined or someone else got it
} as const;

// User's own post browse types
export const MyPostBrowseType = {
  ALL: "all", // All posts
  IN_PROGRESS: "in_progress", // Active posts that have offers but not completed
  COMPLETED: "completed", // Completed posts
  CANCELLED: "cancelled", // Cancelled posts
} as const;

export type RoleType = (typeof roles)[number];
export type SellerTypeEnum = (typeof SellerType)[keyof typeof SellerType];
export type SellerCategoriesEnum =
  (typeof SellerCategories)[keyof typeof SellerCategories];
export type BoostingTypeEnum = (typeof BoostingType)[keyof typeof BoostingType];
export type OfferStatusEnum = (typeof OfferStatus)[keyof typeof OfferStatus];
export type OrderStatusEnum = (typeof OrderStatus)[keyof typeof OrderStatus];
export type NotificationTypeEnum =
  (typeof NotificationType)[keyof typeof NotificationType];
export type ConversationTypeEnum =
  (typeof ConversationType)[keyof typeof ConversationType];
export type SellerBrowseTypeEnum =
  (typeof SellerBrowseType)[keyof typeof SellerBrowseType];
export type MyPostBrowseTypeEnum =
  (typeof MyPostBrowseType)[keyof typeof MyPostBrowseType];

// Transaction status
export const TransactionStatus = {
  PAID: "paid",
  UNPAID: "unpaid",
  PENDING: "pending",
  REJECTED: "rejected",
} as const;

export type TransactionStatusEnum =
  (typeof TransactionStatus)[keyof typeof TransactionStatus];

// Transaction type
export const TransactionType = {
  WITHDRAWAL: "withdrawal",
  EARNING: "earning",
} as const;

export type TransactionTypeEnum =
  (typeof TransactionType)[keyof typeof TransactionType];

// Refund status
export const RefundStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  RESOLVED: "resolved",
} as const;

export type RefundStatusEnum = (typeof RefundStatus)[keyof typeof RefundStatus];
