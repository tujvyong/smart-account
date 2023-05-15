import { ethers } from "hardhat";
import { verify } from "../helper";

async function main() {
  const contract = await ethers.getContractFactory("SmartAccountFactory");

  const smartAccount = contract.attach(
    "0xB1779A0c45989290a6eb4Db67DDc864F4D2520fc"
  );

  console.log("Verifying contract.");
  await verify(smartAccount.address, [
    "0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67",
    "0x7f328F4Ca30444B743FaEc26d71aaa9F5C422b95",
  ]);
}

// npx hardhat run scripts/account-abstraction/verify.ts --network <CHAIN_NETWORK>
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
