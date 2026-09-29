// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {FhenixFHEMock, euint32, ebool, inEuint32} from "./mocks/FhenixFHEMock.sol";

/// @title FhenixConfidentialGuard — mock FHE slippage limit gate (isolated; Phase-1 sponsor scaffold)
contract FhenixConfidentialGuard {
    error Unauthorized();
    error LimitNotSet();

    address public immutable admin;
    euint32 private encryptedSlippageLimit;
    bool private limitInitialized;

    event EncryptedLimitSet(address indexed admin, uint256 timestamp);

    constructor(address admin_) {
        if (admin_ == address(0)) revert Unauthorized();
        admin = admin_;
    }

    function setEncryptedLimit(inEuint32 calldata encryptedLimit) external {
        if (msg.sender != admin) revert Unauthorized();
        encryptedSlippageLimit = FhenixFHEMock.fromInEuint32(encryptedLimit);
        limitInitialized = true;
        emit EncryptedLimitSet(admin, block.timestamp);
    }

    /// @notice FHE comparison without decryption (mock: plaintext inside euint32 wrapper).
    function validateConfidentialIngress(inEuint32 calldata userIntent) external view returns (ebool) {
        if (!limitInitialized) revert LimitNotSet();
        euint32 intent = FhenixFHEMock.fromInEuint32(userIntent);
        return FhenixFHEMock.lte(intent, encryptedSlippageLimit);
    }
}
