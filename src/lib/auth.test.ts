import assert from "node:assert/strict";
import { test } from "node:test";
import { designatedAdminEmails, isDesignatedAdmin, isGmailAddress } from "./gmail";

test("only Gmail addresses are accepted for Google sign-in", () => {
  assert.equal(isGmailAddress("admin@gmail.com"), true);
  assert.equal(isGmailAddress("Admin@GoogleMail.com"), true);
  assert.equal(isGmailAddress("user@company.com"), false);
});

test("designated admin is the configured Gmail", () => {
  const previousEmail = process.env.ADMIN_EMAIL;
  const previousList = process.env.ADMIN_EMAILS;
  process.env.ADMIN_EMAIL = "committee.admin@gmail.com";
  process.env.ADMIN_EMAILS = "ignored@example.com, treasurer@gmail.com";
  try {
    assert.deepEqual(designatedAdminEmails(), ["committee.admin@gmail.com", "treasurer@gmail.com"]);
    assert.equal(isDesignatedAdmin("committee.admin@gmail.com"), true);
    assert.equal(isDesignatedAdmin("viewer@gmail.com"), false);
  } finally {
    process.env.ADMIN_EMAIL = previousEmail;
    process.env.ADMIN_EMAILS = previousList;
  }
});
