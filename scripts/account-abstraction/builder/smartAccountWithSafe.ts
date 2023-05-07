import { BigNumberish, BytesLike, ethers } from "ethers";
import { UserOperationBuilder } from "userop";
import {
  EOASignature,
  estimateUserOperationGas,
  getGasPrice,
} from "./middleware";
import {
  EntryPoint,
  EntryPoint__factory,
  SmartAccountWithSafeFactory,
  SmartAccountWithSafeFactory__factory,
  EIP4337Manager as EIP4337ManagerImpl,
  EIP4337Manager__factory,
} from "../../../typechain";
import { UserOperationMiddlewareFn } from "userop/dist/types";

export class SmartAccountWithSafe extends UserOperationBuilder {
  private signer: ethers.Signer;
  private provider: ethers.providers.JsonRpcProvider;
  private entryPoint: EntryPoint;
  private factory: SmartAccountWithSafeFactory;
  private initCode: string;
  proxy: EIP4337ManagerImpl;

  private constructor(
    signer: ethers.Signer,
    ERC4337NodeRpc: string,
    entryPoint: string,
    factory: string
  ) {
    super();
    this.signer = signer;
    this.provider = new ethers.providers.JsonRpcProvider(ERC4337NodeRpc);
    this.entryPoint = EntryPoint__factory.connect(entryPoint, this.provider);
    this.factory = SmartAccountWithSafeFactory__factory.connect(
      factory,
      this.provider
    );
    this.initCode = "0x";
    this.proxy = EIP4337Manager__factory.connect(
      ethers.constants.AddressZero,
      this.provider
    );
  }

  private resolveAccount: UserOperationMiddlewareFn = async (ctx) => {
    ctx.op.nonce = await this.entryPoint.getNonce(ctx.op.sender, 0);
    ctx.op.initCode = ctx.op.nonce.eq(0) ? this.initCode : "0x";
  };

  public static async init(
    signingKey: ethers.Signer,
    ERC4337NodeRpc: string,
    entryPoint: string,
    factory: string,
    paymasterMiddleware?: UserOperationMiddlewareFn
  ): Promise<SmartAccountWithSafe> {
    const instance = new SmartAccountWithSafe(
      signingKey,
      ERC4337NodeRpc,
      entryPoint,
      factory
    );

    try {
      instance.initCode = ethers.utils.hexConcat([
        instance.factory.address,
        instance.factory.interface.encodeFunctionData("createAccount", [
          await instance.signer.getAddress(),
          ethers.BigNumber.from(0),
        ]),
      ]);
      await instance.entryPoint.callStatic.getSenderAddress(instance.initCode);

      throw new Error("getSenderAddress: unexpected result");
    } catch (error: any) {
      const addr = error?.errorArgs?.sender;
      if (!addr) throw error;

      instance.proxy = EIP4337Manager__factory.connect(addr, instance.provider);
    }

    const base = instance
      .useDefaults({
        sender: instance.proxy.address,
        signature: await instance.signer.signMessage(
          ethers.utils.arrayify(ethers.utils.keccak256("0xdead"))
        ),
      })
      .useMiddleware(instance.resolveAccount)
      .useMiddleware(getGasPrice(instance.provider));

    const withPM = paymasterMiddleware
      ? base.useMiddleware(paymasterMiddleware)
      : base.useMiddleware(estimateUserOperationGas(instance.provider));

    return withPM.useMiddleware(EOASignature(instance.signer));
  }

  execute(to: string, value: BigNumberish, data: BytesLike) {
    const operation = 0; // Call
    const opr = ethers.BigNumber.from(operation);

    return this.setCallData(
      this.proxy.interface.encodeFunctionData("executeAndRevert", [
        to,
        value,
        data,
        opr,
      ])
    );
  }
}
