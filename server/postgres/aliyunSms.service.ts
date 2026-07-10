import { createRequire } from "node:module";
import { Config as OpenApiConfig } from "@alicloud/openapi-core/dist/utils.js";
import { getBackendConfig } from "./env";
import { HttpError } from "./errors";
import type { SendVerificationCodeInput, SmsProviderResult } from "./tencentSms.service";

const require = createRequire(__filename);
const DypnsapiModule = require("@alicloud/dypnsapi20170525") as {
  default: new (config: OpenApiConfig) => {
    sendSmsVerifyCode(request: unknown): Promise<{ body: any }>;
  };
  SendSmsVerifyCodeRequest: new (params: Record<string, unknown>) => unknown;
};
const DypnsapiClient = DypnsapiModule.default;
const SendSmsVerifyCodeRequest = DypnsapiModule.SendSmsVerifyCodeRequest;

const normalizePhoneForAliyun = (phone: string, countryCode: string) => {
  const compact = phone.replace(/[\s().-]/g, "");
  if (countryCode === "86" && compact.startsWith("+86")) {
    return compact.slice(3);
  }
  return compact.replace(/^\+/, "");
};

export class AliyunSmsService {
  async sendVerificationCode(input: SendVerificationCodeInput): Promise<SmsProviderResult> {
    const config = getBackendConfig();
    const client = new DypnsapiClient(new OpenApiConfig({
      accessKeyId: config.alibabaCloudAccessKeyId,
      accessKeySecret: config.alibabaCloudAccessKeySecret,
      regionId: config.aliyunDypnsRegion,
      endpoint: config.aliyunDypnsEndpoint,
    }));
    const templateParam = {
      [config.aliyunSmsCodeParamName]: input.code,
      [config.aliyunSmsMinParamName]: String(Math.ceil(input.ttlSeconds / 60)),
    };

    const response = await client.sendSmsVerifyCode(
      new SendSmsVerifyCodeRequest({
        countryCode: config.aliyunSmsCountryCode,
        phoneNumber: normalizePhoneForAliyun(input.phone, config.aliyunSmsCountryCode),
        signName: config.aliyunSmsSignName,
        templateCode: config.aliyunSmsTemplateCode,
        templateParam: JSON.stringify(templateParam),
        validTime: input.ttlSeconds,
        interval: config.smsSendCooldownSeconds,
        duplicatePolicy: 1,
        autoRetry: 1,
        returnVerifyCode: false,
        outId: input.challengeId,
      })
    ).catch((error) => {
      console.error("[AliyunSms] request_failed", {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        statusCode: error?.statusCode,
        requestId: error?.requestId,
      });
      const detail = [error?.code, error?.message].filter(Boolean).join(": ");
      throw new HttpError(502, detail ? `Sms provider unavailable: ${detail}` : "Sms provider unavailable");
    });

    const body = response.body;
    if (!body?.success || body.code !== "OK") {
      console.error("[AliyunSms] provider_rejected", {
        code: body?.code,
        message: body?.message,
        requestId: body?.requestId || body?.model?.requestId,
        success: body?.success,
      });
      const detail = [body?.code, body?.message].filter(Boolean).join(": ");
      throw new HttpError(502, detail ? `Sms provider unavailable: ${detail}` : "Sms provider unavailable");
    }

    return {
      requestId: body.model?.requestId || body.model?.bizId || body.requestId || "",
    };
  }
}
