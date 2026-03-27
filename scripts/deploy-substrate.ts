#!/usr/bin/env ts-node
/**
 * QUORUM — Contract Deployment for QF Network (Substrate + Revive/PolkaVM)
 *
 * Deploys all QUORUM contracts to QF Network mainnet via Substrate extrinsics.
 * Replaces the old viem/ETH-RPC deploy.mjs.
 *
 * Prerequisites:
 *   - Run ./scripts/compile-revive.sh first
 *   - .env with QF_RPC_URL, DEPLOYER_MNEMONIC, QNS addresses, TREASURY_ADDRESS
 *
 * Usage:
 *   npx ts-node scripts/deploy-substrate.ts
 */

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import {
  encodeFunctionData,
  decodeFunctionResult,
  keccak256,
  toHex,
} from 'viem';

config();

// =============================================================================
// CONFIGURATION
// =============================================================================

const RPC_URL = process.env.QF_RPC_URL || 'wss://mainnet.qfnode.net';
const ETH_RPC_URL = process.env.QF_ETH_RPC_URL || 'https://archive.mainnet.qfnode.net/eth';
const MNEMONIC = process.env.DEPLOYER_MNEMONIC;
const BURN_ADDRESS = process.env.BURN_ADDRESS || '0x000000000000000000000000000000000000dEaD';

// QNS addresses (required)
const QNS_REGISTRY_ADDRESS = process.env.QNS_REGISTRY_ADDRESS;
const QNS_RESOLVER_ADDRESS = process.env.QNS_RESOLVER_ADDRESS;
const QNS_REGISTRAR_ADDRESS = process.env.QNS_REGISTRAR_ADDRESS;

// Treasury (required)
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;

// QFLink (optional)
const QFLINK_PODS_STORAGE_ADDRESS = process.env.QFLINK_PODS_STORAGE_ADDRESS || '';
const QFLINK_REVENUE_ADDRESS = process.env.QFLINK_REVENUE_ADDRESS || '';

// Fees
const CREATION_FEE = 100n * 10n ** 18n; // 100 QF
const TREASURY_BPS = 5000; // 50%
const QFLINK_FEE = 50n * 10n ** 18n; // 50 QF

// Gas defaults
const DEFAULT_GAS_LIMIT = 100_000_000_000n;
const DEFAULT_STORAGE_DEPOSIT = 0n;

// =============================================================================
// HELPERS
// =============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

function formatBalance(balance: bigint): string {
  const qf = Number(balance) / 1e18;
  return qf.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function loadABI(contractName: string): any[] {
  const abiPath = resolve(PROJECT_ROOT, 'src', 'abi', `${contractName}.json`);
  if (!existsSync(abiPath)) {
    throw new Error(`ABI not found: ${abiPath}. Run ./scripts/compile-revive.sh first.`);
  }
  const raw = JSON.parse(readFileSync(abiPath, 'utf-8'));
  // resolc may output the ABI as an array or wrapped in an object
  return Array.isArray(raw) ? raw : raw.abi || raw;
}

function loadBytecode(contractName: string): Uint8Array {
  const bytecodePath = resolve(PROJECT_ROOT, 'output', `${contractName}.polkavm`);
  if (!existsSync(bytecodePath)) {
    throw new Error(`Bytecode not found: ${bytecodePath}. Run ./scripts/compile-revive.sh first.`);
  }
  return readFileSync(bytecodePath);
}

/**
 * Derive the EVM address for an SS58 account.
 * Same derivation as QNS/QFPay: keccak256(publicKey), take last 20 bytes.
 */
function deriveEvmAddress(publicKey: Uint8Array): string {
  const hex = '0x' + Array.from(publicKey).map(b => b.toString(16).padStart(2, '0')).join('');
  const hash = keccak256(hex as `0x${string}`);
  return '0x' + hash.slice(-40);
}

// =============================================================================
// CONTRACT DEPLOYMENT VIA REVIVE PALLET
// =============================================================================

async function deployContract(
  api: ApiPromise,
  deployer: any,
  name: string,
  bytecode: Uint8Array,
  abi: any[],
  constructorArgs: any[] = [],
  value: bigint = 0n,
): Promise<string> {
  console.log(`\n--- Deploying ${name} ---`);

  // Encode constructor data
  // Find the constructor in the ABI
  const constructorAbi = abi.find((item: any) => item.type === 'constructor');
  let inputData: Uint8Array;

  if (constructorAbi && constructorArgs.length > 0) {
    // Encode constructor arguments using viem
    // For deployment, we need the bytecode + encoded constructor args
    // With PolkaVM/Revive, the constructor args are ABI-encoded and appended
    const encoded = encodeFunctionData({
      abi: [constructorAbi],
      functionName: undefined as any, // constructor
      args: constructorArgs,
    });
    // encodeFunctionData for constructor returns just the encoded args (no selector)
    // Actually for constructors viem returns the args only. We need to handle this.
    // The Revive pallet expects: bytecode + constructor_args
    // Let's encode args manually
    const { encodeAbiParameters } = await import('viem');
    const argTypes = constructorAbi.inputs || [];
    const encodedArgs = encodeAbiParameters(argTypes, constructorArgs);
    // Strip 0x prefix and convert to bytes
    const argsBytes = Buffer.from(encodedArgs.slice(2), 'hex');
    inputData = Buffer.concat([bytecode, argsBytes]);
  } else {
    inputData = bytecode;
  }

  console.log(`  Bytecode: ${bytecode.length} bytes`);
  console.log(`  Constructor args: ${constructorArgs.length > 0 ? JSON.stringify(constructorArgs).slice(0, 120) : 'none'}`);

  return new Promise<string>((resolvePromise, reject) => {
    // Use the Revive.instantiate_with_code extrinsic
    // This is the standard way to deploy a contract on pallet-revive
    const tx = api.tx.revive.instantiateWithCode(
      value,                    // value to send
      DEFAULT_GAS_LIMIT,        // ref_time gas limit
      5_000_000n,               // proof_size
      DEFAULT_STORAGE_DEPOSIT,  // storage deposit limit
      `0x${Buffer.from(inputData).toString('hex')}`, // code + constructor data
    );

    tx.signAndSend(deployer, ({ status, events, dispatchError }: any) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else {
          reject(new Error(`Dispatch error: ${dispatchError.toString()}`));
        }
        return;
      }

      if (status.isInBlock) {
        console.log(`  📦 Included in block: ${status.asInBlock.toHex()}`);
      }

      if (status.isFinalized) {
        console.log(`  ✅ Finalized: ${status.asFinalized.toHex()}`);

        // Extract contract address from events
        let contractAddress: string | null = null;

        events.forEach(({ event }: any) => {
          if (event.section === 'revive' && event.method === 'Instantiated') {
            // The Instantiated event has (deployer, contract) fields
            contractAddress = event.data[1]?.toString();
          }
        });

        if (!contractAddress) {
          // Fallback: look for the address in any event data
          events.forEach(({ event }: any) => {
            if (event.section === 'revive') {
              console.log(`  Event: ${event.section}.${event.method}`, event.data.toJSON());
            }
          });
          reject(new Error(`${name}: No contract address found in events`));
          return;
        }

        console.log(`  📍 ${name} deployed at: ${contractAddress}`);
        resolvePromise(contractAddress);
      }
    }).catch(reject);
  });
}

/**
 * Call a write function on a deployed contract via Revive.call
 */
async function callContractWrite(
  api: ApiPromise,
  deployer: any,
  contractName: string,
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[] = [],
  value: bigint = 0n,
): Promise<void> {
  console.log(`  → ${contractName}.${functionName}(${args.map(a => typeof a === 'string' ? a.slice(0, 24) + '...' : a).join(', ')})`);

  const data = encodeFunctionData({ abi, functionName, args });
  const dataHex = data.startsWith('0x') ? data : `0x${data}`;

  return new Promise<void>((resolvePromise, reject) => {
    const tx = api.tx.revive.call(
      contractAddress,    // dest
      value,              // value
      DEFAULT_GAS_LIMIT,  // ref_time
      5_000_000n,         // proof_size
      DEFAULT_STORAGE_DEPOSIT,
      dataHex,            // input data
    );

    tx.signAndSend(deployer, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          reject(new Error(`${contractName}.${functionName} failed: ${decoded.section}.${decoded.name}`));
        } else {
          reject(new Error(`${contractName}.${functionName} dispatch error: ${dispatchError.toString()}`));
        }
        return;
      }

      if (status.isFinalized) {
        console.log(`    ✅ ${functionName} finalized`);
        resolvePromise();
      }
    }).catch(reject);
  });
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('=============================================================');
  console.log('  QUORUM — Substrate Deployment (PolkaVM / Revive)');
  console.log('=============================================================\n');

  // ── Validate config ──
  if (!MNEMONIC) {
    console.error('❌ DEPLOYER_MNEMONIC not set. Copy .env.example to .env and fill in.');
    process.exit(1);
  }
  if (!QNS_RESOLVER_ADDRESS) {
    console.error('❌ QNS_RESOLVER_ADDRESS not set. Get from QNS team.');
    process.exit(1);
  }
  if (!TREASURY_ADDRESS) {
    console.error('❌ TREASURY_ADDRESS not set.');
    process.exit(1);
  }

  // ── Connect ──
  console.log(`📡 Connecting to ${RPC_URL}...`);
  const provider = new WsProvider(RPC_URL);
  const api = await ApiPromise.create({ provider });

  const [chain, nodeName, nodeVersion] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);
  console.log(`✅ Connected: ${chain} | ${nodeName} v${nodeVersion}\n`);

  // ── Load deployer ──
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromMnemonic(MNEMONIC);
  const deployerEvmAddress = deriveEvmAddress(deployer.publicKey);
  console.log(`🔑 Deployer SS58:  ${deployer.address}`);
  console.log(`🔑 Deployer EVM:   ${deployerEvmAddress}`);

  const { data: balance } = await api.query.system.account(deployer.address);
  const freeBalance = BigInt(balance.free.toString());
  console.log(`💰 Balance: ${formatBalance(freeBalance)} QF\n`);

  if (freeBalance === 0n) {
    console.error('❌ Deployer has zero balance.');
    process.exit(1);
  }

  // ── Load ABIs and bytecode ──
  console.log('📦 Loading compiled contracts...');
  const contracts: Record<string, { abi: any[]; bytecode: Uint8Array }> = {};
  const contractNames = ['PollStorage', 'PollCreation', 'VoteAction', 'ResultsReader', 'QFLinkPollBridge'];

  for (const name of contractNames) {
    try {
      contracts[name] = {
        abi: loadABI(name),
        bytecode: loadBytecode(name),
      };
      console.log(`  ✓ ${name} (${contracts[name].bytecode.length} bytes)`);
    } catch (err: any) {
      if (name === 'QFLinkPollBridge') {
        console.log(`  ⚠ ${name} skipped (optional): ${err.message}`);
      } else {
        throw err;
      }
    }
  }
  console.log('');

  // ── Configuration summary ──
  console.log('📋 Configuration:');
  console.log(`  QNS Resolver:     ${QNS_RESOLVER_ADDRESS}`);
  if (QNS_REGISTRY_ADDRESS) console.log(`  QNS Registry:     ${QNS_REGISTRY_ADDRESS}`);
  if (QNS_REGISTRAR_ADDRESS) console.log(`  QNS Registrar:    ${QNS_REGISTRAR_ADDRESS}`);
  console.log(`  Treasury:         ${TREASURY_ADDRESS}`);
  console.log(`  Burn:             ${BURN_ADDRESS}`);
  console.log(`  Creation Fee:     100 QF`);
  console.log(`  Treasury Split:   50%`);
  if (QFLINK_PODS_STORAGE_ADDRESS) console.log(`  QFLink Pods:      ${QFLINK_PODS_STORAGE_ADDRESS}`);
  console.log('');

  // ════════════════════════════════════════════════════════════════════
  // DEPLOY
  // ════════════════════════════════════════════════════════════════════

  console.log('=============================================================');
  console.log('  DEPLOYING CONTRACTS');
  console.log('=============================================================');

  // 1. PollStorage — no constructor args
  const pollStorageAddress = await deployContract(
    api, deployer, 'PollStorage',
    contracts.PollStorage.bytecode,
    contracts.PollStorage.abi,
  );

  // 2. PollCreation — constructor(pollStorage, qnsResolver, treasury, burn, fee, bps)
  const pollCreationAddress = await deployContract(
    api, deployer, 'PollCreation',
    contracts.PollCreation.bytecode,
    contracts.PollCreation.abi,
    [
      pollStorageAddress,
      QNS_RESOLVER_ADDRESS,
      TREASURY_ADDRESS,
      BURN_ADDRESS,
      CREATION_FEE,
      TREASURY_BPS,
    ],
  );

  // 3. VoteAction — constructor(pollStorage)
  const voteActionAddress = await deployContract(
    api, deployer, 'VoteAction',
    contracts.VoteAction.bytecode,
    contracts.VoteAction.abi,
    [pollStorageAddress],
  );

  // 4. ResultsReader — constructor(pollStorage)
  const resultsReaderAddress = await deployContract(
    api, deployer, 'ResultsReader',
    contracts.ResultsReader.bytecode,
    contracts.ResultsReader.abi,
    [pollStorageAddress],
  );

  // 5. QFLinkPollBridge — optional
  let bridgeAddress: string | null = null;
  if (contracts.QFLinkPollBridge && QFLINK_REVENUE_ADDRESS) {
    bridgeAddress = await deployContract(
      api, deployer, 'QFLinkPollBridge',
      contracts.QFLinkPollBridge.bytecode,
      contracts.QFLinkPollBridge.abi,
      [pollCreationAddress, QFLINK_REVENUE_ADDRESS, QFLINK_FEE],
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // WIRE — Authorization & Configuration
  // ════════════════════════════════════════════════════════════════════

  console.log('\n=============================================================');
  console.log('  WIRING CONTRACTS');
  console.log('=============================================================');

  // Authorize PollCreation to write to PollStorage
  await callContractWrite(
    api, deployer, 'PollStorage', pollStorageAddress,
    contracts.PollStorage.abi,
    'setAuthorized', [pollCreationAddress, true],
  );

  // Authorize VoteAction to write to PollStorage
  await callContractWrite(
    api, deployer, 'PollStorage', pollStorageAddress,
    contracts.PollStorage.abi,
    'setAuthorized', [voteActionAddress, true],
  );

  // Set QNS resolver on VoteAction
  await callContractWrite(
    api, deployer, 'VoteAction', voteActionAddress,
    contracts.VoteAction.abi,
    'setQNSContract', [QNS_RESOLVER_ADDRESS],
  );

  // Set QFLink pods storage on VoteAction (if available)
  if (QFLINK_PODS_STORAGE_ADDRESS) {
    await callContractWrite(
      api, deployer, 'VoteAction', voteActionAddress,
      contracts.VoteAction.abi,
      'setQFLinkContract', [QFLINK_PODS_STORAGE_ADDRESS],
    );
  }

  // If bridge deployed, authorize it and configure it
  if (bridgeAddress && QFLINK_PODS_STORAGE_ADDRESS) {
    await callContractWrite(
      api, deployer, 'PollStorage', pollStorageAddress,
      contracts.PollStorage.abi,
      'setAuthorized', [bridgeAddress, true],
    );
    await callContractWrite(
      api, deployer, 'QFLinkPollBridge', bridgeAddress,
      contracts.QFLinkPollBridge!.abi,
      'setQFLinkContract', [QFLINK_PODS_STORAGE_ADDRESS],
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ════════════════════════════════════════════════════════════════════

  console.log('\n=============================================================');
  console.log('  WRITING OUTPUT FILES');
  console.log('=============================================================');

  // deployments.json
  const deployments = {
    network: 'mainnet',
    chainId: 3426,
    timestamp: new Date().toISOString(),
    deployer: {
      ss58: deployer.address,
      evm: deployerEvmAddress,
    },
    contracts: {
      PollStorage: pollStorageAddress,
      PollCreation: pollCreationAddress,
      VoteAction: voteActionAddress,
      ResultsReader: resultsReaderAddress,
      ...(bridgeAddress && { QFLinkPollBridge: bridgeAddress }),
    },
    configuration: {
      creationFee: '100 QF',
      treasuryBps: TREASURY_BPS,
      qnsResolver: QNS_RESOLVER_ADDRESS,
      treasury: TREASURY_ADDRESS,
      burn: BURN_ADDRESS,
    },
  };

  const deploymentsPath = resolve(PROJECT_ROOT, 'deployments.json');
  writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`✅ deployments.json written`);

  // .env.development (for frontend VITE_ variables)
  const envContent = `# QUORUM Frontend Environment
# Generated: ${new Date().toISOString()}
# Network: QF Mainnet (Chain ID 3426)

# RPC
VITE_QF_WS_URL=wss://mainnet.qfnode.net
VITE_QF_ETH_RPC_URL=https://archive.mainnet.qfnode.net/eth

# QUORUM Contracts
VITE_POLL_STORAGE_ADDRESS=${pollStorageAddress}
VITE_POLL_CREATION_ADDRESS=${pollCreationAddress}
VITE_VOTE_ACTION_ADDRESS=${voteActionAddress}
VITE_RESULTS_READER_ADDRESS=${resultsReaderAddress}
${bridgeAddress ? `VITE_QFLINK_POLL_BRIDGE_ADDRESS=${bridgeAddress}` : '# VITE_QFLINK_POLL_BRIDGE_ADDRESS= (not deployed)'}

# QNS
VITE_QNS_REGISTRY_ADDRESS=${QNS_REGISTRY_ADDRESS || ''}
VITE_QNS_RESOLVER_ADDRESS=${QNS_RESOLVER_ADDRESS}
VITE_QNS_REGISTRAR_ADDRESS=${QNS_REGISTRAR_ADDRESS || ''}

# QFLink
VITE_QFLINK_PODS_STORAGE_ADDRESS=${QFLINK_PODS_STORAGE_ADDRESS}

# Treasury & Burn
VITE_TREASURY_ADDRESS=${TREASURY_ADDRESS}
VITE_BURN_ADDRESS=${BURN_ADDRESS}
`;

  writeFileSync(resolve(PROJECT_ROOT, '.env.development'), envContent);
  writeFileSync(resolve(PROJECT_ROOT, '.env.production'), envContent);
  console.log(`✅ .env.development written`);
  console.log(`✅ .env.production written`);

  // ════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════

  console.log('\n=============================================================');
  console.log('  ✅ DEPLOYMENT COMPLETE');
  console.log('=============================================================');
  console.log(`  PollStorage:      ${pollStorageAddress}`);
  console.log(`  PollCreation:     ${pollCreationAddress}`);
  console.log(`  VoteAction:       ${voteActionAddress}`);
  console.log(`  ResultsReader:    ${resultsReaderAddress}`);
  if (bridgeAddress) console.log(`  QFLinkPollBridge: ${bridgeAddress}`);
  console.log('');
  console.log('  Next: verify cross-contract calls work by running:');
  console.log('    npx ts-node scripts/verify-deployment.ts');

  await api.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message || err);
  process.exit(1);
});
