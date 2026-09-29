// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

import {SliverVineRiskOracle} from "./SliverVineRiskOracle.sol";

/// @title IngressSafetySwitch — venue-agnostic ingress safety filter (oracle flush + BlockedSignerRegistry)
contract IngressSafetySwitch {
    error OracleZero();
    error SeveredSignerZero();
    error SloTimeout();
    error SignerSevered();

    SliverVineRiskOracle public immutable riskOracle;
    /// @notice BlockedSignerRegistry — addresses with signing channel severed at ingress.
    mapping(address => bool) public severedSigners;

    bytes32 public constant ERR_SLO_TIMEOUT = keccak256("SLO_TIMEOUT");
    bytes32 public constant ERR_INVALID_SIGNER = keccak256("INVALID_SIGNER");

    event StatusRefreshed(address indexed target, uint256 timestamp);
    event EmergencyJumped(address indexed target, uint8 statusCode, uint256 timestamp);
    event ErrorTriggered(bytes32 indexed code, address indexed actor);

    constructor(address oracle_, address[] memory severedSigners_) {
        if (oracle_ == address(0)) revert OracleZero();
        riskOracle = SliverVineRiskOracle(oracle_);
        uint256 len = severedSigners_.length;
        for (uint256 i; i < len; ++i) {
            if (severedSigners_[i] == address(0)) revert SeveredSignerZero();
            severedSigners[severedSigners_[i]] = true;
        }
    }

    function isCompliant(address target) external view returns (bool) {
        if (riskOracle.isSystemFlushed() || riskOracle.statusCode() == riskOracle.STATUS_SHUTDOWN()) {
            return false;
        }
        return !severedSigners[target];
    }

    function gateAddress(address target) external {
        if (riskOracle.isSystemFlushed() || riskOracle.statusCode() == riskOracle.STATUS_SHUTDOWN()) {
            uint8 code = riskOracle.statusCode();
            emit EmergencyJumped(target, code, block.timestamp);
            emit ErrorTriggered(ERR_SLO_TIMEOUT, target);
            revert SloTimeout();
        }
        if (severedSigners[target]) {
            emit ErrorTriggered(ERR_INVALID_SIGNER, target);
            revert SignerSevered();
        }
        emit StatusRefreshed(target, block.timestamp);
    }
}
