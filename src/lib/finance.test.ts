import assert from "node:assert/strict";
import { test } from "node:test";
import { InterestMethod } from "./enums";
import { addYears, daysBetween, simpleInterestPaise } from "./interest";
import { parseRupeeInput } from "./money";

test("parses rupee input as integer paise", () => {
  assert.equal(parseRupeeInput("10"), 1000);
  assert.equal(parseRupeeInput("10.5"), 1050);
  assert.equal(parseRupeeInput("10.50"), 1050);
  assert.throws(() => parseRupeeInput("10.555"));
});

test("annual simple interest is Principal × Rate × (days ÷ 365)", () => {
  const start = new Date("2026-01-01");
  const asOf = new Date("2027-01-01");
  const days = daysBetween(start, asOf);
  assert.equal(days, 365);
  const interest = simpleInterestPaise({
    principalPaise: 100_00,
    interestMethod: InterestMethod.ANNUAL_SIMPLE,
    interestRateBps: 1200,
    startDate: start,
    asOf,
  });
  assert.equal(interest, 12_00);
});

test("fixed interest ignores elapsed days", () => {
  const interest = simpleInterestPaise({
    principalPaise: 50_000_00,
    interestMethod: InterestMethod.FIXED_AMOUNT,
    interestRateBps: 0,
    fixedInterestPaise: 1_000_00,
    startDate: new Date("2026-01-01"),
    asOf: new Date("2026-06-01"),
  });
  assert.equal(interest, 1_000_00);
});

test("due date helper defaults to one year", () => {
  const start = new Date("2026-02-01");
  const due = addYears(start, 1);
  assert.equal(due.toISOString().slice(0, 10), "2027-02-01");
});

test("outstanding is principal plus interest minus repayments", () => {
  const startDate = new Date("2026-01-01");
  const asOf = new Date("2027-01-01");
  const principalPaise = 10_000_00;
  const repaidPaise = 2_000_00;
  const interestToDatePaise = simpleInterestPaise({
    principalPaise,
    interestMethod: InterestMethod.ANNUAL_SIMPLE,
    interestRateBps: 1200,
    startDate,
    asOf,
  });
  const outstandingToDatePaise = principalPaise + interestToDatePaise - repaidPaise;
  assert.equal(interestToDatePaise, 1_200_00);
  assert.equal(outstandingToDatePaise, 9_200_00);
});

test("distributable balance formula", () => {
  const opening = 25_000_00;
  const donations = 77_250_00;
  const expenses = 15_600_00;
  const distributed = 30_000_00;
  const available = opening + donations - expenses;
  const distributable = available - distributed;
  assert.equal(available, 86_650_00);
  assert.equal(distributable, 56_650_00);
});
