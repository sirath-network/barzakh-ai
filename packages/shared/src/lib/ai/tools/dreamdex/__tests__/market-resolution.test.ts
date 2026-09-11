import assert from "node:assert/strict";
import { matchesMarketInterval } from "../api-client";

assert.equal(matchesMarketInterval("BTC-UP-5m", "5m"), true);
assert.equal(matchesMarketInterval("BTC-UP-15m", "5m"), false);
assert.equal(matchesMarketInterval("BTC-UP-15m", "15m"), true);
assert.equal(matchesMarketInterval("BTC-UP-1h", "1h"), true);

console.log("DreamDEX market interval resolution regression tests passed");
