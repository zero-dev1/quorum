// deploy.mjs — QUORUM deployment script for QF Network (pallet-revive via eth-rpc)
import { createWalletClient, createPublicClient, http, formatEther, getContract } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

// ============================================
// CONFIG
// ============================================
const RPC_URL = process.env.RPC_URL || process.env.VITE_WALLET_RPC_URL;
if (!RPC_URL) throw new Error('RPC_URL or VITE_WALLET_RPC_URL environment variable is required');

const CHAIN_ID = 42;
const DEPLOYER_KEY = process.env.PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
if (!DEPLOYER_KEY) throw new Error('PRIVATE_KEY or DEPLOYER_PRIVATE_KEY environment variable is required');

const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

const qfChain = defineChain({
  id: CHAIN_ID,
  name: 'QF Local',
  nativeCurrency: { name: 'QF', symbol: 'QF', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

const account = privateKeyToAccount(DEPLOYER_KEY);

const walletClient = createWalletClient({
  account,
  chain: qfChain,
  transport: http(RPC_URL),
});

const publicClient = createPublicClient({
  chain: qfChain,
  transport: http(RPC_URL),
});

// ============================================
// HELPERS
// ============================================

// Custom JSON replacer to handle BigInt values
function jsonReplacer(key, value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

// Safe JSON stringify that handles BigInt
function safeJsonStringify(obj, space = null) {
  return JSON.stringify(obj, jsonReplacer, space);
}

// ============================================
// QNS Deployments Reader
// ============================================
function readQNSDeployments() {
  const possiblePaths = [
    resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'qns', 'deployments.json'),
    resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'qns', 'deployments.json'),
    '/Users/ismaelwali/CascadeProjects/QFDapps/qns/deployments.json',
  ];

  for (const deployPath of possiblePaths) {
    try {
      if (existsSync(deployPath)) {
        const content = readFileSync(deployPath, 'utf-8');
        const deployments = JSON.parse(content);
        console.log(`[deploy] Found QNS deployments at: ${deployPath}`);
        return deployments;
      }
    } catch (err) {
      // Continue to next path
    }
  }

  console.warn('[deploy] QNS deployments.json not found. QNS addresses must be set manually in .env');
  return null;
}

// ============================================
// QFLink Deployments Reader
// ============================================
function readQFLinkDeployments() {
  const possiblePaths = [
    resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'qflink', '.env.development'),
    resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'qflink', '.env.development'),
    '/Users/ismaelwali/CascadeProjects/QFDapps/qflink/.env.development',
  ];

  for (const envPath of possiblePaths) {
    try {
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf-8');
        // Parse VITE_PODS_STORAGE_ADDRESS from .env file
        const match = content.match(/VITE_PODS_STORAGE_ADDRESS=(.+)/);
        if (match) {
          const podsStorageAddress = match[1].trim();
          console.log(`[deploy] Found QFLink deployments at: ${envPath}`);
          return {
            contracts: {
              PodsStorage: podsStorageAddress,
              QFLinkPodsStorage: podsStorageAddress,
            },
          };
        }
      }
    } catch (err) {
      // Continue to next path
    }
  }

  console.warn('[deploy] QFLink .env.development not found. QFLink addresses must be set manually in .env');
  return null;
}

// ============================================
// CONTRACT LOADING
// ============================================
function loadCombinedJson() {
  const raw = JSON.parse(readFileSync('contracts/combined.json', 'utf-8'));
  const contracts = {};
  for (const [key, value] of Object.entries(raw.contracts)) {
    const name = key.split(':').pop();
    // Skip interfaces (they don't have bytecode)
    if (name.startsWith('I')) continue;
    // Only include if it has bytecode
    if (!value.bin) continue;
    contracts[name] = {
      abi: typeof value.abi === 'string' ? JSON.parse(value.abi) : value.abi,
      bytecode: value.bin.startsWith('0x') ? value.bin : '0x' + value.bin,
    };
  }
  return contracts;
}

// ============================================
// DEPLOYMENT FUNCTIONS
// ============================================
async function deploy(name, abi, bytecode, args = []) {
  const argsStr = args.length ? ' with args: ' + safeJsonStringify(args).slice(0, 200) : '';
  console.log(`\n--- Deploying ${name}${argsStr} ---`);

  try {
    const hash = await walletClient.deployContract({
      abi,
      bytecode,
      args,
    });

    console.log(`  TX hash: ${hash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (!receipt.contractAddress) {
      throw new Error(`${name} deployment failed — no contract address in receipt`);
    }

    console.log(`  ✅ ${name} deployed at: ${receipt.contractAddress}`);
    return receipt.contractAddress;
  } catch (err) {
    console.error(`\n❌ Failed to deploy ${name}:`);
    console.error(`   Error: ${err.message}`);
    if (err.cause) {
      console.error(`   Cause: ${err.cause.message || err.cause}`);
    }
    throw new Error(`Deployment of ${name} failed: ${err.message}`);
  }
}

async function callContract(name, address, abi, functionName, args = [], value = 0n) {
  const argsStr = args.map(a => typeof a === 'string' ? a.slice(0, 20) + '...' : safeJsonStringify(a)).join(', ');
  console.log(`  Calling ${name}.${functionName}(${argsStr})`);

  try {
    const hash = await walletClient.writeContract({
      address,
      abi,
      functionName,
      args,
      value,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== 'success') {
      throw new Error(`${name}.${functionName} failed — tx reverted`);
    }

    console.log(`  ✅ ${functionName} succeeded`);
    return receipt;
  } catch (err) {
    console.error(`\n❌ Failed to call ${name}.${functionName}:`);
    console.error(`   Error: ${err.message}`);
    if (err.cause) {
      console.error(`   Cause: ${err.cause.message || err.cause}`);
    }
    throw new Error(`Call to ${name}.${functionName} failed: ${err.message}`);
  }
}

// ============================================
// MAIN DEPLOYMENT
// ============================================
async function main() {
  // ============================================
  // COMPILE CONTRACTS
  // ============================================
  console.log('============================================');
  console.log('COMPILING CONTRACTS');
  console.log('============================================');

  // Delete existing combined.json if it exists
  const combinedJsonPath = 'contracts/combined.json';
  if (existsSync(combinedJsonPath)) {
    console.log('Deleting existing contracts/combined.json...');
    unlinkSync(combinedJsonPath);
  }

  // Run resolc compilation
  console.log('Running resolc compilation...');
  try {
    execSync(
      'resolc contracts/PollStorage.sol contracts/PollCreation.sol contracts/VoteAction.sol contracts/ResultsReader.sol contracts/QFLinkPollBridge.sol --combined-json abi,bin -o contracts/ --overwrite',
      { stdio: 'inherit' }
    );
  } catch (err) {
    console.error('❌ Compilation failed:', err.message);
    process.exit(1);
  }

  // Verify combined.json was created
  if (!existsSync(combinedJsonPath)) {
    console.error('❌ Compilation failed: contracts/combined.json was not created');
    process.exit(1);
  }
  console.log('✅ Compilation successful');
  console.log('');

  // ============================================
  // STEP 1: LOAD COMPILED CONTRACTS
  // ============================================
  console.log('============================================');
  console.log('STEP 1: Loading compiled contracts');
  console.log('============================================');

  const contracts = loadCombinedJson();
  console.log(`Loaded: ${Object.keys(contracts).join(', ')}`);

  if (!contracts.PollStorage || !contracts.PollCreation || !contracts.VoteAction || !contracts.ResultsReader) {
    throw new Error('Missing one or more required contracts in combined.json');
  }

  // ============================================
  // STEP 2: LOAD CONFIGURATION
  // ============================================
  console.log('\n============================================');
  console.log('STEP 2: Loading configuration');
  console.log('============================================');

  const qnsDeployments = readQNSDeployments();
  const qflinkDeployments = readQFLinkDeployments();

  // Detect network
  function detectNetwork() {
    const args = process.argv.slice(2);
    const networkIndex = args.findIndex(arg => arg === '--network');
    if (networkIndex !== -1 && args[networkIndex + 1]) {
      return { network: args[networkIndex + 1], isMainnet: args[networkIndex + 1] === 'mainnet' };
    }
    const envNetwork = process.env.VITE_DEFAULT_NETWORK;
    if (envNetwork) {
      return { network: envNetwork, isMainnet: envNetwork === 'mainnet' };
    }
    return { network: 'local', isMainnet: false };
  }

  const { network, isMainnet } = detectNetwork();
  console.log(`Target network: ${network}${isMainnet ? ' (production)' : ' (development)'}`);

  // Get addresses from env or QNS deployments
  const qnsRegistryAddress = process.env.VITE_QNS_REGISTRY_ADDRESS || process.env.QNS_REGISTRY_ADDRESS || qnsDeployments?.contracts?.QNSRegistry;
  const qnsResolverAddress = process.env.VITE_QNS_RESOLVER_ADDRESS || process.env.QNS_RESOLVER_ADDRESS || qnsDeployments?.contracts?.QNSResolver;
  const qnsRegistrarAddress = process.env.VITE_QNS_REGISTRAR_ADDRESS || process.env.QNS_REGISTRAR_ADDRESS || qnsDeployments?.contracts?.QNSRegistrar;
  const qnsContractAddress = process.env.QNS_CONTRACT_ADDRESS || qnsResolverAddress;

  const treasuryAddress = process.env.TREASURY_ADDRESS || process.env.VITE_TREASURY_ADDRESS;
  const burnAddress = process.env.BURN_ADDRESS || process.env.VITE_BURN_ADDRESS || BURN_ADDRESS;
  const qflinkRevenueAddress = process.env.QFLINK_REVENUE_ADDRESS || process.env.VITE_QFLINK_REVENUE_ADDRESS;
  
  // Get QFLink pods storage address from env or deployments
  const qflinkPodsStorageAddress = process.env.VITE_QFLINK_PODS_STORAGE_ADDRESS || 
    qflinkDeployments?.contracts?.QFLinkPodsStorage || 
    qflinkDeployments?.contracts?.PodsStorage;

  if (!qnsContractAddress) throw new Error('QNS contract address is required (set QNS_CONTRACT_ADDRESS or QNS_RESOLVER_ADDRESS, or ensure QNS deployments.json exists)');
  if (!treasuryAddress) throw new Error('TREASURY_ADDRESS environment variable is required');

  console.log(`Deployer: ${account.address}`);
  console.log(`QNS Resolver: ${qnsContractAddress}`);
  if (qnsRegistryAddress) console.log(`QNS Registry: ${qnsRegistryAddress}`);
  if (qnsRegistrarAddress) console.log(`QNS Registrar: ${qnsRegistrarAddress}`);
  if (qflinkPodsStorageAddress) console.log(`QFLink Pods Storage: ${qflinkPodsStorageAddress}`);
  console.log(`Treasury: ${treasuryAddress}`);
  console.log(`Burn: ${burnAddress}`);
  console.log('');

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Deployer balance: ${formatEther(balance)} QF\n`);

  if (balance === 0n) {
    throw new Error('Deployer has no QF for gas');
  }

  // ============================================
  // STEP 3: DEPLOY CONTRACTS
  // ============================================
  console.log('============================================');
  console.log('STEP 3: Deploying contracts');
  console.log('============================================');

  // Deploy PollStorage (no constructor args)
  const pollStorageAddress = await deploy(
    'PollStorage',
    contracts.PollStorage.abi,
    contracts.PollStorage.bytecode
  );

  // Deploy PollCreation (with native QF fee: 100 QF, 50% treasury)
  // Constructor: (address _pollStorage, address _qnsContract, address _treasury, address _burnAddress, uint256 _creationFee, uint16 _treasuryBps)
  const creationFee = 100n * 10n ** 18n; // 100 QF
  const treasuryBps = 5000; // 50%

  const pollCreationAddress = await deploy(
    'PollCreation',
    contracts.PollCreation.abi,
    contracts.PollCreation.bytecode,
    [
      pollStorageAddress,
      qnsContractAddress,
      treasuryAddress,
      burnAddress,
      creationFee,
      treasuryBps
    ]
  );

  // Deploy VoteAction (constructor: address _pollStorage)
  const voteActionAddress = await deploy(
    'VoteAction',
    contracts.VoteAction.abi,
    contracts.VoteAction.bytecode,
    [pollStorageAddress]
  );

  // Deploy ResultsReader (constructor: address _pollStorage)
  const resultsReaderAddress = await deploy(
    'ResultsReader',
    contracts.ResultsReader.abi,
    contracts.ResultsReader.bytecode,
    [pollStorageAddress]
  );

  // Deploy QFLinkPollBridge (optional)
  // Constructor: (address _pollCreation, address _qflinkRevenue, uint256 _qflinkFee)
  let bridgeAddress = null;
  if (qflinkRevenueAddress && contracts.QFLinkPollBridge) {
    const qflinkFee = 50n * 10n ** 18n; // 50 QF
    bridgeAddress = await deploy(
      'QFLinkPollBridge',
      contracts.QFLinkPollBridge.abi,
      contracts.QFLinkPollBridge.bytecode,
      [
        pollCreationAddress,
        qflinkRevenueAddress,
        qflinkFee
      ]
    );
  }

  // ============================================
  // STEP 4: WIRE CONTRACTS (Authorizations)
  // ============================================
  console.log('\n============================================');
  console.log('STEP 4: Wiring contracts');
  console.log('============================================');

  // PollStorage.setAuthorized(address _contract, bool _status)
  await callContract('PollStorage', pollStorageAddress, contracts.PollStorage.abi, 'setAuthorized', [pollCreationAddress, true]);
  await callContract('PollStorage', pollStorageAddress, contracts.PollStorage.abi, 'setAuthorized', [voteActionAddress, true]);

  // VoteAction.setQFLinkContract(address _qflink) - if QFLink pods storage address is available
  if (qflinkPodsStorageAddress) {
    await callContract('VoteAction', voteActionAddress, contracts.VoteAction.abi, 'setQFLinkContract', [qflinkPodsStorageAddress]);
  }

  // VoteAction.setQNSContract(address _qnsResolver) - set QNS resolver for vote gating
  if (qnsResolverAddress || qnsContractAddress) {
    await callContract('VoteAction', voteActionAddress, contracts.VoteAction.abi, 'setQNSContract', [qnsResolverAddress || qnsContractAddress]);
  }

  console.log('');

  // ============================================
  // STEP 5: WRITE DEPLOYMENTS
  // ============================================
  console.log('============================================');
  console.log('STEP 5: Writing deployments.json');
  console.log('============================================');

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const deploymentsPath = resolve(__dirname, '..', 'deployments.json');

  const deployments = {
    network,
    timestamp: new Date().toISOString(),
    deployer: account.address,
    chainId: CHAIN_ID,
    contracts: {
      PollStorage: pollStorageAddress,
      PollCreation: pollCreationAddress,
      VoteAction: voteActionAddress,
      ResultsReader: resultsReaderAddress,
      ...(bridgeAddress && { QFLinkPollBridge: bridgeAddress })
    }
  };

  writeFileSync(deploymentsPath, safeJsonStringify(deployments, 2));
  console.log(`✅ Deployments written to ${deploymentsPath}`);

  // ============================================
  // STEP 6: WRITE .env.development or .env.production
  // ============================================
  console.log('\n============================================');
  console.log('STEP 6: Writing environment file');
  console.log('============================================');

  const envFileName = isMainnet ? '.env.production' : '.env.development';
  const ethRpcUrl = isMainnet ? 'https://archive.mainnet.qfnode.net/eth' : '/eth-rpc';
  const walletRpcUrl = isMainnet ? 'https://archive.mainnet.qfnode.net/eth' : 'http://127.0.0.1:8545';

  // Build QNS addresses section
  let qnsEnvSection = '';
  if (qnsRegistryAddress) {
    qnsEnvSection += `VITE_QNS_REGISTRY_ADDRESS=${qnsRegistryAddress}\n`;
  }
  if (qnsRegistrarAddress) {
    qnsEnvSection += `VITE_QNS_REGISTRAR_ADDRESS=${qnsRegistrarAddress}\n`;
  }
  if (qnsResolverAddress || qnsContractAddress) {
    qnsEnvSection += `VITE_QNS_RESOLVER_ADDRESS=${qnsResolverAddress || qnsContractAddress}\n`;
  }
  
  // Build QFLink addresses section
  let qflinkEnvSection = '';
  if (qflinkPodsStorageAddress) {
    qflinkEnvSection += `VITE_QFLINK_PODS_STORAGE_ADDRESS=${qflinkPodsStorageAddress}\n`;
  }

  const envContent = `# QUORUM Environment Variables
# Generated on ${new Date().toISOString()}
# Network: ${network}

# Network configuration
VITE_DEFAULT_NETWORK=${network}

# RPC URLs
VITE_ETH_RPC_URL=${ethRpcUrl}
VITE_WALLET_RPC_URL=${walletRpcUrl}

# QUORUM Contract Addresses
VITE_POLL_STORAGE_ADDRESS=${pollStorageAddress}
VITE_POLL_CREATION_ADDRESS=${pollCreationAddress}
VITE_VOTE_ACTION_ADDRESS=${voteActionAddress}
VITE_RESULTS_READER_ADDRESS=${resultsReaderAddress}
${bridgeAddress ? `VITE_QFLINK_POLL_BRIDGE_ADDRESS=${bridgeAddress}\n` : ''}# QNS (QF Name Service) Contract Addresses
${qnsEnvSection}# QFLink Contract Addresses
${qflinkEnvSection}# Treasury and Burn addresses
VITE_TREASURY_ADDRESS=${treasuryAddress}
VITE_BURN_ADDRESS=${burnAddress}
`;

  const envPath = resolve(__dirname, '..', envFileName);
  writeFileSync(envPath, envContent);
  console.log(`✅ Environment written to ${envPath}`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n============================================');
  console.log('DEPLOYMENT COMPLETE');
  console.log('============================================');
  console.log(`Network:        ${network}`);
  console.log(`Deployer:       ${account.address}`);
  console.log('');
  console.log('Contracts:');
  console.log(`  PollStorage:     ${pollStorageAddress}`);
  console.log(`  PollCreation:    ${pollCreationAddress}`);
  console.log(`  VoteAction:      ${voteActionAddress}`);
  console.log(`  ResultsReader:   ${resultsReaderAddress}`);
  if (bridgeAddress) {
    console.log(`  QFLinkPollBridge: ${bridgeAddress}`);
  }
  console.log('');
  console.log('Configuration:');
  console.log(`  Creation Fee:    100 QF`);
  console.log(`  Treasury Split:  50%`);
  console.log(`  QNS Resolver:    ${qnsContractAddress}`);
  console.log(`  Treasury:        ${treasuryAddress}`);
  console.log(`  Burn:            ${burnAddress}`);
}

// Run main with proper error handling
main().catch((err) => {
  console.error('\n❌ Deployment failed:');
  console.error(err.message);
  process.exit(1);
});
