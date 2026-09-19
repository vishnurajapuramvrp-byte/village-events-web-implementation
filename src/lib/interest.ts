import { InterestMethod } from "@/lib/enums";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function addYears(date: Date, years: number): Date {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(0, Math.round((endUtc - startUtc) / MS_PER_DAY));
}

export function simpleInterestPaise(params: {
  principalPaise: number;
  interestMethod: InterestMethod | string;
  interestRateBps: number;
  fixedInterestPaise?: number;
  startDate: Date;
  asOf: Date;
}): number {
  const { principalPaise, interestMethod, interestRateBps, fixedInterestPaise = 0, startDate, asOf } =
    params;
  if (principalPaise <= 0) return 0;
  if (interestMethod === InterestMethod.FIXED_AMOUNT) return Math.max(0, fixedInterestPaise);

  const days = daysBetween(startDate, asOf);
  const rate = interestRateBps / 10_000;

  if (interestMethod === InterestMethod.MONTHLY_SIMPLE) {
    return Math.round(principalPaise * rate * (days / 30) / 12);
  }

  // ANNUAL_SIMPLE and CUSTOM: Principal × Rate × (days ÷ 365)
  return Math.round(principalPaise * rate * (days / 365));
}
