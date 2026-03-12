// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IQNS.sol";
import "./PollStorage.sol";

contract PollCreation {
    address public pollStorage;
    address public qnsContract;
    address payable public treasury;
    address payable public burnAddress;
    uint256 public creationFee;
    uint16 public treasuryBps;
    
    mapping(address => bool) public exemptAddresses;
    address public owner;

    uint256 constant MAX_QUESTION_LENGTH = 280;
    uint256 constant MAX_OPTION_LENGTH = 100;
    uint256 constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 constant MAX_OPTIONS = 10;
    uint256 constant MIN_OPTIONS = 2;
    uint256 constant MAX_DURATION_DAYS = 30;
    uint256 constant MIN_DURATION_DAYS = 1;

    bool private _locked;

    modifier nonReentrant() {
        require(!_locked, "Reentrant call");
        _locked = true;
        _;
        _locked = false;
    }

    event PollCreatedWithFee(
        uint256 indexed pollId,
        address indexed creator,
        uint256 feePaid
    );
    event FeeExemptionSet(address indexed addr, bool exempt);
    event CreationFeeSet(uint256 newFee);
    event TreasuryBpsSet(uint16 newBps);
    event TreasurySet(address newTreasury);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        address _pollStorage,
        address _qnsContract,
        address _treasury,
        address _burnAddress,
        uint256 _creationFee,
        uint16 _treasuryBps
    ) {
        require(_pollStorage != address(0), "Invalid PollStorage address");
        require(_qnsContract != address(0), "Invalid QNS address");
        require(_treasury != address(0), "Invalid treasury address");
        require(_treasuryBps <= 10000, "Treasury bps must be <= 10000");
        
        pollStorage = _pollStorage;
        qnsContract = _qnsContract;
        treasury = payable(_treasury);
        burnAddress = payable(_burnAddress);
        creationFee = _creationFee;
        treasuryBps = _treasuryBps;
        owner = msg.sender;
    }

    function createPoll(
        string calldata _question,
        string calldata _description,
        string[] calldata _options,
        uint8 _durationDays,
        PollStorage.EligibilityType _eligType,
        address _eligToken,
        uint256 _eligPodId
    ) external payable nonReentrant returns (uint256) {
        return _createPollInternal(
            _question,
            _description,
            _options,
            block.timestamp + (_durationDays * 86400),
            _eligType,
            _eligToken,
            _eligPodId
        );
    }

    function createPollCustomDuration(
        string calldata _question,
        string calldata _description,
        string[] calldata _options,
        uint256 _endTimestamp,
        PollStorage.EligibilityType _eligType,
        address _eligToken,
        uint256 _eligPodId
    ) external payable nonReentrant returns (uint256) {
        require(_endTimestamp > block.timestamp, "End time must be in future");
        require(_endTimestamp <= block.timestamp + (MAX_DURATION_DAYS * 86400), "Max duration 30 days");
        
        return _createPollInternal(
            _question,
            _description,
            _options,
            _endTimestamp,
            _eligType,
            _eligToken,
            _eligPodId
        );
    }

    function _createPollInternal(
        string calldata _question,
        string calldata _description,
        string[] calldata _options,
        uint256 _endTime,
        PollStorage.EligibilityType _eligType,
        address _eligToken,
        uint256 _eligPodId
    ) internal returns (uint256) {
        require(bytes(_question).length > 0 && bytes(_question).length <= MAX_QUESTION_LENGTH, "Question required, max 280 chars");
        require(bytes(_description).length <= MAX_DESCRIPTION_LENGTH, "Description max 1000 chars");
        require(_options.length >= MIN_OPTIONS && _options.length <= MAX_OPTIONS, "2-10 options required");
        
        for (uint256 i = 0; i < _options.length; i++) {
            require(bytes(_options[i]).length > 0 && bytes(_options[i]).length <= MAX_OPTION_LENGTH, "Option text required, max 100 chars");
        }

        // Verify caller has a .qf name using QNS resolver
        string memory qfName = IQNS(qnsContract).reverseResolve(msg.sender);
        require(bytes(qfName).length > 0, "QNS name required");

        if (!exemptAddresses[msg.sender]) {
            require(msg.value >= creationFee, "Insufficient fee");
            
            uint256 treasuryAmount = (creationFee * treasuryBps) / 10000;
            uint256 burnAmount = creationFee - treasuryAmount;
            
            // Send treasury portion
            (bool treasurySuccess, ) = treasury.call{value: treasuryAmount}("");
            require(treasurySuccess, "Treasury transfer failed");
            
            // Send burn portion (or to dead address if no burn address set)
            if (burnAddress != address(0)) {
                (bool burnSuccess, ) = burnAddress.call{value: burnAmount}("");
                require(burnSuccess, "Burn transfer failed");
            }
            
            // Refund excess if any
            uint256 excess = msg.value - creationFee;
            if (excess > 0) {
                (bool refundSuccess, ) = msg.sender.call{value: excess}("");
                require(refundSuccess, "Refund failed");
            }
        }

        uint256 pollId = PollStorage(pollStorage).createPoll(
            msg.sender,
            _question,
            _description,
            _options,
            block.timestamp,
            _endTime,
            _eligType,
            _eligToken,
            _eligPodId
        );

        emit PollCreatedWithFee(pollId, msg.sender, exemptAddresses[msg.sender] ? 0 : creationFee);
        return pollId;
    }

    function setExempt(address _addr, bool _exempt) external onlyOwner {
        exemptAddresses[_addr] = _exempt;
        emit FeeExemptionSet(_addr, _exempt);
    }

    function setCreationFee(uint256 _fee) external onlyOwner {
        creationFee = _fee;
        emit CreationFeeSet(_fee);
    }

    function setTreasuryBps(uint16 _bps) external onlyOwner {
        require(_bps <= 10000, "Treasury bps must be <= 10000");
        treasuryBps = _bps;
        emit TreasuryBpsSet(_bps);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasury = payable(_treasury);
        emit TreasurySet(_treasury);
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
