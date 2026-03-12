// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IQNS - Interface for QNS (QF Name Service) Resolver
/// @notice Based on the real QNSResolver contract at ../qns/contracts/QNSResolver.sol
interface IQNS {
    /// @notice Reverse resolve an address to its .qf name
    /// @param _addr The address to look up
    /// @return The .qf name (e.g., "alice.qf") or empty string if no name exists
    function reverseResolve(address _addr) external view returns (string memory);
    
    /// @notice Get the name for a given node
    /// @param node The namehash node
    /// @return The name associated with the node
    function name(bytes32 node) external view returns (string memory);
    
    /// @notice Get the address for a given node
    /// @param node The namehash node
    /// @return The address associated with the node
    function addr(bytes32 node) external view returns (address);
    
    /// @notice Get the reverse node for an address
    /// @param _addr The address to get the reverse node for
    /// @return The bytes32 reverse node
    function nameHash(address _addr) external view returns (bytes32);
}
