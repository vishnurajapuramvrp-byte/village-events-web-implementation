import assert from "node:assert/strict";
import test from "node:test";
import { translate } from "./i18n";

test("translation keeps English copy unchanged", () => {
  assert.equal(translate("Dashboard", "en"), "Dashboard");
});

test("translation localizes known Telugu copy and preserves surrounding whitespace", () => {
  assert.equal(translate("  Dashboard  ", "te"), "  డాష్‌బోర్డ్  ");
});

test("translation leaves unknown and user-provided text unchanged", () => {
  assert.equal(translate("Ugadi Community Celebration", "te"), "Ugadi Community Celebration");
});
