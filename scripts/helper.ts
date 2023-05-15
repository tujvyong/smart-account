import { run } from "hardhat";

export async function verify(address: string, args: unknown[]) {
  try {
    console.log("Waiting 20 seconds for Etherscan to process contract...");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return await run("verify:verify", {
      address: address,
      constructorArguments: args,
    });
  } catch (e) {
    console.log(address, args, e);
  }
}
