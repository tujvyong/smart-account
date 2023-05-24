import { ethers } from "ethers";
import fs from "fs";

const generateSigningKey = () => {
  const signingKey = new ethers.Wallet(ethers.utils.randomBytes(32)).privateKey;
  const envContent = fs.readFileSync(".env", { encoding: "utf8", flag: "r" });
  const newEnvContent = envContent.replace(/^SIGNING_KEY=.*$/m, `SIGNING_KEY=${signingKey}`);
  fs.writeFileSync(".env", newEnvContent);

  return signingKey;
};

export const config = {
  rpcUrl: process.env.BUNDLER_URL || "",
  signingKey: process.env.SIGNING_KEY || generateSigningKey(),
  entryPoint: "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
  factory: "0xD86Ee185E1499b924716fF0F7e2c092AE3cA8912",
  paymaster: {
    rpcUrl: process.env.PAYMASTER_URL || "",
    context: { type: "payg" },
  },
};

export interface CLIOpts {
  dryRun: boolean;
  withPM: boolean;
}
