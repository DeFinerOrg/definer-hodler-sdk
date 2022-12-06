# definer-hodler.js - Definer Hodler Marktet javaScript API

Javascript SDK for definer-hodler-js

## Overview

This hodler market provides a utility to read the HODLer market's data.

## Installation

### Node

```bash
npm i definer-hodler-js
```

### Pure javascript

Use the prebuilt dist/definer-hodler.min.js, or build using the definer-hodler-js repository:

```bash
npm run build
```

Then include dist/definer-hodler.min.js in your html file. This will expose MarketDataReader, MarketTransManager and CHAINS object.

```html
<script src="https://domain-name.com/definer-hodler.min.js"></script>
```

## Usage

This SDK exports the class: MarketDataReaderFactory, the class: MarketTransManagerFactory, and the object: CHAINS.

```js
//In Node.js
import {
  MarketDataReaderFactory,
  MarketTransManagerFactory,
  CHAINS,
} from "definer-hodler.js";

(async function task() {
  //Reader
  const bnbMainnet = "https://bsc-dataseed.binance.org";
  const web3Obj = new Web3(new Web3.providers.HttpProvider(bnbMainnet));
  const readerObj = await MarketDataReaderFactory.getNewInstance(
    CHAINS.BNB,
    2,
    web3Obj
  );
  const stakingAPR = readerObj.getMarketBaseTokenStakingAPR();
  const depositMiningAPR = readerObj.getMarketBaseTokenDepositMiningAPR();
  const totalDeposit = readerObj.getMarketBaseTokenTotalDeposit();
  //TransManager
  const account_pkey = "ACCOUNT_KEY";
  const account = web3Obj.eth.accounts.privateKeyToAccount(account_pkey);
  web3Obj.eth.accounts.wallet.add(account);
  const transManagerObj = await MarketTransManagerFactory.getNewInstance(
    CHAINS.BNB,
    2,
    web3Obj
  );
  const result = await transManagerObj.deposit(
    2,
    "0x55d398326f99059fF775485246999027B3197955"
  );
})();
```

```html
<!-- In Browser -->
<html>
  ...

  <script src="https://domain-name.com/definer-hodler.min.js"></script>
  <script>
    (async function () {
      const bnbMainnet = "https://bsc-dataseed.binance.org";
      const web3Obj = new Web3(new Web3.providers.HttpProvider(bnbMainnet));
      //Reader
      const readerObj =
        await definerHodler.MarketDataReaderFactory.getNewInstance(
          definerHodler.CHAINS.BNB,
          2,
          web3Obj
        );
      const stakingAPR = readerObj.getMarketBaseTokenStakingAPR();
      const depositMiningAPR =
        await readerObj.getMarketBaseTokenDepositMiningAPR();
      const totalDeposit = readerObj.getMarketBaseTokenTotalDeposit();
      //TransManager
      const account_pkey = "ACCOUNT_KEY";
      const account = web3Obj.eth.accounts.privateKeyToAccount(account_pkey);
      const transManagerObj =
        await definerHodler.MarketTansManagerFactory.getNewInstance(
          CHAINS.BNB,
          2,
          web3Obj
        );
      web3Obj.eth.accounts.wallet.add(account);

      const depositResult = await transManagerObj.deposit(
        3,
        "0x770f030fdbf63ebf1c939de8bcff8943c2c2d454"
      );
    })();
  </script>
  ...
</html>
```

CHAINS has all the chains supported on the Definer platform.

Note: For better performance the HODLer market data is fetched only once from the smart contract and stored in the object created. If the hodler market data needs to be refetched from the smart contract a new object would need to be created.

## Documentation

Documentation can be found at [ReadTheDocs][docs].

## Building

### Requirements

- [Node.js](https://nodejs.org)
- [npm](https://www.npmjs.com/)

```bash
sudo apt-get update
sudo apt-get install nodejs
sudo apt-get install npm
```

### Building (webpack)

Build the definer-hodler-js parckage:

```bash
npm install
npm run build
```
