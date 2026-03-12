// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PollStorage.sol";

contract ResultsReader {
    address public pollStorage;
    uint256 constant PERCENTAGE_MULTIPLIER = 10000;
    uint256 constant DEFAULT_PAGE_SIZE = 20;

    struct PollResults {
        string question;
        string description;
        string[] options;
        uint256[] voteCounts;
        uint256 totalVotes;
        uint256[] percentages;
        uint256 leadingOptionIndex;
        bool isActive;
    }

    struct PollSummary {
        uint256 id;
        string question;
        address creator;
        uint256 totalVotes;
        uint256 endTime;
        bool isActive;
    }

    struct UserVote {
        uint256 pollId;
        uint256 optionIndex;
    }

    constructor(address _pollStorage) {
        require(_pollStorage != address(0), "Invalid PollStorage address");
        pollStorage = _pollStorage;
    }

    function getPollResults(uint256 _pollId) external view returns (PollResults memory) {
        PollStorage pollStorageContract = PollStorage(pollStorage);
        PollStorage.Poll memory poll = pollStorageContract.getPoll(_pollId);
        
        require(poll.creator != address(0), "Poll not found");

        uint256[] memory voteCounts = new uint256[](poll.options.length);
        uint256[] memory percentages = new uint256[](poll.options.length);
        uint256 leadingOptionIndex = 0;
        uint256 maxVotes = 0;

        for (uint256 i = 0; i < poll.options.length; i++) {
            voteCounts[i] = pollStorageContract.getOptionVotes(_pollId, i);
            
            if (voteCounts[i] > maxVotes) {
                maxVotes = voteCounts[i];
                leadingOptionIndex = i;
            }
        }

        if (poll.totalVotes > 0) {
            for (uint256 i = 0; i < poll.options.length; i++) {
                percentages[i] = (voteCounts[i] * PERCENTAGE_MULTIPLIER) / poll.totalVotes;
            }
        }

        bool isActive = block.timestamp >= poll.startTime && block.timestamp < poll.endTime;

        return PollResults({
            question: poll.question,
            description: poll.description,
            options: poll.options,
            voteCounts: voteCounts,
            totalVotes: poll.totalVotes,
            percentages: percentages,
            leadingOptionIndex: leadingOptionIndex,
            isActive: isActive
        });
    }

    function getPollList(uint256 _offset, uint256 _limit) external view returns (PollSummary[] memory) {
        PollStorage pollStorageContract = PollStorage(pollStorage);
        uint256 pollCount = pollStorageContract.pollCount();
        
        if (_limit == 0) {
            _limit = DEFAULT_PAGE_SIZE;
        }
        
        uint256 end = _offset + _limit;
        if (end > pollCount) {
            end = pollCount;
        }
        
        uint256 resultCount = end > _offset ? end - _offset : 0;
        PollSummary[] memory summaries = new PollSummary[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            uint256 pollId = pollCount - 1 - (_offset + i);
            PollStorage.Poll memory poll = pollStorageContract.getPoll(pollId);
            
            summaries[i] = PollSummary({
                id: poll.id,
                question: _truncateString(poll.question, 60),
                creator: poll.creator,
                totalVotes: poll.totalVotes,
                endTime: poll.endTime,
                isActive: block.timestamp < poll.endTime && block.timestamp >= poll.startTime
            });
        }
        
        return summaries;
    }

    function getActivePollCount() external view returns (uint256) {
        PollStorage pollStorageContract = PollStorage(pollStorage);
        uint256 pollCount = pollStorageContract.pollCount();
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < pollCount; i++) {
            PollStorage.Poll memory poll = pollStorageContract.getPoll(i);
            if (block.timestamp < poll.endTime && block.timestamp >= poll.startTime) {
                activeCount++;
            }
        }
        
        return activeCount;
    }

    function getUserVotes(
        address _user,
        uint256 _offset,
        uint256 _limit
    ) external view returns (UserVote[] memory) {
        PollStorage pollStorageContract = PollStorage(pollStorage);
        uint256[] memory userPolls = pollStorageContract.getUserPollsVoted(_user);
        
        if (_limit == 0) {
            _limit = DEFAULT_PAGE_SIZE;
        }
        
        uint256 end = _offset + _limit;
        if (end > userPolls.length) {
            end = userPolls.length;
        }
        
        uint256 resultCount = end > _offset ? end - _offset : 0;
        UserVote[] memory votes = new UserVote[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            uint256 pollId = userPolls[userPolls.length - 1 - (_offset + i)];
            votes[i] = UserVote({
                pollId: pollId,
                optionIndex: pollStorageContract.getVoterChoice(pollId, _user)
            });
        }
        
        return votes;
    }

    function getUserVoteCount(address _user) external view returns (uint256) {
        return PollStorage(pollStorage).getUserPollsVoted(_user).length;
    }

    function getUserCreatedCount(address _user) external view returns (uint256) {
        return PollStorage(pollStorage).getUserPollsCreated(_user).length;
    }

    function getVoterList(
        uint256 _pollId,
        uint256 _offset,
        uint256 _limit
    ) external view returns (address[] memory) {
        PollStorage pollStorageContract = PollStorage(pollStorage);
        address[] memory voters = pollStorageContract.getPollVoters(_pollId);
        
        if (_limit == 0) {
            _limit = DEFAULT_PAGE_SIZE;
        }
        
        uint256 end = _offset + _limit;
        if (end > voters.length) {
            end = voters.length;
        }
        
        uint256 resultCount = end > _offset ? end - _offset : 0;
        address[] memory result = new address[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = voters[voters.length - 1 - (_offset + i)];
        }
        
        return result;
    }

    function getVoterCount(uint256 _pollId) external view returns (uint256) {
        return PollStorage(pollStorage).getPollVoters(_pollId).length;
    }

    function _truncateString(string memory _str, uint256 _maxLength) internal pure returns (string memory) {
        bytes memory strBytes = bytes(_str);
        if (strBytes.length <= _maxLength) {
            return _str;
        }
        
        bytes memory result = new bytes(_maxLength);
        for (uint256 i = 0; i < _maxLength; i++) {
            result[i] = strBytes[i];
        }
        
        return string(result);
    }
}
