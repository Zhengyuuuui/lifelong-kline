import DypnsapiClient, { SendSmsVerifyCodeRequest } from "@alicloud/dypnsapi20170525";
import { Config as OpenApiConfig } from "@alicloud/openapi-core/dist/utils.js";
import { getBackendConfig } from "./env";
import { HttpError } from "./errors";
import type { SendVerificationCodeInput, SmsProviderResult } from "./tencentSms.service";

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
    ).catch(() => {
      throw new HttpError(502, "Sms provider unavailable");
    });

    const body = response.body;
    if (!body?.success || body.code !== "OK") {
      throw new HttpError(502, "Sms provider unavailable");
    }

    return {
      requestId: body.model?.requestId || body.model?.bizId || body.requestId || "",
    };
  }
}
