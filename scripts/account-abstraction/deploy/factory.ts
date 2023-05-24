import "dotenv/config";
import { DefenderRelayProvider, DefenderRelaySigner } from "defender-relay-client/lib/ethers";
import { ethers } from "hardhat";

/**
 * refs: https://github.com/safe-global/safe-contracts/blob/e870f514ad34cd9654c72174d6d4a839e3c6639f/CHANGELOG.md
 */
const SAFE_PROXY_FACTORY_ADDRESS = "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67";

/**
 * Custom Smart Account Singleton address.
 */
const SAFE_SINGLETON_ADDRESS = "0x2b00998C8c21d4398DA182BC0bEe3f2607F19275";

async function main() {
  if (!process.env.RELAYER_API_KEY || !process.env.RELAYER_API_SECRET) {
    throw new Error("Please set RELAYER_API_KEY and RELAYER_API_SECRET in your .env file");
  }

  const credentials = {
    apiKey: process.env.RELAYER_API_KEY,
    apiSecret: process.env.RELAYER_API_SECRET,
  };
  const provider = new DefenderRelayProvider(credentials);
  const relaySigner = new DefenderRelaySigner(credentials, provider, {
    speed: "average",
  });

  const factory = await ethers.getContractFactory("SmartAccountFactory");
  const connected = factory.connect(relaySigner);

  const ret = await connected.deploy(
    SAFE_PROXY_FACTORY_ADDRESS,
    SAFE_SINGLETON_ADDRESS,
    // admin
    "0x29573af24dab9dfe3119df08da8a0eeaa804e1ab",
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
