// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IQFLinkPods - Interface for QFLink Pods
/// @notice Based on the real QFLinkPods/QFLinkPodsStorage/QFLinkPodsReader contracts
/// @dev Uses uint64 for podId to match the real implementation
interface IQFLinkPods {
    /// @notice Check if an address is a member of a pod
    /// @param podId The pod ID (uint64)
    /// @param user The address to check
    /// @return True if the user is a member of the pod
    function isMember(uint64 podId, address user) external view returns (bool);
    
    /// @notice Get the creator of a pod
    /// @param podId The pod ID (uint64)
    /// @return The creator's address
    function getCreator(uint64 podId) external view returns (address);
    
    /// @notice Get the total number of pods
    /// @return The pod count
    function getPodCount() external view returns (uint64);
    
    /// @notice Check if a user is banned from a pod
    /// @param podId The pod ID (uint64)
    /// @param user The address to check
    /// @return True if the user is banned
    function isBanned(uint64 podId, address user) external view returns (bool);
    
    /// @notice Check if a user has access to a pod (member or public pod)
    /// @param podId The pod ID (uint64)
    /// @param user The address to check
    /// @return True if the user has access
    function checkPodAccess(uint64 podId, address user) external view returns (bool);
}
