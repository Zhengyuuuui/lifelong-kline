import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export type XunhupayPayload = Record<string, unknown>;

const HASH_RE = /^[a-f0-9]{32}$/;
const TOTAL_FEE_RE = /^(0|[1-9]\d{0,13})\.\d{2}$/;

const normalizeValue = (value: unknown) => {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return normalizeValue(value[value.length - 1]);
  return String(value).trim();
};

const asciiCompare = (a: string, b: string) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const canonicalizeXunhuPayload = (payload: XunhupayPayload) =>
  Object.keys(payload)
    .filter((key) => key !== "hash" && normalizeValue(payload[key]) !== "")
    .sort(asciiCompare)
    .map((key) => `${key}=${normalizeValue(payload[key])}`)
    .join("&");

export const amountCentsToTotalFee = (amountCents: number) => {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new Error("amountCents must be a non-negative safe integer");
  }
  const yuan = Math.floor(amountCents / 100);
  const cents = amountCents % 100;
  return `${yuan}.${String(cents).padStart(2, "0")}`;
};

export const totalFeeToAmountCents = (totalFee: unknown) => {
  const value = normalizeValue(totalFee);
  if (!TOTAL_FEE_RE.test(value)) {
    throw new Error("total_fee must be a decimal string with exactly two fraction digits");
  }
  const [yuan, cents] = value.split(".");
  const amount = Number(BigInt(yuan) * 100n + BigInt(cents));
  if (!Number.isSafeInteger(amount)) {
    throw new Error("total_fee is too large");
  }
  return amount;
};

export const buildXunhuHash = (payload: XunhupayPayload, appSecret: string) => {
  if (!appSecret) throw new Error("Xunhupay app secret is required");
  return createHash("md5")
    .update(`${canonicalizeXunhuPayload(payload)}${appSecret}`)
    .digest("hex");
};

export const verifyXunhuHash = (payload: XunhupayPayload, appSecret: string) => {
  const receivedHash = normalizeValue(payload.hash).toLowerCase();
  if (!HASH_RE.test(receivedHash)) return false;
  const expectedHash = buildXunhuHash(payload, appSecret);
  const received = Buffer.from(receivedHash, "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
};

export const createNonceStr = () => randomBytes(16).toString("hex");

export const createMerchantOrderNo = () => {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
    String(now.getMilliseconds()).padStart(3, "0"),
  ].join("");
  return `LK${stamp}${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
};
