// deploy-quorum.mjs — QUORUM mainnet deployment for QF Network
// Usage: DEPLOYER_SEED="..." TREASURY_ADDRESS="0x..." node deploy-quorum.mjs

import { ApiPromise, WsProvider } from '@polkadot/api';
import { Keyring } from '@polkadot/keyring';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { ethers } from 'ethers';

// --- Config ---
const RPC_URL = process.env.QF_RPC_URL || 'wss://mainnet.qfnode.net';
const DEPLOYER_SEED = process.env.DEPLOYER_SEED;

const QNS_RESOLVER = process.env.QNS_RESOLVER_ADDRESS;
const QNS_REGISTRY = process.env.QNS_REGISTRY_ADDRESS;
const QNS_REGISTRAR = process.env.QNS_REGISTRAR_ADDRESS;
const TREASURY = process.env.TREASURY_ADDRESS;
const BURN_ADDRESS = process.env.BURN_ADDRESS || '0x000000000000000000000000000000000000dEaD';
const QFLINK_PODS = process.env.QFLINK_PODS_ADDRESS || '';
const QFLINK_REVENUE = process.env.QFLINK_REVENUE_ADDRESS || '';

const CREATION_FEE = 100n * 10n ** 18n;
const TREASURY_BPS = 5000;
const QFLINK_FEE = 50n * 10n ** 18n;

const COMBINED_JSON_PATH = './contracts/combined.json';

// --- Validation ---
if (!DEPLOYER_SEED) { console.error('ERROR: DEPLOYER_SEED required'); process.exit(1); }
if (!QNS_RESOLVER) { console.error('ERROR: QNS_RESOLVER_ADDRESS required'); process.exit(1); }
if (!TREASURY) { console.error('ERROR: TREASURY_ADDRESS required'); process.exit(1); }

// --- Artifact loader (from combined.json, same as QFPay) ---
function loadContractArtifact(contractName) {
  if (!existsSync(COMBINED_JSON_PATH)) {
    console.error(`ERROR: ${COMBINED_JSON_PATH} not found. Run ./scripts/compile-revive.sh first`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(COMBINED_JSON_PATH, 'utf-8'));
  const contractKey = Object.keys(raw.contracts).find(k => k.split(':').pop() === contractName);
  if (!contractKey) {
    console.error(`ERROR: "${contractName}" not found. Available:`, Object.keys(raw.contracts).join(', '));
    process.exit(1);
  }
  const cd = raw.contracts[contractKey];
  const abi = typeof cd.abi === 'string' ? JSON.parse(cd.abi) : cd.abi;
  const bytecode = cd.bin.startsWith('0x') ? cd.bin : '0x' + cd.bin;
  return { abi, bytecode };
}

// --- Deploy (exact QFPay/QNS pattern) ---
function deployContract(api, deployer, name, artifact, constructorArgs, options) {
  return new Promise((resolve, reject) => {
    const { gasLimit, storageDepositLimit } = options;

    console.log(`\n--- Deploying ${name} ---`);

    const iface = new ethers.Interface(artifact.abi);
    const encodedArgs = iface.encodeDeploy(constructorArgs);
    const data = encodedArgs === '0x' ? '0x' : '0x' + encodedArgs.slice(2);
    const code = artifact.bytecode;

    console.log(`  Bytecode: ${Math.round(code.length / 2)} bytes`);
    console.log(`  Args: ${constructorArgs.map(a => typeof a === 'bigint' ? a.toString() : a).join(', ')}`);

    const tx = api.tx.revive.instantiateWithCode(
      BigInt(0),
      gasLimit,
      storageDepositLimit,
      code,
      data,
      null
    );

    const timeout = setTimeout(() => reject(new Error('Deploy timed out (180s)')), 180000);

    tx.signAndSend(deployer, { withSignedTransaction: false }, ({ status, events, dispatchError }) => {
      if (dispatchError) {
        clearTimeout(timeout);
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else {
          reject(new Error(dispatchError.toString()));
        }
        return;
      }
      if (status.isInBlock) console.log(`  In block: ${status.asInBlock.toHex()}`);
      if (status.isFinalized) {
        clearTimeout(timeout);
        let addr = null;
        for (const { event } of events) {
          if (event.section === 'revive' && event.method === 'Instantiated') {
            addr = event.data.contract?.toString() || event.data[1]?.toString();
          }
        }
        if (!addr) { reject(new Error(`${name}: no address in events`)); return; }
        addr = addr.startsWith('0x') ? addr.toLowerCase() : '0x' + addr;
        console.log(`  Deployed: ${addr}`);
        resolve(addr);
      }
    }).catch(err => { clearTimeout(timeout); reject(err); });
  });
}

// --- Contract call (exact QFPay/QNS pattern) ---
function callContract(api, deployer, contractAddress, abi, methodName, args, options) {
  return new Promise((resolve, reject) => {
    const { gasLimit, storageDepositLimit } = options;

    console.log(`  -> ${methodName}(${args.map(a => typeof a === 'bigint' ? a.toString() : a).join(', ')})`);

    const iface = new ethers.Interface(abi);
    const data = iface.encodeFunctionData(methodName, args);

    const tx = api.tx.revive.call(
      contractAddress,
      BigInt(0),
      gasLimit,
      storageDepositLimit,
      data
    );

    const timeout = setTimeout(() => reject(new Error(`${methodName} timed out (120s)`)), 120000);

    tx.signAndSend(deployer, { withSignedTransaction: false }, ({ status, dispatchError }) => {
      if (dispatchError) {
        clearTimeout(timeout);
        if (dispatchError.isModule) {
          const decoded = api.registry.findMetaError(dispatchError.asModule);
          reject(new Error(`${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`));
        } else {
          reject(new Error(dispatchError.toString()));
        }
        return;
      }
      if (status.isFinalized) { clearTimeout(timeout); console.log(`     Done`); resolve(); }
    }).catch(err => { clearTimeout(timeout); reject(err); });
  });
}

// --- mapAccount (same as QFPay) ---
function mapAccount(api, deployer) {
  return new Promise((resolve, reject) => {
    console.log('Mapping deployer account...');
    api.tx.revive.mapAccount().signAndSend(deployer, { withSignedTransaction: false }, ({ status, dispatchError }) => {
      if (dispatchError) {
        const str = dispatchError.isModule
          ? api.registry.findMetaError(dispatchError.asModule).name
          : dispatchError.toString();
        if (str.includes('AlreadyMapped') || str.includes('AccountAlreadyMapped')) {
          console.log('  Already mapped'); resolve(); return;
        }
        reject(new Error(`mapAccount failed: ${str}`)); return;
      }
      if (status.isFinalized) { console.log('  Mapped'); resolve(); }
    }).catch(err => {
      if (err.message?.includes('AlreadyMapped')) { resolve(); return; }
      reject(err);
    });
  });
}

// --- Main ---
async function main() {
  console.log('=== QUORUM Deployment ===');
  console.log(`RPC: ${RPC_URL}\n`);

  const provider = new WsProvider(RPC_URL);
  const api = await ApiPromise.create({ provider });
  const chain = await api.rpc.system.chain();
  console.log(`Connected: ${chain}`);

  if (!api.tx.revive) { console.error('pallet-revive not found!'); process.exit(1); }

  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromUri(DEPLOYER_SEED);
  console.log(`Deployer: ${deployer.address}`);

  const { data: balance } = await api.query.system.account(deployer.address);
  const freeBalance = balance.free.toBigInt();
  console.log(`Balance: ${(Number(freeBalance) / 1e18).toFixed(4)} QF\n`);

  if (freeBalance < 10n * 10n ** 18n) {
    console.error('Balance too low (< 10 QF)'); process.exit(1);
  }

  // Map account
  await mapAccount(api, deployer);

  // --- Gas limits from chain (THE KEY PATTERN) ---
  const blockWeights = api.consts.system.blockWeights;
  const maxExtrinsic = blockWeights.perClass.normal.maxExtrinsic.unwrap();

  const deployGas = api.registry.createType('Weight', {
    refTime: maxExtrinsic.refTime.toBigInt() * 75n / 100n,
    proofSize: maxExtrinsic.proofSize.toBigInt() * 75n / 100n,
  });
  const callGas = api.registry.createType('Weight', {
    refTime: maxExtrinsic.refTime.toBigInt() * 50n / 100n,
    proofSize: maxExtrinsic.proofSize.toBigInt() * 50n / 100n,
  });

  const deployStorageDeposit = freeBalance / 10n;
  const callStorageDeposit = freeBalance / 100n;

  console.log(`Deploy gas: refTime=${maxExtrinsic.refTime.toBigInt() * 75n / 100n}, proofSize=${maxExtrinsic.proofSize.toBigInt() * 75n / 100n}`);
  console.log(`Storage deposit: ${deployStorageDeposit}\n`);

  // --- Load artifacts ---
  const artifacts = {
    PollStorage: loadContractArtifact('PollStorage'),
    PollCreation: loadContractArtifact('PollCreation'),
    VoteAction: loadContractArtifact('VoteAction'),
    ResultsReader: loadContractArtifact('ResultsReader'),
  };

  let hasBridge = false;
  if (QFLINK_REVENUE) {
    try {
      artifacts.QFLinkPollBridge = loadContractArtifact('QFLinkPollBridge');
      hasBridge = true;
    } catch { console.log('QFLinkPollBridge not compiled, skipping'); }
  }

  const deployOpts = { gasLimit: deployGas, storageDepositLimit: deployStorageDeposit };
  const callOpts = { gasLimit: callGas, storageDepositLimit: callStorageDeposit };

  // --- Deploy ---
  console.log('\n=== DEPLOYING ===');

  const addr = {};

  addr.PollStorage = await deployContract(api, deployer, 'PollStorage',
    artifacts.PollStorage, [], deployOpts);

  addr.PollCreation = await deployContract(api, deployer, 'PollCreation',
    artifacts.PollCreation,
    [addr.PollStorage, QNS_RESOLVER, TREASURY, BURN_ADDRESS, CREATION_FEE, TREASURY_BPS],
    deployOpts);

  addr.VoteAction = await deployContract(api, deployer, 'VoteAction',
    artifacts.VoteAction, [addr.PollStorage], deployOpts);

  addr.ResultsReader = await deployContract(api, deployer, 'ResultsReader',
    artifacts.ResultsReader, [addr.PollStorage], deployOpts);

  if (hasBridge) {
    addr.QFLinkPollBridge = await deployContract(api, deployer, 'QFLinkPollBridge',
      artifacts.QFLinkPollBridge,
      [addr.PollCreation, QFLINK_REVENUE, QFLINK_PODS || '0x0000000000000000000000000000000000000000', QFLINK_FEE],
      deployOpts);
  }

  // --- Wire ---
  console.log('\n=== WIRING ===');

  await callContract(api, deployer, addr.PollStorage, artifacts.PollStorage.abi,
    'setAuthorized', [addr.PollCreation, true], callOpts);

  await callContract(api, deployer, addr.PollStorage, artifacts.PollStorage.abi,
    'setAuthorized', [addr.VoteAction, true], callOpts);

  await callContract(api, deployer, addr.VoteAction, artifacts.VoteAction.abi,
    'setQNSContract', [QNS_RESOLVER], callOpts);

  if (QFLINK_PODS) {
    await callContract(api, deployer, addr.VoteAction, artifacts.VoteAction.abi,
      'setQFLinkContract', [QFLINK_PODS], callOpts);
  }

  if (addr.QFLinkPollBridge) {
    await callContract(api, deployer, addr.PollStorage, artifacts.PollStorage.abi,
      'setAuthorized', [addr.QFLinkPollBridge, true], callOpts);
  }

  // --- Output ---
  console.log('\n=== DEPLOYMENT COMPLETE ===\n');
  for (const [name, a] of Object.entries(addr)) {
    console.log(`  ${name}: ${a}`);
  }

  const envLines = [
    `# QUORUM — generated ${new Date().toISOString()}`,
    `VITE_QF_RPC_URL=${RPC_URL}`,
    `VITE_POLL_STORAGE_ADDRESS=${addr.PollStorage}`,
    `VITE_POLL_CREATION_ADDRESS=${addr.PollCreation}`,
    `VITE_VOTE_ACTION_ADDRESS=${addr.VoteAction}`,
    `VITE_RESULTS_READER_ADDRESS=${addr.ResultsReader}`,
    addr.QFLinkPollBridge ? `VITE_QFLINK_BRIDGE_ADDRESS=${addr.QFLinkPollBridge}` : '',
    `VITE_QNS_RESOLVER_ADDRESS=${QNS_RESOLVER}`,
    `VITE_QNS_REGISTRY_ADDRESS=${QNS_REGISTRY || ''}`,
    `VITE_QNS_REGISTRAR_ADDRESS=${QNS_REGISTRAR || ''}`,
    `VITE_TREASURY_ADDRESS=${TREASURY}`,
    `VITE_BURN_ADDRESS=${BURN_ADDRESS}`,
    `VITE_CREATION_FEE=100`,
    `VITE_TREASURY_BPS=${TREASURY_BPS}`,
  ].filter(Boolean).join('\n');

  writeFileSync('.env.development', envLines);
  writeFileSync('.env.production', envLines);
  console.log('\nWrote .env.development + .env.production');

  await api.disconnect();
  console.log('Done!');
}

main().catch(err => { console.error('\nFAILED:', err.message || err); process.exit(1); });
