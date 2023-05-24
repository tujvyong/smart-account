import { expect } from "chai";
import { ethers } from "hardhat";
import { Create2Factory } from "../lib/@account-abstraction/src/Create2Factory";
import { fillAndSign } from "./utils/UserOp";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import {
  EntryPoint,
  EntryPoint__factory,
  SafeProxy,
  SafeProxyFactory__factory,
  SmartAccount,
  SmartAccountFactory__factory,
  SmartAccount__factory,
} from "../typechain";

describe("AccessControlManager", async function () {
  describe("Owner/Role", async function () {
    const setup = async function () {
      const [owner, admin] = await ethers.getSigners();

      // 1. deploy EntryPoint
      // 2. deploy Singleton
      // 3. deploy SafeProxyFactory
      // 4. deploy SmartAccountFactory
      const entryPoint = await deployEntryPoint();

      const singleton = await new SmartAccount__factory(admin).deploy(entryPoint.address);

      const proxyFactory = await new SafeProxyFactory__factory(admin).deploy();

      const factory = await new SmartAccountFactory__factory(admin).deploy(
        proxyFactory.address,
        singleton.address,
        admin.address,
      );

      // TODO: create SmartAccount test case
      await factory.createAccount(owner.address, 0).then((tx) => tx.wait());

      // we use our factory to create and configure the proxy.
      // but the actual deployment is done internally by the safe proxy factory
      const ev = await proxyFactory.queryFilter(proxyFactory.filters.ProxyCreation());
      const addr = ev[0].args.proxy;

      const proxy = SmartAccount__factory.connect(addr, owner);
      return { entryPoint, singleton, proxyFactory, factory, proxy };
    };

    it("isOwner", async function () {
      const { singleton, entryPoint, proxy } = await loadFixture(setup);
      const [owner, admin] = await ethers.getSigners();

      expect(await proxy.isOwner(owner.address)).to.eq(true);

      await admin.sendTransaction({
        to: proxy.address,
        value: ethers.utils.parseEther("0.1"),
      });

      const op = await fillAndSign(
        {
          sender: proxy.address,
          callGasLimit: 1e6,
          callData: singleton.interface.encodeFunctionData("executeAndRevert", [owner.address, 0, "0x", 0]),
        },
        owner,
        entryPoint,
      );

      const rcpt = await entryPoint.handleOps([op], owner.address).then((tx) => tx.wait());

      const event = rcpt.events?.find((e) => e.event === "UserOperationEvent");
      expect(event).to.not.be.undefined;
      expect(event?.args?.success).to.eq(true);
    });

    it("gaudiy admin is default admin role", async function () {
      const { proxy } = await loadFixture(setup);
      const [_owner, admin] = await ethers.getSigners();

      expect(await proxy.hasRole(ethers.constants.HashZero, admin.address)).to.eq(true);
    });

    it("owner can not transferOwnership", async function () {
      const { proxy } = await loadFixture(setup);
      const [owner, _admin, newOwner] = await ethers.getSigners();

      await expect(proxy.connect(owner).transferOwnership(newOwner.address)).to.be.revertedWith(
        `AccessControl: account ${owner.address.toLowerCase()} is missing role ${await proxy.DEFAULT_ADMIN_ROLE()}`,
      );
    });

    it("admin can transferOwnership", async function () {
      const { proxy } = await loadFixture(setup);
      const [_owner, admin, newOwner] = await ethers.getSigners();

      await proxy.connect(admin).transferOwnership(newOwner.address);
      expect(await proxy.isOwner(newOwner.address)).to.eq(true);
    });
  });
});

const deployEntryPoint = async (provider = ethers.provider): Promise<EntryPoint> => {
  const create2factory = new Create2Factory(provider);
  const epf = new EntryPoint__factory(provider.getSigner());
  const addr = await create2factory.deploy(epf.bytecode, 0, process.env.COVERAGE != null ? 20e6 : 8e6);
  return EntryPoint__factory.connect(addr, provider.getSigner());
};
