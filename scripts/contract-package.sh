#!/bin/bash -xe

npm run clean
npm run compile

mkdir -p abi
cp `find  ./artifacts/contracts ./artifacts/lib/@safe-contracts/contracts ./artifacts/lib/@account-abstraction/contracts -type f | grep -v -E 'Test|dbg|bls|IOracle'` abi/
npm run gen:types
