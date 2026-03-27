#!/bin/bash
# =============================================================================
# QUORUM — Solidity → PolkaVM Compilation
# =============================================================================
# Compiles all QUORUM contracts using resolc (Revive compiler).
#
# Unlike QNS (single-file contracts), QUORUM contracts have cross-file
# imports (PollCreation imports PollStorage, VoteAction imports interfaces,
# etc). This requires passing all files to resolc together.
#
# USAGE:
#   ./scripts/compile-revive.sh
# =============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/output"
ABI_DIR="$PROJECT_ROOT/src/abi"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"

# The contracts we need bytecode + ABI for (not interfaces)
DEPLOY_CONTRACTS=(
  "PollStorage"
  "PollCreation"
  "VoteAction"
  "ResultsReader"
  "QFLinkPollBridge"
)

echo -e "${BLUE}"
echo "============================================================================="
echo "  QUORUM — Revive Compiler (Solidity → PolkaVM)"
echo "============================================================================="
echo -e "${NC}"

# Check for resolc
if ! command -v resolc &> /dev/null; then
  echo -e "${RED}✗ resolc not found in PATH${NC}"
  echo ""
  echo "Install the Revive compiler from:"
  echo "  https://github.com/niccoloZQ/revive/releases"
  exit 1
fi

echo -e "${GREEN}✓ Found resolc: $(resolc --version 2>/dev/null || echo 'unknown')${NC}"
echo ""

# Create output directories
mkdir -p "$OUTPUT_DIR"
mkdir -p "$ABI_DIR"

# ─── Step 1: Gather ALL .sol files (contracts + interfaces) ────────────
# resolc needs all files that are referenced by imports.
# We pass every .sol file in contracts/ and contracts/interfaces/.
ALL_SOL_FILES=""
for f in "$CONTRACTS_DIR"/*.sol; do
  [ -f "$f" ] && ALL_SOL_FILES="$ALL_SOL_FILES $f"
done
for f in "$CONTRACTS_DIR"/interfaces/*.sol; do
  [ -f "$f" ] && ALL_SOL_FILES="$ALL_SOL_FILES $f"
done

if [ -z "$ALL_SOL_FILES" ]; then
  echo -e "${RED}✗ No .sol files found in $CONTRACTS_DIR${NC}"
  exit 1
fi

echo -e "${BLUE}ℹ Found Solidity files:${NC}"
for f in $ALL_SOL_FILES; do
  echo "    $(basename $f)"
done
echo ""

# ─── Step 2: Combined JSON compilation (ABIs + hex bytecode) ───────────
echo -e "${BLUE}ℹ Running combined-json compilation...${NC}"

# Remove stale combined.json
rm -f "$CONTRACTS_DIR/combined.json"

resolc $ALL_SOL_FILES \
  --combined-json abi,bin \
  -o "$CONTRACTS_DIR/" \
  --overwrite

if [ ! -f "$CONTRACTS_DIR/combined.json" ]; then
  echo -e "${RED}✗ combined.json not created — compilation failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ combined.json created${NC}"
echo ""

# ─── Step 3: Binary compilation (PolkaVM .pvm bytecode) ────────────────
# We must pass ALL .sol files together so imports resolve.
# resolc outputs: output/<filename>.sol:<ContractName>.pvm for each contract.

echo -e "${BLUE}ℹ Running binary compilation for .pvm bytecode...${NC}"

resolc $ALL_SOL_FILES \
  --bin \
  -O3 \
  --output-dir "$OUTPUT_DIR" \
  --overwrite

echo -e "${GREEN}✓ Binary compilation complete${NC}"
echo ""

# ─── Step 4: Rename .pvm files and extract ABIs ───────────────────────
echo -e "${BLUE}ℹ Processing output files...${NC}"

for name in "${DEPLOY_CONTRACTS[@]}"; do
  # resolc names output as: <filename>.sol:<ContractName>.pvm
  PVM_FILE="$OUTPUT_DIR/${name}.sol:${name}.pvm"

  if [ -f "$PVM_FILE" ]; then
    cp "$PVM_FILE" "$OUTPUT_DIR/${name}.polkavm"
    SIZE=$(stat -f%z "$OUTPUT_DIR/${name}.polkavm" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${name}.polkavm" 2>/dev/null || echo "?")
    echo -e "  ${GREEN}✓ ${name}.polkavm  (${SIZE} bytes)${NC}"
  else
    # Some contracts might be in a different path format
    # Try: contracts/<name>.sol:<name>.pvm
    ALT_PVM="$OUTPUT_DIR/contracts/${name}.sol:${name}.pvm"
    FOUND=false
    # Search for any file matching *:${name}.pvm
    for f in "$OUTPUT_DIR"/*:${name}.pvm; do
      if [ -f "$f" ]; then
        cp "$f" "$OUTPUT_DIR/${name}.polkavm"
        SIZE=$(stat -f%z "$OUTPUT_DIR/${name}.polkavm" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${name}.polkavm" 2>/dev/null || echo "?")
        echo -e "  ${GREEN}✓ ${name}.polkavm  (${SIZE} bytes) [from $(basename $f)]${NC}"
        FOUND=true
        break
      fi
    done 2>/dev/null
    if [ "$FOUND" = false ]; then
      echo -e "  ${RED}✗ ${name}.pvm NOT FOUND${NC}"
      echo -e "    Available .pvm files in output/:"
      ls -1 "$OUTPUT_DIR"/*.pvm 2>/dev/null || echo "      (none)"
    fi
  fi

  # Extract ABI from combined.json
  node -e "
    const fs = require('fs');
    const combined = JSON.parse(fs.readFileSync('${CONTRACTS_DIR}/combined.json', 'utf-8'));
    for (const [key, data] of Object.entries(combined.contracts)) {
      const contractName = key.split(':').pop();
      if (contractName === '${name}') {
        const abi = typeof data.abi === 'string' ? JSON.parse(data.abi) : data.abi;
        fs.writeFileSync('${ABI_DIR}/${name}.json', JSON.stringify(abi, null, 2));
        console.log('  ✓ ABI → src/abi/${name}.json');
        process.exit(0);
      }
    }
    console.error('  ✗ ABI not found for ${name} in combined.json');
    // List available contracts for debugging
    console.error('    Available:', Object.keys(combined.contracts).map(k => k.split(':').pop()).join(', '));
    process.exit(1);
  " || echo -e "  ${YELLOW}⚠ Could not extract ABI for ${name}${NC}"
done

# ─── Step 5: Also extract interface ABIs (needed by frontend) ─────────
# The frontend may import IQNS.json for direct QNS resolver calls
for iface in IQNS IERC20 IQFLinkPods; do
  node -e "
    const fs = require('fs');
    const combined = JSON.parse(fs.readFileSync('${CONTRACTS_DIR}/combined.json', 'utf-8'));
    for (const [key, data] of Object.entries(combined.contracts)) {
      const contractName = key.split(':').pop();
      if (contractName === '${iface}') {
        const abi = typeof data.abi === 'string' ? JSON.parse(data.abi) : data.abi;
        fs.writeFileSync('${ABI_DIR}/${iface}.json', JSON.stringify(abi, null, 2));
        console.log('  ✓ ABI → src/abi/${iface}.json');
        process.exit(0);
      }
    }
  " 2>/dev/null || true
done

# ─── Summary ──────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}=============================================================================${NC}"
echo -e "${GREEN}  ✓ Compilation complete${NC}"
echo -e "${GREEN}=============================================================================${NC}"
echo ""

echo "  Bytecode files:"
for name in "${DEPLOY_CONTRACTS[@]}"; do
  if [ -f "$OUTPUT_DIR/${name}.polkavm" ]; then
    SIZE=$(stat -f%z "$OUTPUT_DIR/${name}.polkavm" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${name}.polkavm" 2>/dev/null || echo "?")
    echo "    ✓ output/${name}.polkavm  (${SIZE} bytes)"
  else
    echo "    ✗ output/${name}.polkavm  MISSING"
  fi
done

echo ""
echo "  Frontend ABIs:"
for name in "${DEPLOY_CONTRACTS[@]}"; do
  if [ -f "$ABI_DIR/${name}.json" ]; then
    echo "    ✓ src/abi/${name}.json"
  else
    echo "    ✗ src/abi/${name}.json  MISSING"
  fi
done
echo ""
