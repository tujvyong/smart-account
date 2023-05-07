# Smart Account
1. Setup project.
```shell
git submodule update --init
cp .env.sample .env
npm ci
npm run gen:types
```

2. Set the bundler and paymaster url in .env

3. Run the script. It will generate signing key, if you don't set SIGNING_KEY in .env
```shell
npx hardhat run scripts/account-abstraction/address.ts --network mumbai
```

4. Run the empty transaction
```shell
npx hardhat run scripts/account-abstraction/transfer.ts --network mumbai
```
