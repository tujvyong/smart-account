import { ethers } from "ethers";
import { SmartAccountWithSafe } from "./builder/smartAccountWithSafe";
import { config } from "./config";
import fs from "fs";

async function main() {
  const simpleAccount = await SmartAccountWithSafe.init(
    new ethers.Wallet(config.signingKey),
    config.rpcUrl,
    config.entryPoint,
    config.factory
  );
  const address = simpleAccount.getSender();

  console.log(`SmartAccount address: ${address}`);

  updateSmartAccountAddress(address);
}

const updateSmartAccountAddress = async (address: string) => {
  const file = fs.readFileSync("scripts/account-abstraction/transfer.ts", {
    encoding: "utf8",
    flag: "r",
  });
  const newEnvContent = file.replace(
    /(const t =\s*")[^"]+(")/,
    `$1${address}$2`
  );
  fs.writeFileSync("scripts/account-abstraction/transfer.ts", newEnvContent);
};

// npx hardhat run scripts/account-abstraction/address.ts --network <NETWORK>
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
