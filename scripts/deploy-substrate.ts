#!/usr/bin/env ts-node
/**
 * QUORUM Contract Deployment — QF Network (pallet-revive)
 *
 * Uses api.tx.revive.instantiateWithCode directly.
 * @polkadot/api-contract is NOT used — it targets pallet-contracts, not pallet-revive.
 */

import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';
import { encodeFunctionData } from 'viem';

config();

// ═══════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════

const RPC_URL          = process.env.QF_RPC_URL || 'wss://mainnet.qfnode.net';
const ETH_RPC_URL      = process.env.QF_ETH_RPC_URL || 'https://archive.mainnet.qfnode.net/eth';
const MNEMONIC         = process.env.DEPLOYER_MNEMONIC;

const QNS_RESOLVER     = process.env.QNS_RESOLVER_ADDRESS!;
const QNS_REGISTRY     = process.env.QNS_REGISTRY_ADDRESS!;
const QNS_REGISTRAR    = process.env.QNS_REGISTRAR_ADDRESS!;
const TREASURY         = process.env.TREASURY_ADDRESS!;
const BURN_ADDRESS     = process.env.BURN_ADDRESS || '0x000000000000000000000000000000000000dEaD';

// Optional QFLink
const QFLINK_PODS      = process.env.QFLINK_PODS_ADDRESS || '';
const QFLINK_REVENUE   = process.env.QFLINK_REVENUE_ADDRESS || '';

// Fees
const CREATION_FEE     = 100n * 10n ** 18n;   // 100 QF
const TREASURY_BPS     = 5000;                 // 50%
const QFLINK_FEE       = 50n * 10n ** 18n;    // 50 QF

// Gas — conservative defaults for QF Network (0.1s block time)
const FALLBACK_REF_TIME   = 20_000_000_000n;   // 20 billion — fits within QF's block budget
const FALLBACK_PROOF_SIZE = 2_000_000n;
const STORAGE_DEPOSIT    = 0n;   // 0 = unlimited

// Contract deployment order
const CONTRACTS = [
  'PollStorage',
  'PollCreation',
  'VoteAction',
  'ResultsReader',
  'QFLinkPollBridge',
] as const;

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function loadAbi(name: string): any[] {
  const p = resolve(`src/abi/${name}.json`);
  if (!existsSync(p)) throw new Error(`ABI not found: ${p}`);
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function loadBytecode(name: string): Uint8Array {
  const p = resolve(`output/${name}.polkavm`);
  if (!existsSync(p)) throw new Error(`Bytecode not found: ${p}`);
  return readFileSync(p);
}

function formatBalance(raw: bigint): string {
  return (Number(raw) / 1e18).toLocaleString('en-US', { maximumFractionDigits: 4 });
}

/**
 * Encode Solidity constructor arguments.
 * For contracts with no constructor args, returns '0x' (empty).
 */
function encodeConstructor(abi: any[], args: any[]): `0x${string}` {
  const ctor = abi.find((item: any) => item.type === 'constructor');
  if (!ctor || ctor.inputs.length === 0) return '0x';
  // Use viem to ABI-encode the constructor inputs
  // encodeFunctionData won't work for constructors, so encode manually:
  const { encodeAbiParameters } = require('viem');
  return encodeAbiParameters(ctor.inputs, args);
}

/**
 * Estimate gas for an instantiateWithCode call via dry-run.
 * Falls back to conservative defaults if the runtime doesn't expose the API.
 */
async function estimateInstantiateGas(
  api: ApiPromise,
  deployer: any,
  bytecodeHex: string,
  dataHex: string,
  value: bigint = 0n,
): Promise<{ refTime: bigint; proofSize: bigint }> {
  // Conservative defaults for QF Network (0.1s block time)
  const FALLBACK = { refTime: FALLBACK_REF_TIME, proofSize: FALLBACK_PROOF_SIZE };

  try {
    // Check if the runtime exposes ReviveApi.instantiate for dry-runs
    if (api.call?.reviveApi?.instantiate) {
      console.log('  Estimating gas via dry-run...');

      const result = await api.call.reviveApi.instantiate(
        deployer.address,       // origin
        value,                  // value
        undefined,              // gas_limit (None = use block max)
        undefined,              // storage_deposit_limit (None)
        { type: 'Upload', value: bytecodeHex },  // code
        dataHex,                // data
        null,                   // salt
      );

      const r = result as any;
      if (r.gasRequired || r.gas_required) {
        const gas = r.gasRequired || r.gas_required;
        const refTime = BigInt(gas.refTime?.toString() || gas.ref_time?.toString() || '0');
        const proofSize = BigInt(gas.proofSize?.toString() || gas.proof_size?.toString() || '0');

        if (refTime > 0n) {
          // Add 20% buffer (not 50% — block budget is tight on QF)
          const estimated = {
            refTime: (refTime * 120n) / 100n,
            proofSize: (proofSize * 120n) / 100n,
          };
          console.log(`  Estimated: refTime=${estimated.refTime}, proofSize=${estimated.proofSize}`);
          return estimated;
        }
      }
    }
  } catch (e: any) {
    console.log(`  Dry-run not available: ${e.message?.slice(0, 80)}`);
  }

  console.log(`  Using fallback: refTime=${FALLBACK.refTime}, proofSize=${FALLBACK.proofSize}`);
  return FALLBACK;
}

// ═══════════════════════════════════════════════════════════════════
// DEPLOY & CALL
// ═══════════════════════════════════════════════════════════════════

async function deployContract(
  api: ApiPromise,
  deployer: any,
  name: string,
  abi: any[],
  bytecode: Uint8Array,
  constructorArgs: any[] = [],
  value: bigint = 0n,
): Promise<string> {
  console.log(`\n--- Deploying ${name} ---`);
  console.log(`  Bytecode: ${bytecode.length} bytes`);
  console.log(`  Constructor args: ${constructorArgs.length === 0 ? 'none' : JSON.stringify(constructorArgs)}`);

  const ctorData = encodeConstructor(abi, constructorArgs);
  const codeHex = `0x${Buffer.from(bytecode).toString('hex')}`;

  // Estimate gas via dry-run or use fallback
  const gas = await estimateInstantiateGas(api, deployer, codeHex, ctorData, value);

  const tx = api.tx.revive.instantiateWithCode(
    value,
    { refTime: gas.refTime, proofSize: gas.proofSize },
    STORAGE_DEPOSIT,
    codeHex,
    ctorData,
    null,
  );

  return new Promise<string>((resolve, reject) => {
    tx.signAndSend(deployer, ({ status, events, dispatchError }) => {
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
        console.log(`  📦 In block: ${status.asInBlock.toHex()}`);
      }

      if (status.isFinalized) {
        console.log(`  ✅ Finalized: ${status.asFinalized.toHex()}`);

        let contractAddress: string | null = null;
        for (const { event } of events) {
          if (event.section === 'revive' && event.method === 'Instantiated') {
            // event.data: [deployer, contractAddress]
            contractAddress = event.data[1]?.toString();
          }
        }

        if (!contractAddress) {
          // Fallback: look for the address in any event data
          for (const { event } of events) {
            console.log(`  Event: ${event.section}.${event.method} ${JSON.stringify(event.data.map((d: any) => d.toString()))}`);
          }
          reject(new Error(`${name}: no contract address found in events`));
          return;
        }

        console.log(`  📍 Address: ${contractAddress}`);
        resolve(contractAddress);
      }
    }).catch(reject);
  });
}

async function callContractWrite(
  api: ApiPromise,
  deployer: any,
  contractAddress: string,
  abi: any[],
  functionName: string,
  args: any[],
  value: bigint = 0n,
): Promise<void> {
  console.log(`  → ${functionName}(${args.map(a => typeof a === 'bigint' ? a.toString() : a).join(', ')})`);

  const data = encodeFunctionData({ abi, functionName, args });

  // Estimate gas for the call
  let gasLimit = { refTime: 5_000_000_000n, proofSize: 500_000n };  // Conservative default for calls
  try {
    if (api.call?.reviveApi?.call) {
      const dryRun = await api.call.reviveApi.call(
        deployer.address, contractAddress, value, undefined, undefined, data
      );
      const d = dryRun as any;
      const gas = d.gasRequired || d.gas_required;
      if (gas) {
        const refTime = BigInt(gas.refTime?.toString() || gas.ref_time?.toString() || '0');
        const proofSize = BigInt(gas.proofSize?.toString() || gas.proof_size?.toString() || '0');
        if (refTime > 0n) {
          gasLimit = {
            refTime: (refTime * 120n) / 100n,
            proofSize: (proofSize * 120n) / 100n,
          };
        }
      }
    }
  } catch { /* use defaults */ }

  const tx = api.tx.revive.call(
    contractAddress,
    value,
    { refTime: gasLimit.refTime, proofSize: gasLimit.proofSize },
    STORAGE_DEPOSIT,
    data,
  );

  return new Promise<void>((resolve, reject) => {
    tx.signAndSend(deployer, ({ status, dispatchError }) => {
      if (dispatchError) {
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else {
          reject(new Error(`Dispatch error: ${dispatchError.toString()}`));
        }
        return;
      }
      if (status.isFinalized) {
        console.log(`    ✅ Finalized`);
        resolve();
      }
    }).catch(reject);
  });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log('=============================================================');
  console.log('  QUORUM — Contract Deployment (pallet-revive)');
  console.log('=============================================================\n');

  // Validate
  if (!MNEMONIC) { console.error('❌ DEPLOYER_MNEMONIC not set'); process.exit(1); }
  if (!QNS_RESOLVER) { console.error('❌ QNS_RESOLVER_ADDRESS not set'); process.exit(1); }
  if (!TREASURY) { console.error('❌ TREASURY_ADDRESS not set'); process.exit(1); }

  // Connect
  console.log(`📡 Connecting to ${RPC_URL}...`);
  const provider = new WsProvider(RPC_URL);
  const api = await ApiPromise.create({ provider });
  const [chain, nodeName] = await Promise.all([
    api.rpc.system.chain(),
    api.rpc.system.name(),
  ]);
  console.log(`✅ Connected to ${chain} (${nodeName})`);

  // Verify revive pallet exists
  if (!api.tx.revive) {
    console.error('❌ This runtime does not expose api.tx.revive. Is this pallet-revive chain?');
    process.exit(1);
  }

  // Load deployer
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromMnemonic(MNEMONIC);
  console.log(`🔑 Deployer: ${deployer.address}`);

  const { data: balance } = await api.query.system.account(deployer.address);
  const free = BigInt(balance.free.toString());
  console.log(`💰 Balance: ${formatBalance(free)} QF\n`);
  if (free === 0n) { console.error('❌ Zero balance'); process.exit(1); }

  // Print config
  console.log('📋 Configuration:');
  console.log(`  QNS Resolver:     ${QNS_RESOLVER}`);
  console.log(`  QNS Registry:     ${QNS_REGISTRY}`);
  console.log(`  Treasury:         ${TREASURY}`);
  console.log(`  Burn:             ${BURN_ADDRESS}`);
  console.log(`  Creation Fee:     100 QF`);
  console.log(`  Treasury Split:   50%`);

  // Load compiled contracts
  const abis: Record<string, any[]> = {};
  const bytecodes: Record<string, Uint8Array> = {};
  for (const name of CONTRACTS) {
    try {
      abis[name] = loadAbi(name);
      bytecodes[name] = loadBytecode(name);
    } catch (e: any) {
      if (name === 'QFLinkPollBridge' && !QFLINK_REVENUE) {
        console.log(`\n⏭  Skipping ${name} (no QFLink config)`);
        continue;
      }
      throw e;
    }
  }

  // ═════════════════════════════════════════════════════════════════
  // DEPLOY
  // ═════════════════════════════════════════════════════════════════
  console.log('\n=============================================================');
  console.log('  DEPLOYING CONTRACTS');
  console.log('=============================================================');

  const addresses: Record<string, string> = {};

  // 1. PollStorage — no constructor args
  addresses.PollStorage = await deployContract(
    api, deployer, 'PollStorage', abis.PollStorage, bytecodes.PollStorage
  );

  // 2. PollCreation(pollStorage, qnsResolver, treasury, burnAddress, creationFee, treasuryBps)
  addresses.PollCreation = await deployContract(
    api, deployer, 'PollCreation', abis.PollCreation, bytecodes.PollCreation,
    [addresses.PollStorage, QNS_RESOLVER, TREASURY, BURN_ADDRESS, CREATION_FEE, TREASURY_BPS]
  );

  // 3. VoteAction(pollStorage)
  addresses.VoteAction = await deployContract(
    api, deployer, 'VoteAction', abis.VoteAction, bytecodes.VoteAction,
    [addresses.PollStorage]
  );

  // 4. ResultsReader(pollStorage)
  addresses.ResultsReader = await deployContract(
    api, deployer, 'ResultsReader', abis.ResultsReader, bytecodes.ResultsReader,
    [addresses.PollStorage]
  );

  // 5. Optional: QFLinkPollBridge
  if (QFLINK_REVENUE && abis.QFLinkPollBridge && bytecodes.QFLinkPollBridge) {
    addresses.QFLinkPollBridge = await deployContract(
      api, deployer, 'QFLinkPollBridge', abis.QFLinkPollBridge, bytecodes.QFLinkPollBridge,
      [addresses.PollCreation, QFLINK_REVENUE, QFLINK_PODS || '0x0000000000000000000000000000000000000000', QFLINK_FEE]
    );
  }

  // ═════════════════════════════════════════════════════════════════
  // WIRE AUTHORIZATIONS
  // ═════════════════════════════════════════════════════════════════
  console.log('\n=============================================================');
  console.log('  WIRING CONTRACTS');
  console.log('=============================================================');

  // Authorize PollCreation on PollStorage
  console.log('\n📝 Authorizing PollCreation on PollStorage...');
  await callContractWrite(api, deployer, addresses.PollStorage, abis.PollStorage,
    'setAuthorized', [addresses.PollCreation, true]);

  // Authorize VoteAction on PollStorage
  console.log('\n📝 Authorizing VoteAction on PollStorage...');
  await callContractWrite(api, deployer, addresses.PollStorage, abis.PollStorage,
    'setAuthorized', [addresses.VoteAction, true]);

  // Set QNS resolver on VoteAction
  console.log('\n📝 Setting QNS resolver on VoteAction...');
  await callContractWrite(api, deployer, addresses.VoteAction, abis.VoteAction,
    'setQNSContract', [QNS_RESOLVER]);

  // Optional: set QFLink contract on VoteAction
  if (QFLINK_PODS) {
    console.log('\n📝 Setting QFLink pods on VoteAction...');
    await callContractWrite(api, deployer, addresses.VoteAction, abis.VoteAction,
      'setQFLinkContract', [QFLINK_PODS]);
  }

  // Optional: authorize QFLinkPollBridge on PollStorage
  if (addresses.QFLinkPollBridge) {
    console.log('\n📝 Authorizing QFLinkPollBridge on PollStorage...');
    await callContractWrite(api, deployer, addresses.PollStorage, abis.PollStorage,
      'setAuthorized', [addresses.QFLinkPollBridge, true]);
  }

  // ═════════════════════════════════════════════════════════════════
  // OUTPUT FILES
  // ═════════════════════════════════════════════════════════════════
  console.log('\n=============================================================');
  console.log('  WRITING OUTPUT FILES');
  console.log('=============================================================');

  const deployment = {
    network: 'mainnet',
    chainId: 3426,
    rpcUrl: RPC_URL,
    ethRpcUrl: ETH_RPC_URL,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: addresses,
    config: {
      qnsResolver: QNS_RESOLVER,
      qnsRegistry: QNS_REGISTRY,
      qnsRegistrar: QNS_REGISTRAR,
      treasury: TREASURY,
      burnAddress: BURN_ADDRESS,
      creationFee: CREATION_FEE.toString(),
      treasuryBps: TREASURY_BPS,
      qflinkFee: QFLINK_FEE.toString(),
    },
  };

  writeFileSync('deployments.json', JSON.stringify(deployment, null, 2));
  console.log('  ✅ deployments.json');

  // Generate .env files for frontend
  const envContent = [
    `# QUORUM Frontend — generated ${new Date().toISOString()}`,
    `VITE_QF_RPC_URL=${RPC_URL}`,
    `VITE_QF_ETH_RPC_URL=${ETH_RPC_URL}`,
    `VITE_POLL_STORAGE_ADDRESS=${addresses.PollStorage}`,
    `VITE_POLL_CREATION_ADDRESS=${addresses.PollCreation}`,
    `VITE_VOTE_ACTION_ADDRESS=${addresses.VoteAction}`,
    `VITE_RESULTS_READER_ADDRESS=${addresses.ResultsReader}`,
    addresses.QFLinkPollBridge ? `VITE_QFLINK_BRIDGE_ADDRESS=${addresses.QFLinkPollBridge}` : '',
    `VITE_QNS_RESOLVER_ADDRESS=${QNS_RESOLVER}`,
    `VITE_QNS_REGISTRY_ADDRESS=${QNS_REGISTRY}`,
    `VITE_QNS_REGISTRAR_ADDRESS=${QNS_REGISTRAR}`,
    `VITE_TREASURY_ADDRESS=${TREASURY}`,
    `VITE_BURN_ADDRESS=${BURN_ADDRESS}`,
    `VITE_CREATION_FEE=100`,
    `VITE_TREASURY_BPS=${TREASURY_BPS}`,
  ].filter(Boolean).join('\n');

  writeFileSync('.env.development', envContent);
  writeFileSync('.env.production', envContent);
  console.log('  ✅ .env.development');
  console.log('  ✅ .env.production');

  // ═════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═════════════════════════════════════════════════════════════════
  console.log('\n=============================================================');
  console.log('  ✅ DEPLOYMENT COMPLETE');
  console.log('=============================================================\n');
  for (const [name, addr] of Object.entries(addresses)) {
    console.log(`  ${name.padEnd(22)} ${addr}`);
  }
  console.log('');

  await api.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Deployment failed:', err.message || err);
  process.exit(1);
});
