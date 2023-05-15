// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/Create2.sol";
import "lib/@safe-contracts/contracts/proxies/SafeProxyFactory.sol";
import "lib/@safe-contracts/contracts/Safe.sol";
import "lib/@safe-contracts/contracts/handler/TokenCallbackHandler.sol";

/**
 * A wrapper factory contract to deploy GnosisSafe as an ERC-4337 account contract.
 * 
 * from ZeroDevGnosisSafeAccountFactory.sol in ZeroDev
 */
contract SmartAccountFactory {
    SafeProxyFactory public immutable proxyFactory;
    address public immutable safeSingleton;
    TokenCallbackHandler public immutable defaultCallback;

    event AccountCreated(address indexed account, address indexed owner, uint salt); 

    constructor(SafeProxyFactory _proxyFactory, address _safeSingleton) {
        proxyFactory = _proxyFactory;
        safeSingleton = _safeSingleton;
        defaultCallback = new TokenCallbackHandler();
    }

    function createAccount(address owner,uint256 salt) public returns (address account) {
        address addr = getAddress(owner, salt);
        uint codeSize = addr.code.length;
        if (codeSize > 0) {
            return addr;
        }
        account = address(proxyFactory.createProxyWithNonce(safeSingleton, getInitializer(owner), salt));

        emit AccountCreated(account, owner, salt); 
    }

    function getInitializer(address owner) internal view returns (bytes memory) {
        address[] memory owners = new address[](1);
        owners[0] = owner;
        uint threshold = 1;

        return abi.encodeCall(Safe.setup, (
            owners,
            threshold,
            address(0),
            "",
            address(defaultCallback),
            address(0), 0, payable(0) //no payment receiver
        ));
    }

    /**
     * calculate the counterfactual address of this account as it would be returned by createAccount()
     * (uses the same "create2 signature" used by SafeProxyFactory.createProxyWithNonce)
     */
    function getAddress(address owner,uint256 salt) public view returns (address) {
        bytes memory initializer = getInitializer(owner);
        //copied from deployProxyWithNonce
        bytes32 salt2 = keccak256(abi.encodePacked(keccak256(initializer), salt));
        bytes memory deploymentData = abi.encodePacked(proxyFactory.proxyCreationCode(), uint256(uint160(safeSingleton)));
        return Create2.computeAddress(bytes32(salt2), keccak256(deploymentData), address (proxyFactory));
    }
}
