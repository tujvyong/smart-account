// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity >=0.8.0 <0.9.0;

import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

import "lib/@account-abstraction/contracts/interfaces/UserOperation.sol";
import "lib/@account-abstraction/contracts/interfaces/IAccount.sol";
import "lib/@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import 'lib/@account-abstraction/contracts/utils/Exec.sol';
import "lib/@safe-contracts/contracts/handler/HandlerContext.sol";
import "lib/@safe-contracts/contracts/handler/CompatibilityFallbackHandler.sol";
import "lib/@safe-contracts/contracts/Safe.sol";

/// @title SmartAccount
contract SmartAccount is Safe, IAccount {
    using ECDSA for bytes32;
    // using UserOperationLib for UserOperation;
    
    // return value in case of signature failure, with no time-range.
    // equivalent to _packValidationData(true,0,0);
    uint256 internal constant SIG_VALIDATION_FAILED = 1;

    address public _entryPoint;

    constructor(address entryPoint) {
        _entryPoint = entryPoint;
    }

    /**
     * Helper for wallet to get the next nonce.
     * 
     * from EIP4337Manager.sol in account-abstraction v0.6
     */
    function getNonce() public view returns (uint256) {
        return IEntryPoint(_entryPoint).getNonce(address(this), 0);
    }

    // from EIP4337Manager.sol in account-abstraction v0.6
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external override returns (uint256 validationData) {
        address msgSender = address(bytes20(msg.data[msg.data.length - 20:]));
        require(msgSender == _entryPoint, 'account: not from entrypoint');

        // from EIP4337Manager.sol in account-abstraction v0.6
        Safe pThis = Safe(payable(address(this)));
        bytes32 hash = userOpHash.toEthSignedMessageHash();
        address recovered = hash.recover(userOp.signature);
        require(threshold == 1, 'account: only threshold 1');
        if (!pThis.isOwner(recovered)) {
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
        address msgSender = address(bytes20(msg.data[msg.data.length - 20:]));
        require(msgSender == _entryPoint, 'account: not from EntryPoint');

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

    // from CandideWallet.sol in CandideWalletContracts
    /// @dev There should be only one verified entrypoint per chain
    /// @dev so this function should only be used if there is a problem with
    /// @dev the main entrypoint
    function replaceEntrypoint(address newEntrypoint) public authorized {
        _entryPoint = newEntrypoint;
    }
}