# QUORUM

An on-chain polling dApp for QF Network. Every vote is a transaction. Every result is permanent.

## Architecture

### Smart Contracts (5 total)

1. **PollStorage.sol** - Central data storage, authorization-gated writes
2. **PollCreation.sol** - Poll creation logic, fee collection, QNS name verification
3. **VoteAction.sol** - Voting logic, eligibility checks, one-vote-per-wallet enforcement
4. **ResultsReader.sol** - Read-only aggregation contract for frontend data fetching
5. **QFLinkPollBridge.sol** - Integration bridge for QFLink (deployed separately)

### Frontend

React/TypeScript/Tailwind SPA with:
- 7 pages: Landing, Explore, Poll Detail, Create Poll, Profile, About, 404
- MetaMask-only wallet integration
- viem for all contract interactions
- Sharp corners, dark theme, no rounded corners

## Design System

- **Background**: #0C0A09
- **Surface/Cards**: #1C1917
- **Borders**: #292524 (1px solid)
- **Primary**: #6366F1 (Electric Indigo)
- **Primary Hover**: #818CF8
- **Text Primary**: #FAFAF9
- **Text Secondary**: #A8A29E
- **Text Mono/Data**: #E7E5E4
- **Text Muted**: #57534E
- **Success**: #22C55E
- **Warning**: #EAB308
- **Error**: #EF4444
- **Border Radius**: 0px everywhere

## Deployment

### Local/Testnet Development

1. Copy `.env.development` to `.env` and fill in values
2. Run `npm run deploy` to deploy contracts (outputs to `.env.development`)
3. Start development server: `npm run dev`

### Mainnet Production

1. Copy `.env.production` to `.env` and fill in mainnet values
2. Run `npm run deploy -- --network mainnet` to deploy contracts (outputs to `.env.production`)
3. Build for production: `npm run build`

## Development

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to QF Network
npm run deploy

# Start frontend development
npm run frontend:dev
```

## License

MIT
