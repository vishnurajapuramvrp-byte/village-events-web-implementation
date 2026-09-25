export const Role = {
  ADMIN: "ADMIN",
  TREASURER: "TREASURER",
  COMMITTEE_MEMBER: "COMMITTEE_MEMBER",
  VIEWER: "VIEWER",
  RECIPIENT: "RECIPIENT",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const EventStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;

export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];

export const PaymentMethod = {
  CASH: "CASH",
  UPI: "UPI",
  BANK: "BANK",
  OTHER: "OTHER",
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const InterestMethod = {
  ANNUAL_SIMPLE: "ANNUAL_SIMPLE",
  MONTHLY_SIMPLE: "MONTHLY_SIMPLE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
  CUSTOM: "CUSTOM",
} as const;

export type InterestMethod = (typeof InterestMethod)[keyof typeof InterestMethod];

export const DistributionFundingSource = {
  DONATION: "DONATION",
  EVENT_GENERATED: "EVENT_GENERATED",
} as const;

export type DistributionFundingSource =
  (typeof DistributionFundingSource)[keyof typeof DistributionFundingSource];

export const ReminderKind = {
  DAYS_30: "DAYS_30",
  DAYS_7: "DAYS_7",
  DUE_DAY: "DUE_DAY",
  OVERDUE: "OVERDUE",
} as const;

export type ReminderKind = (typeof ReminderKind)[keyof typeof ReminderKind];
