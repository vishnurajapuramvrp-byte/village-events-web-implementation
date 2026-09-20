import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError, jsonError } from "./http-error";

test("maps AppError status onto JSON responses", async () => {
  const unauthorized = jsonError(new AppError("Sign in to continue.", 401));
  assert.equal(unauthorized.status, 401);
  assert.deepEqual(await unauthorized.json(), { error: "Sign in to continue." });

  const forbidden = jsonError(new AppError("You do not have permission to do that.", 403));
  assert.equal(forbidden.status, 403);

  const validation = jsonError(new Error("Amount is required."));
  assert.equal(validation.status, 400);
});
