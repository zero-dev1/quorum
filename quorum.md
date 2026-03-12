QUORUM — Complete Build Specification
Version: 1.0 Date: March 12, 2026 Status: Final — ready for implementation

1. OVERVIEW
QUORUM is an on-chain polling dApp for QF Network. Every vote is a transaction. Every result is permanent. It is Snapshot but on-chain, made viable by QF Network's 100ms block time and negligible gas fees.

QUORUM integrates with QNS (.qf name service) for voter identity, QFLink (on-chain chat pods) for embedded poll creation, and QFPad (token launch platform) for community polling.

One-liner: "Every Vote. On-Chain. Final."

2. NETWORK & ENVIRONMENT
Chain: QF Network Mainnet Chain ID: 42 RPC: https://archive.mainnet.qfnode.net/eth EVM Compatibility: Full — standard Solidity, standard ERC-20 interface for token-gating Wallet: MetaMask only (no WalletConnect, no other wallets in V1) Token: QF (post-migration supply 500M, ~$0.01 per QF at $5M market cap) Deploy tooling: viem (TypeScript) Frontend hosting: Vercel Deploy output files: deployments.json (contract addresses + ABIs), vercel-env.txt (environment variables for frontend)

3. BRAND IDENTITY
Name: QUORUM Tagline: "Every Vote. On-Chain. Final." Color — Primary Accent: Electric Indigo #6366F1 Color — Primary Hover: #818CF8 Color — Background: #0C0A09 Color — Surface/Cards: #1C1917 Color — Border: #292524 (always 1px solid) Color — Text Primary: #FAFAF9 Color — Text Secondary: #A8A29E Color — Text Mono/Data: #E7E5E4 Color — Text Muted: #57534E Color — Success: #22C55E Color — Warning: #EAB308 Color — Error: #EF4444 Border Radius: 0px — everywhere, no exceptions Font — Headlines/Logo: Syne (Google Fonts), weight 700–800 Font — Body/UI: Geist (Google Fonts / Vercel), weights 400, 500, 600 Font — Data/Mono: Geist Mono (Google Fonts / Vercel), weight 400 Logo: The word "QUORUM" typeset in Syne Bold, uppercase, slightly tracked, white on dark. No icon, no symbol — text only.

4. ECONOMIC MODEL
4.1 Poll Creation Fee (Standalone)
Amount: 100 QF (~$1.00 at current valuation) Split: 50% treasury (50 QF) / 50% burn (50 QF) Stored as: creationFee (uint256) and treasuryBps (uint16, default 5000 = 50%) in PollCreation contract Configurable: Yes — contract owner can adjust fee amount and split ratio Burn mechanism: Transfer to address(0) or a designated burn address

4.2 QFLink Embedded Poll Fee
Total charged to user: 150 QF (~$1.50) Breakdown: 100 QF → QUORUM PollCreation contract (follows standard treasury/burn split); 50 QF → QFLink revenue address Handled by: QFLinkPollBridge contract, which collects 150 QF, forwards 100 QF to PollCreation, retains 50 QF

4.3 Voting
Cost: Free (gas only, negligible on QF Network) No fee for voting — ever. This is a hard design principle. Maximum participation is the goal.

4.4 Fee Exemptions
Whitelist: An exemptAddresses mapping in PollCreation. Addresses in this mapping pay zero creation fee. Use case: Team multisig, official governance address, ecosystem partners Managed by: Contract owner

4.5 Future Revenue (V2+)
Premium features (extended durations, more than 10 options, featured placement, poll templates) can carry additional fees. The contract architecture supports this without redeployment by adding fee tiers. Not implemented in V1.

5. SMART CONTRACT ARCHITECTURE
Five contracts, deployed in order. Each contract that writes to PollStorage must be authorized via the authorization mapping in PollStorage.

5.1 PollStorage.sol — Central Data Contract
Purpose: Stores all poll data and vote records. The single source of truth. Only authorized contracts can write. Anyone can read.

Data Structures:

struct Poll {
    uint256 id;
    address creator;
    string question;
    string[] options;
    uint256 startTime;
    uint256 endTime;
    EligibilityType eligibilityType;
    address eligibilityToken;     // address(0) if not token-gated
    uint256 eligibilityPodId;     // 0 if not pod-gated
    bool isListed;                // true for V1; V2 can set false for unlisted polls
    uint256 totalVotes;
}

enum EligibilityType {
    OPEN,
    QF_HOLDERS,
    TOKEN_HOLDERS,
    POD_MEMBERS
}

mapping(uint256 => Poll) public polls;
mapping(uint256 => mapping(uint256 => uint256)) public optionVotes;  // pollId => optionIndex => voteCount
mapping(uint256 => mapping(address => bool)) public hasVoted;         // pollId => voter => bool
mapping(uint256 => mapping(address => uint256)) public voterChoice;   // pollId => voter => optionIndex
mapping(address => bool) public authorizedContracts;

uint256 public pollCount;
address public owner;
Functions:

setAuthorized(address _contract, bool _status) — Owner only. Adds or removes a contract from the authorized writers list.

createPoll(address _creator, string _question, string[] _options, uint256 _startTime, uint256 _endTime, EligibilityType _eligType, address _eligToken, uint256 _eligPodId) — Authorized contracts only. Increments pollCount, stores the new Poll struct, returns the poll ID.

recordVote(uint256 _pollId, address _voter, uint256 _optionIndex) — Authorized contracts only. Sets hasVoted, records voterChoice, increments optionVotes and totalVotes.

getPoll(uint256 _pollId) — Public view. Returns the full Poll struct.

getOptionVotes(uint256 _pollId, uint256 _optionIndex) — Public view. Returns vote count for a specific option.

getHasVoted(uint256 _pollId, address _voter) — Public view. Returns bool.

getVoterChoice(uint256 _pollId, address _voter) — Public view. Returns option index.

transferOwnership(address _newOwner) — Owner only.

Events: PollCreated(uint256 indexed pollId, address indexed creator, string question, uint256 endTime) VoteRecorded(uint256 indexed pollId, address indexed voter, uint256 optionIndex)

5.2 PollCreation.sol — Creation Logic & Fee Collection
Purpose: Validates poll parameters, collects and splits fees, calls PollStorage to store the poll.

State Variables:

address public pollStorage;
address public qnsContract;          // QNS registry, used to verify creator has a .qf name
address public treasury;
address public burnAddress;          // address(0) or designated burn address
uint256 public creationFee;          // default: 100 * 10**18 (100 QF, assuming 18 decimals)
uint16  public treasuryBps;          // default: 5000 (50%)
address public qfTokenAddress;       // QF token contract for fee payment
mapping(address => bool) public exemptAddresses;
address public owner;
Functions:

createPoll(string _question, string[] _options, uint8 _durationDays, EligibilityType _eligType, address _eligToken, uint256 _eligPodId) — Public. The main entry point for standalone poll creation.

Validation logic:

Caller must have a .qf name: calls QNS contract hasName(msg.sender) or equivalent. Reverts with "QNS name required" if false.
_options.length >= 2 && _options.length <= 10. Reverts with "2-10 options required".
_durationDays >= 1 && _durationDays <= 30. Reverts with "Duration 1-30 days". (For custom durations, frontend converts to days; contract stores startTime and endTime as timestamps.)
_question is non-empty. Reverts with "Question required".
Fee logic:

If exemptAddresses[msg.sender] is true, skip fee collection.
Otherwise, transfer creationFee amount of QF token from caller to this contract (requires prior ERC-20 approval). Split: (creationFee * treasuryBps) / 10000 to treasury, remainder to burnAddress.
Reverts with "Insufficient fee" if transfer fails.
Then calls PollStorage.createPoll(...) with computed startTime = block.timestamp and endTime = block.timestamp + (_durationDays * 86400).

createPollCustomDuration(string _question, string[] _options, uint256 _endTimestamp, EligibilityType _eligType, address _eligToken, uint256 _eligPodId) — Same as above but accepts an exact end timestamp instead of duration in days. Validates _endTimestamp > block.timestamp and _endTimestamp <= block.timestamp + 30 days.

setCreationFee(uint256 _fee) — Owner only. setTreasuryBps(uint16 _bps) — Owner only. Must be <= 10000. setTreasury(address _treasury) — Owner only. setExempt(address _addr, bool _exempt) — Owner only. transferOwnership(address _newOwner) — Owner only.

5.3 VoteAction.sol — Voting Logic
Purpose: Validates voter eligibility, enforces one-vote-per-wallet, records the vote in PollStorage.

State Variables:

address public pollStorage;
address public qfTokenAddress;       // for QF_HOLDERS eligibility check
address public owner;
Functions:

vote(uint256 _pollId, uint256 _optionIndex) — Public. The main entry point for voting.

Validation logic:

Poll must exist: PollStorage.getPoll(_pollId) returns valid data. Reverts with "Poll not found".
Poll must be active: block.timestamp >= poll.startTime && block.timestamp < poll.endTime. Reverts with "Poll not active".
Voter must not have already voted: PollStorage.getHasVoted(_pollId, msg.sender) must be false. Reverts with "Already voted".
_optionIndex < poll.options.length. Reverts with "Invalid option".
Eligibility check based on poll.eligibilityType:
OPEN: No check, anyone can vote.
QF_HOLDERS: IERC20(qfTokenAddress).balanceOf(msg.sender) > 0. Reverts with "Must hold QF tokens".
TOKEN_HOLDERS: IERC20(poll.eligibilityToken).balanceOf(msg.sender) > 0. Reverts with "Must hold required token".
POD_MEMBERS: Calls QFLink pod membership check (interface TBD — will use IQFLinkPods(qflinkContract).isMember(poll.eligibilityPodId, msg.sender)). For V1, if QFLink is not yet deployed, this eligibility type reverts with "Pod gating not yet available". The interface address is settable by owner.
Then calls PollStorage.recordVote(_pollId, msg.sender, _optionIndex).

setQFLinkContract(address _qflink) — Owner only. Sets the QFLink contract address for pod membership checks. transferOwnership(address _newOwner) — Owner only.

5.4 ResultsReader.sol — Read-Only Aggregation
Purpose: Provides computed views over PollStorage data for the frontend. Pure read contract, no state mutations, no authorization needed.

Functions:

getPollResults(uint256 _pollId) — Public view. Returns a struct containing: the poll question, an array of option names, an array of vote counts per option, the total vote count, an array of percentages (as uint256, multiplied by 100 for two decimal precision, e.g., 4725 = 47.25%), the index of the leading option, and whether the poll is still active (computed from timestamps).

getPollList(uint256 _offset, uint256 _limit) — Public view. Returns a paginated array of poll summaries (id, question truncated, creator, totalVotes, endTime, isActive) for the explore/listing page. Default limit 20.

getActivePollCount() — Public view. Iterates and counts polls where block.timestamp < endTime.

getUserVotes(address _user, uint256 _offset, uint256 _limit) — Public view. Returns an array of poll IDs the user has voted on, plus their choice for each. Requires iterating, so pagination is important.

getVoterList(uint256 _pollId, uint256 _offset, uint256 _limit) — Public view. Returns paginated list of voter addresses for a specific poll. (Note: this requires an additional data structure in PollStorage — an array of voter addresses per poll: mapping(uint256 => address[]) public pollVoters; — add this to PollStorage.)

5.5 QFLinkPollBridge.sol — QFLink Integration Contract
Purpose: Called by QFLink when a pod creator creates an embedded poll. Collects the combined fee (150 QF), splits it, and calls PollCreation.

Note: This contract ships with QFLink's deployment, not QUORUM's. It is included in this spec for completeness and to define the interface. QUORUM deploys first; QFLink deploys later and authorizes this bridge contract.

State Variables:

address public pollCreation;
address public qfTokenAddress;
address public qflinkRevenue;       // QFLink's revenue address
uint256 public qflinkFee;           // default: 50 * 10**18 (50 QF)
address public owner;
Functions:

createPodPoll(uint256 _podId, string _question, string[] _options, uint8 _durationDays) — Public. Called by a pod creator from the QFLink UI.

Logic:

Verify caller is the creator of _podId (calls QFLink's pod registry).
Collect total fee: PollCreation.creationFee() + qflinkFee in QF tokens from caller.
Approve and forward PollCreation.creationFee() amount to PollCreation contract.
Transfer qflinkFee to qflinkRevenue address.
Call PollCreation.createPoll(...) with eligibilityType = POD_MEMBERS and eligibilityPodId = _podId.
setQFLinkFee(uint256 _fee) — Owner only. setQFLinkRevenue(address _addr) — Owner only.

5.6 Additional PollStorage Fields (append to 5.1)
After reviewing ResultsReader needs, PollStorage requires these additional structures:

mapping(uint256 => address[]) public pollVoters;       // pollId => array of voter addresses (for voter list pagination)
mapping(address => uint256[]) public userPollsVoted;   // user => array of pollIds they voted on (for profile page)
mapping(address => uint256[]) public userPollsCreated; // user => array of pollIds they created (for profile page)
The recordVote function also pushes to pollVoters[_pollId] and userPollsVoted[_voter]. The createPoll function also pushes to userPollsCreated[_creator].

6. DEPLOY SCRIPT
File: deploy.ts Runtime: Node.js with viem Environment variables (loaded from .env):

PRIVATE_KEY — deployer wallet private key
RPC_URL — defaults to https://archive.mainnet.qfnode.net/eth
QNS_CONTRACT_ADDRESS — existing QNS registry contract on QF Network
QF_TOKEN_ADDRESS — QF token contract address on QF Network
TREASURY_ADDRESS — multisig or EOA for receiving treasury fees
BURN_ADDRESS — 0x0000000000000000000000000000000000000000 or designated burn address
Deploy sequence (order matters due to dependencies):

Step 1: Deploy PollStorage. No constructor args. Record address.

Step 2: Deploy PollCreation. Constructor args: pollStorage address, qnsContract address (from env), treasury address (from env), burnAddress (from env), qfTokenAddress (from env), creationFee (100 * 10^18), treasuryBps (5000). Record address.

Step 3: Deploy VoteAction. Constructor args: pollStorage address, qfTokenAddress (from env). Record address.

Step 4: Deploy ResultsReader. Constructor args: pollStorage address. Record address.

Step 5: Authorize PollCreation and VoteAction in PollStorage. Call PollStorage.setAuthorized(PollCreation.address, true) and PollStorage.setAuthorized(VoteAction.address, true).

Step 6 (optional, if deploying with QFLink): Deploy QFLinkPollBridge. Constructor args: pollCreation address, qfTokenAddress, qflinkRevenue address, qflinkFee (50 * 10^18). Authorize the bridge in PollStorage if it calls storage directly, or authorize it in PollCreation if PollCreation has its own authorization layer.

Output files:

deployments.json:

Copy{
  "network": "qf-mainnet",
  "chainId": 42,
  "deployer": "0x...",
  "timestamp": "2026-03-12T...",
  "contracts": {
    "PollStorage": {
      "address": "0x...",
      "abi": [...]
    },
    "PollCreation": {
      "address": "0x...",
      "abi": [...]
    },
    "VoteAction": {
      "address": "0x...",
      "abi": [...]
    },
    "ResultsReader": {
      "address": "0x...",
      "abi": [...]
    }
  }
}
vercel-env.txt:

NEXT_PUBLIC_CHAIN_ID=42
NEXT_PUBLIC_RPC_URL=https://archive.mainnet.qfnode.net/eth
NEXT_PUBLIC_POLL_STORAGE_ADDRESS=0x...
NEXT_PUBLIC_POLL_CREATION_ADDRESS=0x...
NEXT_PUBLIC_VOTE_ACTION_ADDRESS=0x...
NEXT_PUBLIC_RESULTS_READER_ADDRESS=0x...
NEXT_PUBLIC_QNS_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_QF_TOKEN_ADDRESS=0x...
7. FRONTEND APPLICATION
Stack: React 18+ / TypeScript / Tailwind CSS / viem (for contract reads/writes) / MetaMask (window.ethereum) for wallet connection Hosting: Vercel Routing: React Router (SPA) or Next.js pages

7.1 Global Components
TopBar — Fixed, full width, #0C0A09 background, bottom border 1px solid #292524. Left: "QUORUM" wordmark (Syne Bold, uppercase, #FAFAF9, tracked wide). Center-right: nav links "Explore", "Create", "About" (Geist 400, #A8A29E, hover #FAFAF9). Far right: WalletButton component.

WalletButton — Three states. Disconnected: outlined button "Connect Wallet" (1px solid #6366F1, text #6366F1, hover fills indigo). Connected with QNS: displays .qf name in Geist Mono #FAFAF9 with small indigo filled square indicator. Connected without QNS: displays truncated address 0x7a3f… in Geist Mono #A8A29E. Clicking connected state opens a dropdown (#1C1917 card, 1px solid #292524) with "My Votes", "My Polls", "Disconnect" links.

Footer — #0C0A09 background, top border 1px solid #292524. Left: "QUORUM" in Syne 600 small + "Built on QF Network" in Geist Mono #57534E. Right: links "Docs · GitHub · QNS · QFLink" in Geist 400 #A8A29E. Bottom: © 2026 QUORUM. Every vote on-chain. in Geist Mono 12px #57534E.

Toast System — Success toasts: #1C1917 background, 1px solid #22C55E left border, Geist 400 text, auto-dismiss 5s. Error toasts: 1px solid #EF4444 left border. Positioned top-center of viewport, stacked if multiple.

Confirmation Modal — Centered overlay, backdrop rgba(0,0,0,0.7). Card: #1C1917, 1px solid #292524, padding 32px, max-width 440px. Sharp corners. Used for vote confirmation and poll creation confirmation.

7.2 Page: Landing (/)
This is the marketing/branding page. The full prompt for this page was already delivered earlier in the conversation. It includes: hero with tagline and CTAs, live stats ticker, "How It Works" three-card section, features section with indigo accent lines, active polls preview, ecosystem integration section, closing CTA, and footer. Stats and poll previews use hardcoded placeholder data in V1 (or live data if contracts are already deployed).

7.3 Page: Explore (/explore)
Purpose: The main app dashboard. Poll discovery and listing.

Layout: Single centered column, max-width 800px.

Sub-nav tabs: All Polls | Active | Ended | My Votes — Geist 400, #A8A29E, active tab gets 2px solid #6366F1 bottom border and #FAFAF9 text. Tabs filter the poll list client-side (fetched from ResultsReader.getPollList and filtered).

Filter/Sort row: Below tabs. Left: status filter (redundant with tabs but useful on "All Polls" — a small dropdown). Right: sort dropdown ("Newest", "Most Votes", "Ending Soon") in Geist 400, #1C1917 background, 1px solid #292524 border; and a search input (placeholder "Search polls…", Geist 400, #0C0A09 background, 1px solid #292524 border).

Poll Card (PollCard component) — Rendered as a vertical stack, one card per row, full width of the content column. Each card:

Background #1C1917. Border 1px solid #292524. Padding 24px. On hover: border transitions to #6366F1 (150ms ease). Entire card is clickable — navigates to /poll/[id]. Cursor pointer.

Card interior from top to bottom:

Row 1 (status + time): Left — 6×6px filled square (sharp, not circle): #22C55E if active, #EAB308 if ending within 24h, #A8A29E if ended. Adjacent text in Geist Mono 12px uppercase, same color as square: "ACTIVE", "ENDING SOON", or "ENDED". Right — time context in Geist Mono 13px #A8A29E: "Ends in 2d 14h" or "Ended 3d ago".

Row 2 (question): Poll question in Geist 600 18px #FAFAF9. Max 2 lines, overflow ellipsis.

Row 3 (metadata): Geist Mono 13px #A8A29E: by alice.qf · 142 votes · 4 options. The .qf name is #6366F1 and clickable (navigates to /u/alice.qf).

Row 4 (result preview OR vote prompt): If the poll is ended OR the user has voted — show the leading option: option name in Geist 400 14px #A8A29E, percentage in Geist Mono #6366F1, plus a 4px-tall progress bar (#292524 background, #6366F1 fill). If the poll is active AND the user hasn't voted — show Vote now → in Geist 400 14px #6366F1, no bar.

Floating Create Button: Fixed position, bottom-right, 24px from edges. Square button (no border-radius), solid #6366F1, white text "Create Poll" in Geist 600, or a "+" icon on mobile. States: if wallet connected + has .qf → links to /create. If wallet connected + no .qf → shows tooltip "You need a .qf name to create polls" with link to QNS app. If wallet not connected → triggers wallet connection flow.

Empty states: "My Votes" with no votes: centered #A8A29E text "You haven't voted on any polls yet." + "Browse Active Polls" link in #6366F1. Search with no results: "No polls match your search." Explore with no polls at all (fresh deployment): "No polls yet. Be the first." + "Create Poll" link.

Pagination: "Load more" button at bottom of list (Geist 400, outlined #292524) rather than traditional page numbers. Loads next 20 polls from ResultsReader.getPollList with offset.

7.4 Page: Poll Detail (/poll/[id])
Purpose: View a poll, cast a vote, see results.

Layout: Two columns on desktop (>1024px). Left column ~60%, right column ~40% (sticky, offset from top by TopBar height + 24px). Single column on mobile (right column content appears below left column content).

Left Column:

Poll Header: Question in Syne 700 28px #FAFAF9. Below: metadata block, Geist Mono 13px #A8A29E, vertical layout (line breaks, no bullets):

Created by alice.qf (.qf name in #6366F1, clickable)
Poll ID: 0x7a3f… (click to copy full, shows brief "Copied!" tooltip)
Started: Mar 10, 2026 14:32 UTC
Ends: Mar 17, 2026 14:32 UTC (or Ended: ...)
Description (if provided): Below metadata, separated by 1px solid #292524 divider. Geist 400 15px #FAFAF9. Max ~6 lines with "Show more" expand link in #6366F1.

Eligibility Badge: Inline badge below description. Geist Mono 13px. Variants: "Open to All" (#A8A29E, no special styling). "QF Holders Only" (#6366F1 text, 4px #6366F1 left border on a small inline card). "Requires TOKEN_NAME" (same indigo style, with token contract truncated). "Pod Members: pod-name" (same style).

Voter Activity Feed: Divider, then heading "Votes" in Geist 600 16px #FAFAF9 with count in Geist Mono #6366F1 (e.g., "Votes 142"). Scrollable list of individual vote entries, newest first. Each entry is one row: .qf name (Geist Mono #6366F1, clickable) + voted for "Option B" (Geist 400 #A8A29E) + · 2h ago (Geist Mono 12px #57534E). Rows separated by 1px solid #292524. First 20 shown, "Load more" button for next batch. Over 100: "View all on explorer →" link.

Right Column:

VotingCard component — Shown when: poll is active AND user has not voted AND wallet is connected AND user is eligible. Background #1C1917, border 1px solid #292524, padding 24px.

Header: "Cast Your Vote" in Geist 600 #FAFAF9.

Options list: vertical stack. Each option is a full-width selectable row: #0C0A09 background, 1px solid #292524 border, padding 16px. Option text in Geist 400 #FAFAF9 left-aligned. Hover: border #6366F1. Selected: background rgba(99,102,241,0.1), border #6366F1 solid, 6×6px filled indigo square appears right-aligned. Only one option selectable at a time (radio behavior).

"Cast Vote" button: full width, below options. Disabled (no selection): #292524 background, #57534E text, cursor not-allowed. Enabled: #6366F1 background, #FAFAF9 text, Geist 600. Hover: #818CF8.

Clicking "Cast Vote" opens the Confirmation Modal (described in 7.1). Modal content: "Confirm Your Vote" (Syne 700), poll question (Geist 400 #A8A29E), selected option (Geist 600 #6366F1), warning "This action is permanent. Your vote cannot be changed." (Geist Mono 13px #EAB308), two buttons — "Cancel" (outlined #292524) and "Confirm & Sign" (solid #6366F1).

Transaction states on "Confirm & Sign" button: "Waiting for signature…" (while MetaMask popup is open), "Confirming…" (after signing, waiting for on-chain confirmation, button border pulses indigo), then on success: modal closes, VotingCard transitions to VotedState, success toast appears.

VotedState — Replaces VotingCard after voting. Collapsed single row: 6×6px indigo square + You voted for "Option B" (Geist 400 #FAFAF9) + Tx: 0x9f2a… (Geist Mono 12px #6366F1, clickable → explorer link).

VotingCard — Alternative States:

Wallet not connected: Card shows "Connect your wallet to vote" (Geist 400 #A8A29E) with "Connect Wallet" button (outlined indigo).
Connected but not eligible: "You are not eligible for this poll" (Geist 400 #A8A29E) with reason below — "Requires QF tokens" or "Requires holding TOKEN_NAME" or "Requires pod membership" (Geist Mono 13px #57534E).
Poll ended: VotingCard is not rendered at all.
ResultsCard component — Shown when: poll has ended (always), OR user has already voted (always), OR user clicks a "View Results" toggle link (available even before voting — link appears at bottom of VotingCard in Geist 400 #6366F1: "Peek at results").

Background #1C1917, border 1px solid #292524, padding 24px.

Header: "Results" in Geist 600 #FAFAF9. Status note right-aligned: "Live" + 6×6px #22C55E square if active, "Final" + 6×6px #A8A29E square if ended.

For each option, vertically stacked: Option name in Geist 400 #FAFAF9 left-aligned. Same line, right-aligned: percentage in Geist Mono #6366F1 (e.g., 47.2%) and vote count in Geist Mono #A8A29E (e.g., 67 votes). Below the text: 8px-tall progress bar, full width, #292524 background. Fill: #6366F1 full opacity for the leading option, rgba(99,102,241,0.4) for others. Bars animate from 0% to their final width on first render (500ms ease-out).

Below all options: total line in Geist Mono #A8A29E: Total: 142 votes.

Footer of ResultsCard: "Share Poll" button (small, outlined #292524, Geist 400) — copies URL to clipboard, button text briefly changes to "Copied!" for 2 seconds. "Verify On-Chain" link (Geist Mono 12px #6366F1) — opens QF explorer at the PollStorage contract address.

7.5 Page: Create Poll (/create)
Purpose: Form to create a new poll.

Access control: Requires wallet connected + .qf name. If wallet not connected: centered message "Connect your wallet to create a poll" + Connect button. If connected without .qf: "You need a .qf name to create polls" + link to QNS app.

Layout: Single centered column, max-width 640px.

Heading: "Create a Poll" in Syne 700 28px #FAFAF9.

Form fields (top to bottom):

Question: Label "Your Question" (Geist 500 14px #A8A29E). Text input: #0C0A09 background, 1px solid #292524 border, 16px padding, Geist 400 18px #FAFAF9. Placeholder "What should we decide?" in #57534E. Max 280 characters, counter in Geist Mono 12px #A8A29E bottom-right.

Options: Label "Options (2–10)" (Geist 500 14px #A8A29E). Dynamic list of text inputs, same styling as above but 16px text. First two always visible (required, cannot be removed). Inputs 3–10 have an "×" button on the right (#A8A29E, hover #FAFAF9) to remove. Below last input: + Add Option (Geist 400 #6366F1, no border, text button). Disabled at 10: text becomes Maximum 10 options in #57534E.

Duration: Label "Duration" (Geist 500 14px #A8A29E). Row of chip buttons: 1 Day, 3 Days, 7 Days, Custom. Each chip: #0C0A09 background, 1px solid #292524, Geist 400 #A8A29E, padding 8px 16px. Selected: 1px solid #6366F1, text #6366F1. If "Custom" selected: a datetime-local input appears below, same dark styling.

Eligibility: Label "Who Can Vote" (Geist 500 14px #A8A29E). Column of selectable rows, same mechanics as VotingCard options (radio behavior, indigo selection state). Options: "Open to All" (default), "QF Token Holders", "Specific Token Holders" (reveals text input for contract address when selected, placeholder "Token contract address 0x…"), "QFLink Pod Members" (reveals input for pod ID when selected). If QFLink is not yet deployed, the "Pod Members" option is grayed out with (Coming Soon) label.

Description: Label "Description (optional)" (Geist 500 14px #A8A29E). Textarea: #0C0A09 background, 1px solid #292524, min-height 120px, Geist 400 #FAFAF9. Placeholder "Add context or details…" in #57534E. Max 1000 chars with counter.

Fee Display: Below all fields, a subtle info line in Geist Mono 13px #A8A29E: Poll creation fee: 100 QF (~$1.00). If user is whitelisted/exempt: Poll creation fee: Free (exempt).

Submit: Divider 1px solid #292524, then "Preview & Create" button, full width, solid #6366F1, Geist 600 #FAFAF9.

Preview Section: Clicking "Preview & Create" scrolls down and reveals a preview rendering of the poll exactly as it would look on the poll detail page — question, options listed, duration shown, eligibility badge, description. Below the preview: "Edit" button (outlined #292524) and "Create Poll" button (solid #6366F1). "Create Poll" triggers an ERC-20 approve transaction first (if needed, for the QF fee), then the PollCreation.createPoll transaction. Same transaction state handling as voting (waiting → confirming → success). On success: redirect to /poll/[newId] with success toast "Poll created successfully".

7.6 Page: Profile (/u/[name.qf] or /profile)
Purpose: View a user's voting history and created polls.

Layout: Single centered column, max-width 800px.

Header: .qf name in Syne 700 24px #FAFAF9. Truncated address below in Geist Mono 13px #A8A29E (click to copy).

Tabs: My Votes | My Polls — same tab styling as Explore page.

My Votes: List of PollCards (same component as Explore) with an additional line inside each card: You voted: "Option B" in Geist Mono 13px #6366F1, placed between the question/metadata and the mini-results bar.

My Polls: List of PollCards with the additional line reading: Your poll · 142 votes in Geist Mono 13px #A8A29E.

Empty states: "You haven't voted on any polls yet." / "You haven't created any polls yet." with relevant action links.

7.7 Page: About (/about)
Purpose: Informational page for users already in the app.

Layout: Single centered column, max-width 640px. Syne 700 for headings, Geist 400 for body. Content covers: what QUORUM is, how it works (expanded from landing page), the QNS requirement and why, integration with QFLink and QFPad, link to documentation/contracts. Ends with "Create Your First Poll" CTA button (solid indigo).

7.8 Page: 404 (/*)
Layout: Centered content. "Poll Not Found" in Syne 700 #FAFAF9. "This poll doesn't exist or hasn't been indexed yet." in Geist 400 #A8A29E. "Back to Explore" button (outlined indigo).

8. QNS INTEGRATION
Purpose: QNS provides human-readable identity (.qf names) across QUORUM.

Contract Interface (assumed based on standard name service patterns — adjust to match actual QNS ABI):

interface IQNS {
    function nameOf(address _addr) external view returns (string memory);
    function ownerOf(string memory _name) external view returns (address);
    function hasName(address _addr) external view returns (bool);
}
Usage in QUORUM:

In PollCreation: IQNS(qnsContract).hasName(msg.sender) — gate poll creation to .qf name holders.

In Frontend: For every address displayed (poll creator, voter list, profile), call IQNS.nameOf(address). If a name exists, display it as alice.qf in Geist Mono #6366F1. If no name, display truncated address in Geist Mono #A8A29E. Cache name lookups in frontend state to avoid repeated RPC calls.

Tooltip: Hovering over any .qf name shows full address in a tooltip (#1C1917 background, 1px solid #292524, Geist Mono 12px #E7E5E4).

9. QFLINK INTEGRATION PATH
V1 (QUORUM launches before QFLink):

QUORUM ships standalone with full functionality.
The POD_MEMBERS eligibility type exists in the contract but reverts with a message until QFLink's contract address is configured.
The VoteAction contract has a setQFLinkContract function ready for when QFLink deploys.
V2 (QFLink launches and integrates):

QFLink deploys QFLinkPollBridge contract.
QFLinkPollBridge is given authorization to call PollCreation (either directly or through an approved caller pattern).
QFLink UI adds a "Create Poll" button inside pod chat views.
Clicking it opens a modal (within QFLink) with the poll creation form fields, pre-filled with eligibilityType = POD_MEMBERS and the pod ID.
Pod creator pays 150 QF total. QFLinkPollBridge handles the split.
Poll results display inline in the pod chat as an embedded ResultsCard component (shared React component, same styling).
VoteAction's setQFLinkContract is called with QFLink's pod registry address, enabling pod membership eligibility checks.
Shared Component Library: Build the ResultsCard and VotingCard as self-contained React components with their own styling (Tailwind classes). These components accept props (pollId, contractAddresses) and handle their own data fetching and transaction logic. They can be imported by QFLink's frontend package directly.

10. QFPAD INTEGRATION PATH
V1: No direct integration. QFPad token launchers can manually create polls on QUORUM using TOKEN_HOLDERS eligibility and pasting their token's contract address.

V2+: QFPad UI adds a "Poll Your Holders" button on token pages. This opens QUORUM's create form pre-filled with eligibilityType = TOKEN_HOLDERS and eligibilityToken set to the token's contract address. Can be a simple URL deeplink: quorum.qf/create?eligType=token&token=0x....

11. RESPONSIVE DESIGN SPEC
Breakpoints: Desktop >1024px, Tablet 768–1024px, Mobile <768px.

Desktop: Full layouts as described. Two-column poll detail. Poll cards full width of 800px content column. Sticky right column on poll detail.

Tablet: Poll detail becomes single column (right column below left). Content max-width reduces to ~90% viewport width. Font sizes reduce ~10%.

Mobile: All single column. TopBar nav links collapse to hamburger menu (icon: three horizontal lines, #FAFAF9, opens full-screen overlay #0C0A09 with stacked links Syne 600 24px). Hero headline on landing drops to 36px. Stats ticker wraps to 2×2 grid. Poll cards stack vertically, full width with 16px horizontal padding. Floating Create button remains fixed bottom-right. Confirmation modals go near-full-width with 16px margin.

12. ANIMATIONS & MICRO-INTERACTIONS
All animations are subtle and functional, not decorative.

Scroll fade-in (landing page only): Sections translate Y from 20px to 0 and opacity 0 to 1 as they enter viewport. Cards within a section stagger by 100ms. Use Intersection Observer.

Stat counter (landing page): Numbers count up from 0 to value over 1.5s on first viewport entry. Geist Mono. Use requestAnimationFrame.

Hover transitions: All buttons and cards have 150ms ease color/border transitions.

Result bar animation: On first render of ResultsCard, bars animate from width 0% to final percentage over 500ms ease-out. Triggered when the component enters the viewport or when voting completes.

Vote confirmation pulse: After signing a transaction, the "Confirming…" button has a pulsing indigo border (opacity oscillates 0.4 to 1.0, 1s cycle) until confirmation.

Toast auto-dismiss: Toasts fade in (200ms), persist 5s, fade out (300ms).

"Copied!" feedback: On copy-to-clipboard actions, the trigger text briefly changes to "Copied!" for 2s, then reverts.

No parallax, no background video, no heavy animation, no confetti, no page transitions.

13. ERROR HANDLING
Transaction rejected by user: Inline text below the action button: "Transaction cancelled." in Geist 400 #A8A29E. Clears after 5s or on next interaction.

Transaction failed on-chain: Error toast with 1px solid #EF4444 left border: "Transaction failed. Please try again." Geist 400.

Network mismatch: If MetaMask is on wrong chain, show a persistent banner at top of page: "Please switch to QF Network (Chain ID 42)" in Geist 400, #EAB308 left border. Include a "Switch Network" button that calls wallet_switchEthereumChain.

Poll not found: 404 page as described.

Contract read failure: If RPC calls fail, show inline fallback text "Unable to load data. Please refresh." in #A8A29E where the data would appear.

QNS lookup failure: Fall back silently to truncated address display. Never block UI on a QNS lookup failure.

14. SECURITY CONSIDERATIONS
Re-entrancy: PollStorage's recordVote should follow checks-effects-interactions pattern. Set hasVoted before any external calls. Use OpenZeppelin's ReentrancyGuard on VoteAction and PollCreation.

Timestamp manipulation: QF Network's 100ms blocks mean block.timestamp is fine for poll durations measured in days. No sub-minute precision needed.

Fee bypass: PollCreation must verify fee payment inside the transaction — never trust external state. The createPoll function should use transferFrom within its body, not rely on pre-checks.

Authorization: Only PollCreation and VoteAction should be authorized to write to PollStorage. Verify this on deployment. Add a view function getAuthorized(address) to PollStorage for easy auditing.

Input validation: Contract-level max lengths on question (280 bytes) and description (1000 bytes) to prevent storage griefing. Option strings max 100 bytes each.

Integer overflow: Use Solidity 0.8+ built-in overflow checks.

15. TESTING CHECKLIST
Contract tests (Foundry or Hardhat):

Create poll with valid params → succeeds, poll stored correctly, fee deducted and split
Create poll without .qf name → reverts
Create poll with <2 or >10 options → reverts
Create poll with 0 duration → reverts
Create poll by exempt address → succeeds, no fee deducted
Vote on active poll → succeeds, vote recorded, counts updated
Vote twice on same poll → reverts
Vote on ended poll → reverts
Vote on token-gated poll without tokens → reverts
Vote on token-gated poll with tokens → succeeds
Fee change by owner → new fee applies to next poll
Fee change by non-owner → reverts
Authorization: unauthorized contract tries to write to PollStorage → reverts
ResultsReader returns correct percentages and totals
Frontend tests:

Wallet connect/disconnect flow
Create poll form validation (empty question, too few/many options, no duration selected)
ERC-20 approval + creation transaction flow
Voting selection and confirmation flow
Results display with correct bars and percentages
QNS name resolution and fallback to address
Mobile responsive layout
Network mismatch banner
Empty states on all pages
16. DEPLOYMENT CHECKLIST
Pre-deployment:

Compile all contracts with Solidity 0.8.20+
Run full test suite
Verify QNS contract address and ABI are correct for mainnet
Verify QF token contract address for mainnet
Set up treasury multisig address
Set burn address (confirm address(0) works for QF token burns on QF Network — some ERC-20s revert on transfer to zero address; if so, use a dedicated burn address)
Deployment: 7. Run deploy.ts — deploys PollStorage, PollCreation, VoteAction, ResultsReader in order 8. Verify authorization: PollCreation and VoteAction are authorized in PollStorage 9. Verify PollCreation fee is set to 100 * 10^18 10. Verify treasury address and burn address are correct 11. Copy deployments.json to frontend project 12. Copy vercel-env.txt values to Vercel project environment variables 13. Deploy frontend to Vercel 14. Test end-to-end: connect wallet, create poll (pay 100 QF), vote, verify results, check treasury received 50 QF, check burn address received 50 QF

Post-deployment: 15. Set exempt addresses (team multisig, governance address) 16. Create first official governance poll to verify everything works publicly 17. Announce QUORUM launch

17. V2+ ROADMAP (OUT OF SCOPE FOR V1, DOCUMENTED FOR CONTEXT)
Conviction voting: Votes gain weight over time; requires new VoteAction logic and ResultsReader computation
Delegation: Wallet A delegates voting power to Wallet B; new DelegationRegistry contract
Executable proposals: Poll outcome triggers an on-chain action (e.g., treasury transfer); requires a ProposalExecution contract
Quadratic voting: Vote weight = sqrt(tokens held); new eligibility and counting logic in VoteAction and ResultsReader
Poll templates: Pre-configured poll types (Yes/No, Multiple Choice, Ranked Choice); frontend feature + optional contract support
Unlisted polls: Set isListed = false; accessible only via direct link or within a pod
Private voting: ZK-proof based vote privacy; significant research and contract work
Premium features: Extended durations >30 days, >10 options, featured placement, custom branding per poll
Governance of QUORUM: A special "meta-poll" type where the outcome adjusts QUORUM's own parameters (fees, split, whitelist)
18. FILE STRUCTURE
quorum/
├── contracts/
│   ├── PollStorage.sol
│   ├── PollCreation.sol
│   ├── VoteAction.sol
│   ├── ResultsReader.sol
│   ├── QFLinkPollBridge.sol
│   └── interfaces/
│       ├── IQNS.sol
│       ├── IQFLinkPods.sol
│       └── IERC20.sol
├── scripts/
│   └── deploy.ts
├── test/
│   ├── PollStorage.test.ts
│   ├── PollCreation.test.ts
│   ├── VoteAction.test.ts
│   └── ResultsReader.test.ts
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TopBar.tsx
│   │   │   ├── WalletButton.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── PollCard.tsx
│   │   │   ├── VotingCard.tsx
│   │   │   ├── ResultsCard.tsx
│   │   │   ├── ConfirmationModal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── EligibilityBadge.tsx
│   │   │   └── QNSName.tsx
│   │   ├── pages/
│   │   │   ├── Landing.tsx
│   │   │   ├── Explore.tsx
│   │   │   ├── PollDetail.tsx
│   │   │   ├── CreatePoll.tsx
│   │   │   ├── Profile.tsx
│   │   │   ├── About.tsx
│   │   │   └── NotFound.tsx
│   │   ├── hooks/
│   │   │   ├── useWallet.ts
│   │   │   ├── useQNS.ts
│   │   │   ├── usePollStorage.ts
│   │   │   ├── usePollCreation.ts
│   │   │   ├── useVoteAction.ts
│   │   │   └── useResultsReader.ts
│   │   ├── lib/
│   │   │   ├── contracts.ts        (addresses + ABIs from deployments.json)
│   │   │   ├── viemClient.ts       (public client + wallet client config)
│   │   │   └── constants.ts        (chain config, colors, etc.)
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── public/
│   ├── tailwind.config.ts
│   ├── package.json
│   └── tsconfig.json
├── deployments.json                 (generated by deploy script)
├── vercel-env.txt                   (generated by deploy script)
└── README.md
That's the complete specification. Every contract, every function, every page, every component, every interaction state, every color, every font size, every error case, every edge case. A builder — human or AI — should be able to take this document and produce a working QUORUM dApp without needing to ask clarifying questions.