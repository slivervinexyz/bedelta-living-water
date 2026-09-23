// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {SliverVineGate} from "../SliverVineGate/src/SliverVineGate.sol";
import {SliverVineRiskOracle} from "../contracts/SliverVineRiskOracle.sol";
import {IngressSafetySwitch} from "../contracts/IngressSafetySwitch.sol";

/// @title DeploySepoliaGate — Arbitrum Sepolia (421614) gate + compliance stack
/// @notice Deploys SliverVineGate, SliverVineRiskOracle, and IngressSafetySwitch;
///         records SliverVineSoilCoprocessor (Stylus) deployment reference;
///         prints Arbiscan verification parameters for grant diligence.
///
/// Usage:
///   forge script scripts/deploy-sepolia-gate.sol:DeploySepoliaGate \
///     --rpc-url $ARB_SEPOLIA_RPC_URL --broadcast --verify \
///     --etherscan-api-key $ARBISCAN_API_KEY
///
/// Required env:
///   PRIVATE_KEY, GATE_SIGNERS (comma-separated, strictly ascending), GATE_THRESHOLD,
///   GUARDIAN, GATE_ADMIN, RISK_ORACLE_SIGNER
///
/// Optional env:
///   SLO_WINDOW_SEC (default 300), RH_BLACKLIST (comma-separated addresses),
///   SOIL_COPROCESSOR_ADDRESS (Stylus coprocessor deployed via cargo stylus)
contract DeploySepoliaGate is Script {
    uint256 internal constant ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

    struct DeployResult {
        SliverVineGate gate;
        SliverVineRiskOracle riskOracle;
        IngressSafetySwitch safetySwitch;
        bytes gateCtorArgs;
        bytes oracleCtorArgs;
        bytes switchCtorArgs;
    }

    function run() external {
        require(block.chainid == ARBITRUM_SEPOLIA_CHAIN_ID, "EXPECTED_ARBITRUM_SEPOLIA_421614");
        DeployResult memory result = _deploy();
        _logVerification(result);
    }

    function _deploy() internal returns (DeployResult memory result) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address[] memory signers = vm.envAddress("GATE_SIGNERS", ",");
        uint8 threshold = uint8(vm.envUint("GATE_THRESHOLD"));
        address guardian = vm.envAddress("GUARDIAN");
        address gateAdmin = vm.envAddress("GATE_ADMIN");
        address riskOracleSigner = vm.envAddress("RISK_ORACLE_SIGNER");
        uint256 sloWindowSec = vm.envOr("SLO_WINDOW_SEC", uint256(300));
        address[] memory blacklist = _readBlacklist();

        for (uint256 i = 1; i < signers.length; ++i) {
            require(signers[i] > signers[i - 1], "GATE_SIGNERS must be strictly ascending");
        }

        vm.startBroadcast(deployerKey);

        result.gate = new SliverVineGate(signers, threshold, guardian, gateAdmin);
        result.riskOracle = new SliverVineRiskOracle(riskOracleSigner, sloWindowSec);
        result.safetySwitch = new IngressSafetySwitch(address(result.riskOracle), blacklist);

        vm.stopBroadcast();

        result.gateCtorArgs = abi.encode(signers, threshold, guardian, gateAdmin);
        result.oracleCtorArgs = abi.encode(riskOracleSigner, sloWindowSec);
        result.switchCtorArgs = abi.encode(address(result.riskOracle), blacklist);
    }

    function _logVerification(DeployResult memory result) internal view {
        console2.log("chainId                 ", block.chainid);
        console2.log("SliverVineGate          ", address(result.gate));
        console2.log("SliverVineRiskOracle    ", address(result.riskOracle));
        console2.log("IngressSafetySwitch     ", address(result.safetySwitch));
        console2.log("SliverVineSoilCoprocessor (Stylus)", vm.envOr("SOIL_COPROCESSOR_ADDRESS", address(0)));
        console2.log("  deploy: cd contracts/stylus-probe && cargo stylus deploy --network arbitrum-sepolia");
        console2.log("  verify: cargo stylus verify --network arbitrum-sepolia");
        console2.log("domainSeparator         ");
        console2.logBytes32(result.gate.domainSeparator());
        console2.log("");
        console2.log("--- Arbiscan Sepolia verification (https://sepolia.arbiscan.io) ---");
        console2.log("forge verify-contract <addr> <path>:<Contract> --chain-id 421614 --constructor-args-hex <hex> --watch");
        console2.log("SliverVineGate path: SliverVineGate/src/SliverVineGate.sol:SliverVineGate");
        console2.log("RiskOracle path: contracts/SliverVineRiskOracle.sol:SliverVineRiskOracle");
        console2.log("SafetySwitch path: contracts/IngressSafetySwitch.sol:IngressSafetySwitch");
        console2.log("gateCtorArgsHex   ");
        console2.logBytes(result.gateCtorArgs);
        console2.log("oracleCtorArgsHex ");
        console2.logBytes(result.oracleCtorArgs);
        console2.log("switchCtorArgsHex ");
        console2.logBytes(result.switchCtorArgs);
    }

    function _readBlacklist() internal view returns (address[] memory blacklist) {
        string memory raw = vm.envOr("RH_BLACKLIST", string(""));
        if (bytes(raw).length == 0) {
            return new address[](0);
        }
        return vm.envAddress("RH_BLACKLIST", ",");
    }
}
