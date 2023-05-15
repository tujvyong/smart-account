import "dotenv/config";
import {
  DefenderRelayProvider,
  DefenderRelaySigner,
} from "defender-relay-client/lib/ethers";
import { ethers } from "hardhat";

/**
 * EntryPoint address.
 */
const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";

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

  const contract = await ethers.getContractFactory("SmartAccount");
  const connected = contract.connect(relaySigner);

  const ret = await connected.deploy(ENTRYPOINT_ADDRESS);

  console.log("==Singleton addr=", ret.address);
}

// npx hardhat run scripts/account-abstraction/deploy/singleton.ts --network <CHAIN_NETWORK>
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
