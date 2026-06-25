import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { getPool } from "../server/postgres/db";
import { PasswordService } from "../server/postgres/password.service";

const readHidden = (prompt: string) => new Promise<string>((resolve, reject) => {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    reject(new Error("An interactive terminal is required for hidden password input"));
    return;
  }

  let value = "";
  const finish = (error?: Error) => {
    stdin.off("data", onData);
    stdin.setRawMode(false);
    stdin.pause();
    stdout.write("\n");
    if (error) reject(error);
    else resolve(value);
  };
  const onData = (chunk: Buffer) => {
    const input = chunk.toString("utf8");
    for (const char of input) {
      if (char === "\u0003") {
        finish(new Error("Cancelled"));
        return;
      }
      if (char === "\r" || char === "\n") {
        finish();
        return;
      }
      if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
        continue;
      }
      value += char;
    }
  };

  stdout.write(prompt);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.on("data", onData);
});

const main = async () => {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("Run this script directly in an interactive local terminal");
  }

  const prompt = createInterface({ input: stdin, output: stdout });
  const phone = await prompt.question("Verified test phone (E.164): ");
  const displayName = await prompt.question("Display name (may repeat): ");
  prompt.close();

  const password = await readHidden("Password (10-128 characters, hidden): ");
  const confirmation = await readHidden("Confirm password (hidden): ");
  if (password !== confirmation) throw new Error("Passwords do not match");

  const result = await new PasswordService().provisionLocalTestPhoneUser({
    phone,
    password,
    displayName: displayName.trim() || undefined,
  });
  stdout.write(`${JSON.stringify(result, null, 2)}\n`);
};

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Test account provisioning failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool().end().catch(() => undefined);
  });
