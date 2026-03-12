// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IQFLinkPods.sol";
import "./PollStorage.sol";
import "./PollCreation.sol";

contract QFLinkPollBridge {
    address payable public pollCreation;
    address public qflinkRevenue;
    address public qflinkContract;
    uint256 public qflinkFee;
    address public owner;

    bool private _locked;

    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    event PodPollCreated(
        uint256 indexed podId,
        uint256 indexed pollId,
        address indexed creator
    );
    event QFLinkFeeSet(uint256 newFee);
    event QFLinkRevenueSet(address newRevenue);
    event QFLinkContractSet(address qflinkContract);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        address _pollCreation,
        address _qflinkRevenue,
        uint256 _qflinkFee
    ) {
        require(_pollCreation != address(0), "Invalid PollCreation address");
        require(_qflinkRevenue != address(0), "Invalid QFLink revenue address");
        
        pollCreation = payable(_pollCreation);
        qflinkRevenue = _qflinkRevenue;
        qflinkFee = _qflinkFee;
        owner = msg.sender;
    }

    function createPodPoll(
        uint256 _podId,
        string calldata _question,
        string[] calldata _options,
        uint8 _durationDays
    ) external payable nonReentrant returns (uint256) {
        require(qflinkContract != address(0), "QFLink not configured");
        require(
            IQFLinkPods(qflinkContract).getCreator(uint64(_podId)) == msg.sender,
            "Must be pod creator"
        );

        PollCreation pollCreationContract = PollCreation(pollCreation);
        uint256 quorumFee = pollCreationContract.creationFee();
        uint256 totalFee = quorumFee + qflinkFee;
        
        require(msg.value >= totalFee, "Insufficient fee");

        // Send QFLink fee to revenue address
        (bool qflinkSuccess, ) = qflinkRevenue.call{value: qflinkFee}("");
        require(qflinkSuccess, "QFLink fee transfer failed");

        // Forward quorumFee to PollCreation via payable call
        uint256 pollId = pollCreationContract.createPoll{value: quorumFee}(
            _question,
            "", // Empty description for pod polls
            _options,
            _durationDays,
            PollStorage.EligibilityType.POD_MEMBERS,
            address(0),
            _podId
        );

        // Refund excess if any
        uint256 excess = msg.value - totalFee;
        if (excess > 0) {
            (bool refundSuccess, ) = msg.sender.call{value: excess}("");
            require(refundSuccess, "Refund failed");
        }

        emit PodPollCreated(_podId, pollId, msg.sender);
        return pollId;
    }

    function setQFLinkFee(uint256 _fee) external onlyOwner {
        qflinkFee = _fee;
        emit QFLinkFeeSet(_fee);
    }

    function setQFLinkRevenue(address _addr) external onlyOwner {
        require(_addr != address(0), "Invalid address");
        qflinkRevenue = _addr;
        emit QFLinkRevenueSet(_addr);
    }

    function setQFLinkContract(address _qflink) external onlyOwner {
        require(_qflink != address(0), "Invalid address");
        qflinkContract = _qflink;
        emit QFLinkContractSet(_qflink);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        address previousOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }
    
    // Allow contract to receive native QF
    receive() external payable {}
}
