import { ethers } from "ethers";
import { UserOperationMiddlewareFn } from "userop/dist/types";

export const EOASignature =
  (signer: ethers.Signer): UserOperationMiddlewareFn =>
  async (ctx) => {
    ctx.op.signature = await signer.signMessage(
      ethers.utils.arrayify(ctx.getUserOpHash())
    );
  };
