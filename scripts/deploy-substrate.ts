#!/usr/bin/env ts-node
/**
 * QUORUM — Contract Deployment for QF Network (Substrate + Revive/PolkaVM)
 *
 * Uses @polkadot/api-contract CodePromise — the same deployment path
 * proven in production by QNS (dotqf.xyz).
 *
 * Prerequisites:
 *   - Run ./scripts/compile-revive.sh first
 *   - .env with QF_RPC_URL, QNS addresses, TREASURY_ADDRESS
 *   - Pass DEPLOYER_MNEMONIC inline at runtime
 *
 * Usage:
 *   DEPLOYER_MNEMONIC="your mnemonic" npx ts-node scripts/deploy-substrate.ts
 */

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { CodePromise } from '@polkadot/api-contract';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { encodeFunctionData, keccak256 } from 'viem';

config();

// =============================================================================
// CONFIGURATION
// =============================================================================

const RPC_URL = process.env.QF_RPC_URL || 'wss://mainnet.qfnode.net';
const MNEMONIC = process.env.DEPLOYER_MNEMONIC;
const BURN_ADDRESS = process.env.BURN_ADDRESS || '0x000000000000000000000000000000000000dEaD';

const QNS_REGISTRY_ADDRESS = process.env.QNS_REGISTRY_ADDRESS;
const QNS_RESOLVER_ADDRESS = process.env.QNS_RESOLVER_ADDRESS;
const QNS_REGISTRAR_ADDRESS = process.env.QNS_REGISTRAR_ADDRESS;
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
const QFLINK_PODS_STORAGE_ADDRESS = process.env.QFLINK_PODS_STORAGE_ADDRESS || '';
const QFLINK_REVENUE_ADDRESS = process.env.QFLINK_REVENUE_ADDRESS || '';

const CREATION_FEE = 100n * 10n ** 18n; // 100 QF
const TREASURY_BPS = 5000; // 50%
const QFLINK_FEE = 50n * 10n ** 18n; // 50 QF
const GAS_LIMIT = 100_000_000_000n;

// =============================================================================
// PATHS
// =============================================================================

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');

// =============================================================================
// HELPERS
// =============================================================================

function formatBalance(balance: bigint): string {
  const qf = Number(balance) / 1e18;
  return qf.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function deriveEvmAddress(publicKey: Uint8Array): string {
  const hex = '0x' + Array.from(publicKey).map(b => b.toString(16).padStart(2, '0')).join('');
  const hash = keccak256(hex as `0x${string}`);
  return '0x' + hash.slice(-40);
}

function loadABI(contractName: string): any {
  const abiPath = resolve(PROJECT_ROOT, 'src', 'abi', `${contractName}.json`);
  if (!existsSync(abiPath)) {
    throw new Error(`ABI not found: ${abiPath}. Run ./scripts/compile-revive.sh first.`);
  }
  const raw = JSON.parse(readFileSync(abiPath, 'utf-8'));
  return Array.isArray(raw) ? raw : raw.abi || raw;
}

function loadBytecode(contractName: string): Buffer {
  const bytecodePath = resolve(PROJECT_ROOT, 'output', `${contractName}.polkavm`);
  if (!existsSync(bytecodePath)) {
    throw new Error(`Bytecode not found: ${bytecodePath}. Run ./scripts/compile-revive.sh first.`);
  }
  return readFileSync(bytecodePath);
}

// =============================================================================
// DEPLOY VIA CodePromise — same pattern as QNS production deployment
// =============================================================================

async function deployContract(
  api: ApiPromise,
  deployer: any,
  name: string,
  abi: any,
  bytecode: Buffer,
  constructorArgs: any[] = [],
  value: bigint = 0n,
): Promise<string> {
  console.log(`\n--- Deploying ${name} ---`);
  console.log(`  Bytecode: ${bytecode.length} bytes`);
  console.log(`  Constructor args: ${constructorArgs.length > 0 ? JSON.stringify(constructorArgs).slice(0, 150) : 'none'}`);

  const code = new CodePromise(api, abi, bytecode);

  // CodePromise expects the constructor identifier.
  // For standard Solidity compiled via resolc, the constructor is 'new'.
  const constructorId = (abi as any)?.contract?.constructors?.[0]?.identifier || 'new';

  const tx = code.tx[constructorId](
    {
      gasLimit: GAS_LIMIT,
      value,
    },
    ...constructorArgs,
  );

  return new Promise<string>((resolvePromise, reject) => {
    tx.signAndSend(deployer, ({ status, events, dispatchError }: any) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          reject(new Error(`${name}: ${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else {
          reject(new Error(`${name}: Dispatch error: ${dispatchError.toString()}`));
        }
        return;
      }

      if (status.isInBlock) {
        console.log(`  📦 In block: ${status.asInBlock.toHex()}`);
      }

      if (status.isFinalized) {
        console.log(`  ✅ Finalized: ${status.asFinalized.toHex()}`);

        let contractAddress: string | null = null;

        events.forEach(({ event }: any) => {
          if (event.section === 'revive' && event.method === 'Instantiated') {
            contractAddress = event.data[1]?.toString();
          }
        });

        if (!contractAddress) {
          // Debug output
          console.log('  ⚠ No Instantiated event found. All revive events:');
          events.forEach(({ event }: any) => {
            if (event.section === 'revive') {
              console.log(`    ${event.section}.${event.method}:`, JSON.stringify(event.data.toJSON()));
            }
          });
          reject(new Error(`${name}: Contract address not found in events`));
          return;
        }

        console.log(`  📍 ${name} → ${contractAddress}`);
        resolvePromise(contractAddress);
      }
    }).catch(reject);
  });
}

// =============================================================================
// WRITE CALL — call a function on a deployed contract
// =============================================================================

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
  const argsDisplay = args.map(a =>
    typeof a === 'string' && a.length > 28 ? a.slice(0, 12) + '…' + a.slice(-8) : String(a)
  ).join(', ');
  console.log(`  → ${contractName}.${functionName}(${argsDisplay})`);

  const data = encodeFunctionData({ abi, functionName, args });

  // Discover the correct extrinsic shape from the chain metadata.
  // On QF Network's pallet-revive, revive.call takes:
  //   dest, value, gas_limit (Weight), storage_deposit_limit, data
  //
  // We build the Weight the same way QNS/QFPay frontends do for writes.

  return new Promise<void>((resolvePromise, reject) => {
    // Build the call. @polkadot/api reads the chain metadata and knows
    // exactly what shape gas_limit should be (Weight struct, u64, etc).
    const tx = api.tx.revive.call(
      contractAddress,
      value,
      api.createType('Weight', {
        refTime: GAS_LIMIT,
        proofSize: 5_000_000n,
      }),
      DEFAULT_STORAGE_DEPOSIT,
      data,
    );

    tx.signAndSend(deployer, ({ status, dispatchError }: any) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          reject(new Error(
            `${contractName}.${functionName}: ${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}` 
          ));
        } else {
          reject(new Error(
            `${contractName}.${functionName}: ${dispatchError.toString()}` 
          ));
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

const DEFAULT_STORAGE_DEPOSIT = 0n;

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('=============================================================');
  console.log('  QUORUM — Substrate Deployment (PolkaVM / Revive)');
  console.log('  Using CodePromise (same as QNS production)');
  console.log('=============================================================\n');

  // ── Validate ──
  if (!MNEMONIC) {
    console.error('❌ DEPLOYER_MNEMONIC not set.');
    console.error('   Run: DEPLOYER_MNEMONIC="your mnemonic" npx ts-node scripts/deploy-substrate.ts');
    process.exit(1);
  }
  if (!QNS_RESOLVER_ADDRESS) {
    console.error('❌ QNS_RESOLVER_ADDRESS not set in .env');
    process.exit(1);
  }
  if (!TREASURY_ADDRESS) {
    console.error('❌ TREASURY_ADDRESS not set in .env');
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

  // ── Deployer ──
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromMnemonic(MNEMONIC);
  const deployerEvmAddress = deriveEvmAddress(deployer.publicKey);
  console.log(`🔑 Deployer SS58: ${deployer.address}`);
  console.log(`🔑 Deployer EVM:  ${deployerEvmAddress}`);

  const { data: balance } = await api.query.system.account(deployer.address);
  const freeBalance = BigInt(balance.free.toString());
  console.log(`💰 Balance: ${formatBalance(freeBalance)} QF\n`);

  if (freeBalance === 0n) {
    console.error('❌ Deployer has zero balance.');
    process.exit(1);
  }

  // ── Load compiled contracts ──
  console.log('📦 Loading compiled contracts...');

  interface ContractArtifact {
    abi: any;
    bytecode: Buffer;
  }

  const contracts: Record<string, ContractArtifact> = {};
  const requiredContracts = ['PollStorage', 'PollCreation', 'VoteAction', 'ResultsReader'];
  const optionalContracts = ['QFLinkPollBridge'];

  for (const name of [...requiredContracts, ...optionalContracts]) {
    try {
      contracts[name] = {
        abi: loadABI(name),
        bytecode: loadBytecode(name),
      };
      console.log(`  ✓ ${name} (${contracts[name].bytecode.length} bytes)`);
    } catch (err: any) {
      if (optionalContracts.includes(name)) {
        console.log(`  ⚠ ${name} skipped (optional)`);
      } else {
        throw err;
      }
    }
  }

  // ── Config summary ──
  console.log('\n📋 Configuration:');
  console.log(`  QNS Resolver:     ${QNS_RESOLVER_ADDRESS}`);
  if (QNS_REGISTRY_ADDRESS) console.log(`  QNS Registry:     ${QNS_REGISTRY_ADDRESS}`);
  if (QNS_REGISTRAR_ADDRESS) console.log(`  QNS Registrar:    ${QNS_REGISTRAR_ADDRESS}`);
  console.log(`  Treasury:         ${TREASURY_ADDRESS}`);
  console.log(`  Burn:             ${BURN_ADDRESS}`);
  console.log(`  Creation Fee:     100 QF`);
  console.log(`  Treasury Split:   50%`);
  if (QFLINK_PODS_STORAGE_ADDRESS) console.log(`  QFLink Pods:      ${QFLINK_PODS_STORAGE_ADDRESS}`);

  // ════════════════════════════════════════════════════════════════════
  // DEPLOY
  // ════════════════════════════════════════════════════════════════════

  console.log('\n=============================================================');
  console.log('  DEPLOYING CONTRACTS');
  console.log('=============================================================');

  // 1. PollStorage — no constructor args
  const pollStorageAddress = await deployContract(
    api, deployer, 'PollStorage',
    contracts.PollStorage.abi,
    contracts.PollStorage.bytecode,
  );

  // 2. PollCreation(pollStorage, qnsResolver, treasury, burn, fee, bps)
  const pollCreationAddress = await deployContract(
    api, deployer, 'PollCreation',
    contracts.PollCreation.abi,
    contracts.PollCreation.bytecode,
    [
      pollStorageAddress,
      QNS_RESOLVER_ADDRESS,
      TREASURY_ADDRESS,
      BURN_ADDRESS,
      CREATION_FEE,
      TREASURY_BPS,
    ],
  );

  // 3. VoteAction(pollStorage)
  const voteActionAddress = await deployContract(
    api, deployer, 'VoteAction',
    contracts.VoteAction.abi,
    contracts.VoteAction.bytecode,
    [pollStorageAddress],
  );

  // 4. ResultsReader(pollStorage)
  const resultsReaderAddress = await deployContract(
    api, deployer, 'ResultsReader',
    contracts.ResultsReader.abi,
    contracts.ResultsReader.bytecode,
    [pollStorageAddress],
  );

  // 5. QFLinkPollBridge (optional)
  let bridgeAddress: string | null = null;
  if (contracts.QFLinkPollBridge && QFLINK_REVENUE_ADDRESS) {
    bridgeAddress = await deployContract(
      api, deployer, 'QFLinkPollBridge',
      contracts.QFLinkPollBridge.abi,
      contracts.QFLinkPollBridge.bytecode,
      [pollCreationAddress, QFLINK_REVENUE_ADDRESS, QFLINK_FEE],
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // WIRE
  // ════════════════════════════════════════════════════════════════════

  console.log('\n=============================================================');
  console.log('  WIRING CONTRACTS');
  console.log('=============================================================');

  // Authorize PollCreation → PollStorage
  await callContractWrite(
    api, deployer, 'PollStorage', pollStorageAddress,
    contracts.PollStorage.abi,
    'setAuthorized', [pollCreationAddress, true],
  );

  // Authorize VoteAction → PollStorage
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

  // Wire bridge (if deployed)
  if (bridgeAddress) {
    await callContractWrite(
      api, deployer, 'PollStorage', pollStorageAddress,
      contracts.PollStorage.abi,
      'setAuthorized', [bridgeAddress, true],
    );
    if (QFLINK_PODS_STORAGE_ADDRESS) {
      await callContractWrite(
        api, deployer, 'QFLinkPollBridge', bridgeAddress,
        contracts.QFLinkPollBridge.abi,
        'setQFLinkContract', [QFLINK_PODS_STORAGE_ADDRESS],
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // OUTPUT
  // ════════════════════════════════════════════════════════════════════

  console.log('\n=============================================================');
  console.log('  WRITING OUTPUT FILES');
  console.log('=============================================================');

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

  writeFileSync(resolve(PROJECT_ROOT, 'deployments.json'), JSON.stringify(deployments, null, 2));
  console.log('✅ deployments.json');

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
  console.log('✅ .env.development');
  console.log('✅ .env.production');

  // ════════════════════════════════════════════════════════════════════
  // DONE
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

  await api.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message || err);
  process.exit(1);
});
