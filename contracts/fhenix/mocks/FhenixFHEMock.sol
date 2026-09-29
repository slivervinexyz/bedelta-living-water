// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.24;

/// @dev Phase-1 mock FHE surface — replace with @fhenixprotocol/contracts on Fhenix CoFHE deploy.
type euint32 is uint256;
type ebool is uint256;

struct inEuint32 {
    bytes data;
}

library FhenixFHEMock {
    uint256 internal constant EBOOL_TRUE = 1;
    uint256 internal constant EBOOL_FALSE = 0;

    error InvalidCiphertextLength();

    function asEuint32(uint32 value) internal pure returns (euint32) {
        return euint32.wrap(uint256(value));
    }

    function fromInEuint32(inEuint32 calldata input) internal pure returns (euint32) {
        if (input.data.length < 32) revert InvalidCiphertextLength();
        return euint32.wrap(uint256(bytes32(input.data[0:32])));
    }

    function lte(euint32 a, euint32 b) internal pure returns (ebool) {
        return ebool.wrap(euint32.unwrap(a) <= euint32.unwrap(b) ? EBOOL_TRUE : EBOOL_FALSE);
    }

    function packInEuint32(uint32 value) internal pure returns (inEuint32 memory) {
        bytes memory data = new bytes(32);
        assembly {
            mstore(add(data, 32), value)
        }
        return inEuint32({data: data});
    }
}
