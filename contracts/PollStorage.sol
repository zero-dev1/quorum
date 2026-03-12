// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PollStorage {
    enum EligibilityType {
        OPEN,
        QF_HOLDERS,
        TOKEN_HOLDERS,
        POD_MEMBERS
    }

    struct Poll {
        uint256 id;
        address creator;
        string question;
        string description;
        string[] options;
        uint256 startTime;
        uint256 endTime;
        EligibilityType eligibilityType;
        address eligibilityToken;
        uint256 eligibilityPodId;
        bool isListed;
        uint256 totalVotes;
    }

    mapping(uint256 => Poll) public polls;
    mapping(uint256 => mapping(uint256 => uint256)) public optionVotes;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => uint256)) public voterChoice;
    mapping(address => bool) public authorizedContracts;
    mapping(uint256 => address[]) public pollVoters;
    mapping(address => uint256[]) public userPollsVoted;
    mapping(address => uint256[]) public userPollsCreated;

    uint256 public pollCount;
    address public owner;

    event PollCreated(
        uint256 indexed pollId,
        address indexed creator,
        string question,
        uint256 endTime
    );
    event VoteRecorded(
        uint256 indexed pollId,
        address indexed voter,
        uint256 optionIndex
    );
    event AuthorizationSet(address indexed contractAddress, bool status);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedContracts[msg.sender], "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setAuthorized(address _contract, bool _status) external onlyOwner {
        authorizedContracts[_contract] = _status;
        emit AuthorizationSet(_contract, _status);
    }

    function getAuthorized(address _contract) external view returns (bool) {
        return authorizedContracts[_contract];
    }

    function createPoll(
        address _creator,
        string calldata _question,
        string calldata _description,
        string[] calldata _options,
        uint256 _startTime,
        uint256 _endTime,
        EligibilityType _eligType,
        address _eligToken,
        uint256 _eligPodId
    ) external onlyAuthorized returns (uint256) {
        uint256 pollId = pollCount;
        
        polls[pollId] = Poll({
            id: pollId,
            creator: _creator,
            question: _question,
            description: _description,
            options: _options,
            startTime: _startTime,
            endTime: _endTime,
            eligibilityType: _eligType,
            eligibilityToken: _eligToken,
            eligibilityPodId: _eligPodId,
            isListed: true,
            totalVotes: 0
        });

        userPollsCreated[_creator].push(pollId);
        pollCount++;

        emit PollCreated(pollId, _creator, _question, _endTime);
        return pollId;
    }

    function recordVote(
        uint256 _pollId,
        address _voter,
        uint256 _optionIndex
    ) external onlyAuthorized {
        require(!hasVoted[_pollId][_voter], "Already voted");
        require(_optionIndex < polls[_pollId].options.length, "Invalid option");

        hasVoted[_pollId][_voter] = true;
        voterChoice[_pollId][_voter] = _optionIndex;
        optionVotes[_pollId][_optionIndex]++;
        polls[_pollId].totalVotes++;
        
        pollVoters[_pollId].push(_voter);
        userPollsVoted[_voter].push(_pollId);

        emit VoteRecorded(_pollId, _voter, _optionIndex);
    }

    function getPoll(uint256 _pollId) external view returns (Poll memory) {
        return polls[_pollId];
    }

    function getOptionVotes(uint256 _pollId, uint256 _optionIndex) external view returns (uint256) {
        return optionVotes[_pollId][_optionIndex];
    }

    function getHasVoted(uint256 _pollId, address _voter) external view returns (bool) {
        return hasVoted[_pollId][_voter];
    }

    function getVoterChoice(uint256 _pollId, address _voter) external view returns (uint256) {
        return voterChoice[_pollId][_voter];
    }

    function getPollVoters(uint256 _pollId) external view returns (address[] memory) {
        return pollVoters[_pollId];
    }

    function getUserPollsVoted(address _user) external view returns (uint256[] memory) {
        return userPollsVoted[_user];
    }

    function getUserPollsCreated(address _user) external view returns (uint256[] memory) {
        return userPollsCreated[_user];
    }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "Invalid address");
        address previousOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }
}
