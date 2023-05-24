// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <0.9.0;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

import "lib/@account-abstraction/contracts/interfaces/UserOperation.sol";
import "lib/@account-abstraction/contracts/interfaces/IAccount.sol";
import "lib/@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import 'lib/@account-abstraction/contracts/utils/Exec.sol';
import "lib/@safe-contracts/contracts/common/Singleton.sol";
import "lib/@safe-contracts/contracts/base/ModuleManager.sol";
import "lib/@safe-contracts/contracts/base/FallbackManager.sol";
import "lib/@safe-contracts/contracts/base/GuardManager.sol";

import "./manager/AccessControlManager.sol";

import "hardhat/console.sol";

/// @title SmartAccount
// StorageAccessible
contract SmartAccount is 
    Singleton,
    AccessControlManager,
    ModuleManager,
    FallbackManager,
    GuardManager,
    IAccount
{
    using ECDSA for bytes32;
    // using UserOperationLib for UserOperation;
    
    // return value in case of signature failure, with no time-range.
    // equivalent to _packValidationData(true,0,0);
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    address public immutable entryPoint;

    constructor(address _entryPoint) {
        entryPoint = _entryPoint;
    }

    // initialize the singleton
    // entryPoint()
    // preUpgradeTo()
    // getDeposit()
    // addDeposit()
    // withdrawDepositTo()

    /**
     * @notice Sets an initial storage of the Safe contract.
     * @dev This method can only be called once.
     *      If a proxy was created without setting up, anyone can call setup and claim the proxy.
     * @param _owner List of Safe owners.
     * @param to Contract address for optional delegate call.
     * @param data Data payload for optional delegate call.
     * @param fallbackHandler Handler for fallback calls to this contract
     */
    function setup(
        address _owner,
        address _admin,
        address to,
        bytes calldata data,
        address fallbackHandler
    ) external {
        // setupOwners checks if the Threshold is already set, therefore preventing that this method is called twice
        initializeAccessControl(_owner, _admin);
        if (fallbackHandler != address(0)) internalSetFallbackHandler(fallbackHandler);
        // As setupOwners can only be called if the contract has not been initialized we don't need a check for setupModules
        setupModules(to, data);
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    // from EIP4337Manager.sol in account-abstraction v0.6
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        console.log(
            "[validateUserOp] msg.sender %s = entrypoint %s",
            msg.sender,
            entryPoint
        );
        require(msg.sender == entryPoint, 'account: not from entrypoint');

        // from EIP4337Manager.sol in account-abstraction v0.6
        // Safe pThis = Safe(payable(address(this)));
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address recovered = hash.recover(userOp.signature);
        // require(threshold == 1, 'account: only threshold 1');
        if (!isOwner(recovered)) {
            validationData = SIG_VALIDATION_FAILED;
        }

        // mimic normal Safe nonce behaviour: prevent parallel nonces
        require(userOp.nonce < type(uint64).max, 'account: nonsequential nonce');

        if (missingAccountFunds > 0) {
            //Note: MAY pay more than the minimum, to deposit for future transactions
            (bool success, ) = payable(msg.sender).call{ value: missingAccountFunds }(''); // [original code]: (bool success, ) = payable(msgSender).call{ value: missingAccountFunds }('');
            (success);
            //ignore failure (its EntryPoint's job to verify, not account.)
        }
    }

    /**
     * Execute a call but also revert if the execution fails.
     * The default behavior of the Safe is to not revert if the call fails,
     * which is challenging for integrating with ERC4337 because then the
     * EntryPoint wouldn't know to emit the UserOperationRevertReason event,
     * which the frontend/client uses to capture the reason for the failure.
     */
    function executeAndRevert(address to, uint256 value, bytes memory data, Enum.Operation operation) external {
        require(msg.sender == entryPoint, 'account: not from EntryPoint');

        // from EIP4337Manager.sol in account-abstraction v0.6
        bool success = execute(to, value, data, operation, type(uint256).max);

        bytes memory returnData = Exec.getReturnData(type(uint256).max);
        // Revert with the actual reason string
        // Adopted from: https://github.com/Uniswap/v3-periphery/blob/464a8a49611272f7349c970e0fadb7ec1d3c1086/contracts/base/Multicall.sol#L16-L23
        if (!success) {
            if (returnData.length < 68) revert();
            assembly {
                returnData := add(returnData, 0x04)
            }
            revert(abi.decode(returnData, (string)));
        }
    }
}
