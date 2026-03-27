#!/bin/bash
# =============================================================================
# QUORUM — Solidity → PolkaVM Compilation
# =============================================================================
# Compiles all QUORUM contracts using resolc (Revive compiler).
#
# USAGE:
#   ./scripts/compile-revive.sh              # Compile all contracts
#   ./scripts/compile-revive.sh PollStorage  # Compile single contract
#
# PREREQUISITES:
#   - resolc (Revive compiler) in PATH
#     https://github.com/niccoloZQ/revive or https://github.com/niccoloZQ/revive
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

# All QUORUM contracts (order matters for combined compilation)
ALL_CONTRACTS=(
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
  echo "Install the Revive compiler:"
  echo "  git clone https://github.com/niccoloZQ/revive"
  echo "  cd revive && cargo build --release"
  echo "  # Add target/release to PATH"
  exit 1
fi

echo -e "${GREEN}✓ Found resolc: $(resolc --version 2>/dev/null || echo 'unknown version')${NC}"

# Create output directories
mkdir -p "$OUTPUT_DIR"
mkdir -p "$ABI_DIR"

# Determine what to compile
if [ $# -ge 1 ]; then
  # Single contract mode
  TARGET="$1"
  SOL_FILE="$CONTRACTS_DIR/${TARGET}.sol"
  if [ ! -f "$SOL_FILE" ]; then
    echo -e "${RED}✗ Contract not found: $SOL_FILE${NC}"
    exit 1
  fi
  echo -e "${BLUE}ℹ Compiling single contract: ${TARGET}${NC}"
  echo ""

  resolc "$SOL_FILE" \
    --bin \
    -O3 \
    --output-dir "$OUTPUT_DIR"

  # Copy ABI to frontend
  if [ -f "$OUTPUT_DIR/${TARGET}.sol:${TARGET}.abi" ]; then
    cp "$OUTPUT_DIR/${TARGET}.sol:${TARGET}.abi" "$ABI_DIR/${TARGET}.json"
    echo -e "${GREEN}✓ ABI → src/abi/${TARGET}.json${NC}"
  elif [ -f "$OUTPUT_DIR/${TARGET}.sol:${TARGET}.pvm" ]; then
    # Extract ABI from combined.json if individual ABI not available
    echo -e "${YELLOW}⚠ Individual ABI not found, will extract from combined.json${NC}"
  fi

  echo -e "${GREEN}✓ ${TARGET} compiled successfully${NC}"
else
  # All contracts — use combined JSON (same as the old deploy.mjs approach)
  echo -e "${BLUE}ℹ Compiling all contracts (combined mode)${NC}"
  echo ""

  # Build the file list
  SOL_FILES=""
  for name in "${ALL_CONTRACTS[@]}"; do
    SOL_FILES="$SOL_FILES $CONTRACTS_DIR/${name}.sol"
  done

  # Combined JSON compilation — produces combined.json with abi+bin for all
  resolc $SOL_FILES \
    --combined-json abi,bin \
    -o "$CONTRACTS_DIR/" \
    --overwrite

  if [ ! -f "$CONTRACTS_DIR/combined.json" ]; then
    echo -e "${RED}✗ combined.json not created — compilation failed${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ combined.json created${NC}"

  # Also compile individually for .pvm bytecode files and extract ABIs
  for name in "${ALL_CONTRACTS[@]}"; do
    SOL_FILE="$CONTRACTS_DIR/${name}.sol"
    echo -e "  Compiling ${name}..."

    resolc "$SOL_FILE" \
      --bin \
      -O3 \
      --output-dir "$OUTPUT_DIR" 2>/dev/null || true

    # Copy .pvm file to .polkavm for consistency with deploy script
    if [ -f "$OUTPUT_DIR/${name}.sol:${name}.pvm" ]; then
      cp "$OUTPUT_DIR/${name}.sol:${name}.pvm" "$OUTPUT_DIR/${name}.polkavm"
      echo -e "  ${GREEN}✓ ${name}.pvm → ${name}.polkavm${NC}"
    fi

    # Extract ABI from combined.json
    node -e "
      const fs = require('fs');
      const combined = JSON.parse(fs.readFileSync('$CONTRACTS_DIR/combined.json', 'utf-8'));
      
      Object.entries(combined.contracts).forEach(([path, contractData]) => {
        const contractName = path.split(':').pop(); // Extract contract name from path
        if (contractName === '$name' && contractData && contractData.abi) {
          fs.writeFileSync('$ABI_DIR/${name}.json', JSON.stringify(contractData.abi, null, 2));
          console.log('  ✓ ABI extracted for $name');
        }
      });
    " 2>/dev/null || echo -e "  ${YELLOW}⚠ Could not extract ABI for ${name}${NC}"
  done

  echo ""
  echo -e "${GREEN}=============================================================================${NC}"
  echo -e "${GREEN}  ✓ All contracts compiled successfully${NC}"
  echo -e "${GREEN}=============================================================================${NC}"
  echo ""

  # Summary
  echo "  Output files:"
  for name in "${ALL_CONTRACTS[@]}"; do
    if [ -f "$OUTPUT_DIR/${name}.polkavm" ]; then
      SIZE=$(stat -f%z "$OUTPUT_DIR/${name}.polkavm" 2>/dev/null || stat -c%s "$OUTPUT_DIR/${name}.polkavm" 2>/dev/null || echo "?")
      echo "    ${name}.polkavm  (${SIZE} bytes)"
    fi
  done
  echo ""
  echo "  Frontend ABIs:"
  for name in "${ALL_CONTRACTS[@]}"; do
    if [ -f "$ABI_DIR/${name}.json" ]; then
      echo "    src/abi/${name}.json"
    fi
  done
fi
