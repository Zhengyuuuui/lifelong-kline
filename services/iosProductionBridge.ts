import { backendClient, type AppleReceiptPayload, type AppleSignInPayload } from "./backendClient";

type NativeApplePurchaseResult = AppleReceiptPayload & {
  productId: string;
  transactionId?: string;
};

type LifeKlineNativePlugin = {
  signInWithApple?: () => Promise<AppleSignInPayload>;
  requestWeChatLoginCode?: () => Promise<{ code: string; state?: string }>;
  purchaseAppleProduct?: (input: { productId: string }) => Promise<NativeApplePurchaseResult>;
  restoreApplePurchases?: () => Promise<{ purchases: NativeApplePurchaseResult[] }>;
};

const getNativePlugin = (): LifeKlineNativePlugin | null => {
  const global = globalThis as typeof globalThis & {
    Capacitor?: {
      Plugins?: Record<string, LifeKlineNativePlugin | undefined>;
    };
  };
  return global.Capacitor?.Plugins?.LifeKlineNative || null;
};

const isNativeRuntime = () => {
  const global = globalThis as typeof globalThis & {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      getPlatform?: () => string;
    };
  };
  return global.Capacitor?.isNativePlatform?.() === true || global.Capacitor?.getPlatform?.() === "ios";
};

const hasNativeMethod = <K extends keyof LifeKlineNativePlugin>(method: K) =>
  typeof getNativePlugin()?.[method] === "function";

const requireNativePlugin = () => {
  const plugin = getNativePlugin();
  if (!plugin) {
    throw new Error("LifeKlineNative Capacitor plugin is not available in this runtime.");
  }
  return plugin;
};

export const iosProductionBridge = {
  isNativeRuntime,

  isAvailable: () => Boolean(getNativePlugin()),

  supportsAppleSignIn: () => hasNativeMethod("signInWithApple"),

  supportsWeChatLogin: () => hasNativeMethod("requestWeChatLoginCode"),

  supportsApplePurchases: () => hasNativeMethod("purchaseAppleProduct"),

  supportsAppleRestore: () => hasNativeMethod("restoreApplePurchases"),

  signInWithApple: async () => {
    const plugin = requireNativePlugin();
    if (!plugin.signInWithApple) {
      throw new Error("Native Sign in with Apple bridge is not implemented.");
    }
    const payload = await plugin.signInWithApple();
    return backendClient.signInWithApple(payload);
  },

  signInWithWeChat: async () => {
    const plugin = requireNativePlugin();
    if (!plugin.requestWeChatLoginCode) {
      throw new Error("Native WeChat authorization bridge is not implemented.");
    }
    const payload = await plugin.requestWeChatLoginCode();
    if (!payload.code) {
      throw new Error("Native WeChat authorization did not return a code.");
    }
    return backendClient.signInWithWeChat(payload.code);
  },

  purchaseAppleProductReceipt: async (productId: string) => {
    const plugin = requireNativePlugin();
    if (!plugin.purchaseAppleProduct) {
      throw new Error("Native StoreKit purchase bridge is not implemented.");
    }
    return plugin.purchaseAppleProduct({ productId });
  },

  purchaseAppleProduct: async (productId: string) => {
    const purchase = await iosProductionBridge.purchaseAppleProductReceipt(productId);
    return backendClient.verifyAppleReceipt({
      receiptData: purchase.receiptData || purchase.receipt || purchase.purchaseToken,
      signedTransactionInfo: purchase.signedTransactionInfo,
      productId: purchase.productId,
      transactionId: purchase.transactionId,
      environment: purchase.environment || "auto",
    });
  },

  restoreApplePurchaseReceipts: async () => {
    const plugin = requireNativePlugin();
    if (!plugin.restoreApplePurchases) {
      throw new Error("Native StoreKit restore bridge is not implemented.");
    }
    return plugin.restoreApplePurchases();
  },

  restoreApplePurchases: async () => {
    const { purchases } = await iosProductionBridge.restoreApplePurchaseReceipts();
    const results = [];
    for (const purchase of purchases) {
      results.push(await backendClient.verifyAppleReceipt({
        receiptData: purchase.receiptData || purchase.receipt || purchase.purchaseToken,
        signedTransactionInfo: purchase.signedTransactionInfo,
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        environment: purchase.environment || "auto",
      }));
    }
    return results;
  },
};
