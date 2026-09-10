import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { isStrongPassword, safeRequestedDestination } from "./auth-security";

describe("authentication security helpers", () => {
  test("accepts strong passwords and rejects incomplete ones", () => {
    assert.equal(isStrongPassword("Upvero!Secure2026"), true);
    assert.equal(isStrongPassword("short1!A"), false);
    assert.equal(isStrongPassword("alllowercase123!"), false);
    assert.equal(isStrongPassword("NOLOWERCASE123!"), false);
    assert.equal(isStrongPassword("NoNumbersHere!"), false);
    assert.equal(isStrongPassword("NoSymbolsHere123"), false);
  });

  test("allows internal return paths", () => {
    assert.equal(safeRequestedDestination("?next=%2Fdraft%3Fwebsite%3D123"), "/draft?website=123");
  });

  test("rejects external and browser-normalized return paths", () => {
    assert.equal(safeRequestedDestination("?next=https%3A%2F%2Fevil.example"), "/dashboard");
    assert.equal(safeRequestedDestination("?next=%2F%2Fevil.example"), "/dashboard");
    assert.equal(safeRequestedDestination("?next=%2F%5Cevil.example"), "/dashboard");
    assert.equal(safeRequestedDestination("?next=%2Fsafe%0Apath"), "/dashboard");
  });
});
