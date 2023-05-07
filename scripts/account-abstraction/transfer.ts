import { ethers } from "ethers";
import { Client, Presets } from "userop";
import { CLIOpts, config } from "./config";
import { SmartAccountWithSafe } from "./builder/smartAccountWithSafe";

async function main() {
  // Safe Contract Address
  const t = "0x610CD2541b71a01A26A9E8A337A73522Fd263bfF";
  const amt = "0";
  const opts: CLIOpts = {
    dryRun: false,
    withPM: true,
  };

  const paymaster = opts.withPM
    ? Presets.Middleware.verifyingPaymaster(
        config.paymaster.rpcUrl,
        config.paymaster.context
      )
    : undefined;

  const simpleAccount = await SmartAccountWithSafe.init(
    new ethers.Wallet(config.signingKey),
    config.rpcUrl,
    config.entryPoint,
    config.factory,
    paymaster
  );
  const client = await Client.init(config.rpcUrl, config.entryPoint);

  const target = ethers.utils.getAddress(t);
  const value = ethers.utils.parseEther(amt);
  const res = await client.sendUserOperation(
    simpleAccount.execute(target, value, "0x"),
    {
      dryRun: opts.dryRun,
      onBuild: (op) => console.log("Signed UserOperation:", op),
    }
  );
  console.log(`UserOpHash: ${res.userOpHash}`);

  console.log("Waiting for transaction...");
  const ev = await res.wait();
  console.log(`Transaction hash: ${ev?.transactionHash ?? null}`);
}

// npx hardhat run scripts/account-abstraction/transfer.ts --network <NETWORK>
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
