// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20.sol";
import "./interfaces/IQFLinkPods.sol";
import "./interfaces/IQNS.sol";
import "./PollStorage.sol";

contract VoteAction {
    address public pollStorage;
    address public qflinkContract;
    address public qnsResolver;
    address public owner;
    uint256 public minQFBalance;

    bool private _locked;

    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    event VoteCast(
        uint256 indexed pollId,
        address indexed voter,
        uint256 optionIndex
    );
    event QFLinkContractSet(address qflinkContract);
    event QNSContractSet(address qnsResolver);
    event MinQFBalanceSet(uint256 minBalance);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _pollStorage) {
        require(_pollStorage != address(0), "Invalid PollStorage address");
        
        pollStorage = _pollStorage;
        minQFBalance = 0; // Default: any non-zero balance qualifies
        owner = msg.sender;
    }

    function vote(uint256 _pollId, uint256 _optionIndex) external nonReentrant {
        // Require QNS name to vote
        require(qnsResolver != address(0), "QNS resolver not set");
        string memory qfName = IQNS(qnsResolver).reverseResolve(msg.sender);
        require(bytes(qfName).length > 0, "QNS name required to vote");

        PollStorage pollStorageContract = PollStorage(pollStorage);
        PollStorage.Poll memory poll = pollStorageContract.getPoll(_pollId);
        
        require(poll.creator != address(0), "Poll not found");
        require(block.timestamp >= poll.startTime && block.timestamp < poll.endTime, "Poll not active");
        require(!pollStorageContract.getHasVoted(_pollId, msg.sender), "Already voted");
        require(_optionIndex < poll.options.length, "Invalid option");

        if (poll.eligibilityType == PollStorage.EligibilityType.QF_HOLDERS) {
            require(
                msg.sender.balance > minQFBalance,
                "Must hold QF (native balance required)"
            );
        } else if (poll.eligibilityType == PollStorage.EligibilityType.TOKEN_HOLDERS) {
            require(
                IERC20(poll.eligibilityToken).balanceOf(msg.sender) > 0,
                "Must hold required token"
            );
        } else if (poll.eligibilityType == PollStorage.EligibilityType.POD_MEMBERS) {
            require(
                IQFLinkPods(qflinkContract).isMember(uint64(poll.eligibilityPodId), msg.sender),
                "Not a pod member"
            );
        }

        pollStorageContract.recordVote(_pollId, msg.sender, _optionIndex);

        emit VoteCast(_pollId, msg.sender, _optionIndex);
    }

    function setQFLinkContract(address _qflink) external onlyOwner {
        require(_qflink != address(0), "Invalid address");
        qflinkContract = _qflink;
        emit QFLinkContractSet(_qflink);
    }

    function setQNSContract(address _qnsResolver) external onlyOwner {
        require(_qnsResolver != address(0), "Invalid address");
        qnsResolver = _qnsResolver;
        emit QNSContractSet(_qnsResolver);
    }

    function setMinQFBalance(uint256 _minBalance) external onlyOwner {
        minQFBalance = _minBalance;
        emit MinQFBalanceSet(_minBalance);
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        address previousOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }
}
