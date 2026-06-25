import { sms } from "tencentcloud-sdk-nodejs-sms";
import { getBackendConfig } from "./env";
import { HttpError } from "./errors";

const SmsClient = sms.v20210111.Client;

export interface SmsProviderResult {
  requestId: string;
}

export interface SendVerificationCodeInput {
  phone: string;
  code: string;
  challengeId: string;
  ttlSeconds: number;
}

export class TencentSmsService {
  async sendVerificationCode(input: SendVerificationCodeInput): Promise<SmsProviderResult> {
    const config = getBackendConfig();
    const client = new SmsClient({
      credential: {
        secretId: config.tencentCloudSecretId,
        secretKey: config.tencentCloudSecretKey,
      },
      region: config.tencentCloudSmsRegion,
      profile: {
        httpProfile: {
          endpoint: "sms.tencentcloudapi.com",
        },
      },
    });

    const response = await client.SendSms({
      PhoneNumberSet: [input.phone],
      SmsSdkAppId: config.tencentCloudSmsSdkAppId,
      SignName: config.tencentCloudSmsSignName,
      TemplateId: config.tencentCloudSmsTemplateId,
      TemplateParamSet: [
        input.code,
        String(Math.ceil(input.ttlSeconds / 60)),
      ],
      SessionContext: input.challengeId,
    }).catch((error) => {
      throw new HttpError(502, "SMS provider request failed", {
        reason: error instanceof Error ? error.name : "provider_error",
      });
    });

    const status = response.SendStatusSet?.[0];
    if (!status || String(status.Code || "").toLowerCase() !== "ok") {
      throw new HttpError(502, "SMS provider rejected the message", {
        code: status?.Code || "unknown",
      });
    }

    return {
      requestId: response.RequestId || status.SerialNo || "",
    };
  }
}
