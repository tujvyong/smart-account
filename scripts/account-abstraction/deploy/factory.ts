import "dotenv/config";
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from "defender-relay-client/lib/ethers";
import { ethers } from "hardhat";

/**
 * refs: https://github.com/safe-global/safe-contracts/blob/e870f514ad34cd9654c72174d6d4a839e3c6639f/CHANGELOG.md
 */
const SAFE_SINGLETON_ADDRESS = "0xc962E67D9490E154D81181879ddf4CD3b65D2132";
const SAFE_PROXY_FACTORY_ADDRESS = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";

/**
 * deployed by scripts/account-abstraction/deploy/manager.ts
 */
const EIP4337_MANAGER_ADDRESS = "0xA9cc04728F99c3b1C8DCF25Ce8F48B295264956b";

async function main() {
  if (!process.env.RELAYER_API_KEY || !process.env.RELAYER_API_SECRET) {
    throw new Error(
      "Please set RELAYER_API_KEY and RELAYER_API_SECRET in your .env file"
    );
  }

  const credentials = {
    apiKey: process.env.RELAYER_API_KEY,
    apiSecret: process.env.RELAYER_API_SECRET,
  };
  const provider = new DefenderRelayProvider(credentials);
  const relaySigner = new DefenderRelaySigner(credentials, provider, {
    speed: "fast",
  });

  const factory = await ethers.getContractFactory(
    "SmartAccountWithSafeFactory"
  );
  const connected = factory.connect(relaySigner);

  const ret = await connected.deploy(
    SAFE_PROXY_FACTORY_ADDRESS,
    SAFE_SINGLETON_ADDRESS,
    EIP4337_MANAGER_ADDRESS
  );
  console.log("==SmartAccountFactory addr=", ret.address);
}

// npx hardhat run scripts/account-abstraction/deploy/factory.ts --network <CHAIN_NETWORK>
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
