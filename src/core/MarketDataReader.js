import BigNumber from "bignumber.js";
//import poolDataHelperABI from "../abi/pool-data-helper.abi.json" assert { type: "json" };
//import smartContract from "../config/smartContract.json" assert { type: "json" };
import { MarketIntegrationBuilder } from "./MarketIntegrationBuilder.js";
import { CHAINS } from "../constant/blockchains.js";

export class MarketDataReader {
  //Number of blocks generated per year on the blockchain.
  #blocksPerYear;
  //The HODLer market's raw data fetched from the smart contract.
  #marketRawData;

  #setBlocksPerYear(blocksPerYear) {
    this.#blocksPerYear = blocksPerYear;
  }

  #setMarketRawData(marketRawData) {
    this.#marketRawData = marketRawData;
  }

  /**
   * This private method calculates a token's APR based on its rate per block.
   * @param {Number} ratePerBlock: The token's Deposit or borrow rate per block.
   * @returns Token's deposit or borrow APR.
   */
  #getAPR(ratePerBlock) {
    let apr = BigNumber(ratePerBlock)
      .div(Math.pow(10, 18))
      .times(this.#blocksPerYear)
      .times(100);
    let value = BigNumber(apr).toFixed(2);
    return value;
  }

  /**
   * This private method extracts the HODLer market's base token details from the fetched HODLer market's raw data.
   * @returns HODLer market's base token address and index.
   */
  #getMarketBaseTokenDetails() {
    const baseTokenAddress = this.#marketRawData.poolInfo.baseToken;
    const baseTokenIndx =
      this.#marketRawData.poolTokenInfo.tokens.indexOf(baseTokenAddress);
    return { tokenAddress: baseTokenAddress, tokenIndx: baseTokenIndx };
  }

  /**
   *
   * @param {string} tokenAddress
   * @returns returns the idx of a token(tokenAddress);
   */
  #getTokenIdx(tokenAddress) {
    const idx = this.#marketRawData.poolTokenInfo.tokens.findIndex(
      (token) => token.toLowerCase() === tokenAddress.toLowerCase()
    );
    if (idx < 0) {
      throw new Error("token not supported");
    }
    return idx;
  }

  /**
   *
   * @param {string} tokenAddress
   * @returns the deposit mining APR of a token in the HODLer market.
   */
  getMarketTokenDepositMiningAPR(tokenAddress) {
    const tokenIdx = this.#getTokenIdx(tokenAddress);
    return BigNumber(
      this.#marketRawData.poolTokenInfo.depositMiningAPR[tokenIdx]
    )
      .dividedBy(10 ** 6)
      .toFixed(2);
  }

  /**
   *
   * @param {string} tokenAddress
   * @returns the borrow mining APR of a token(tokenAddress) in the HODLer market.
   */
  getMarketTokenBorrowMiningAPR(tokenAddress) {
    const tokenIdx = this.#getTokenIdx(tokenAddress);
    return BigNumber(
      this.#marketRawData.poolTokenInfo.borrowMiningAPR[tokenIdx]
    )
      .dividedBy(10 ** 6)
      .toFixed(2);
  }

  /**
   *
   * @param {string} tokenAddress
   * @returns the Staking APR of a token(tokenAddress) in a HODLer market.
   */
  getMarketTokenStakingAPR(tokenAddress) {
    const tokenIdx = this.#getTokenIdx(tokenAddress);
    const tokenDepositMiningAPR =
      this.getMarketTokenDepositMiningAPR(tokenAddress);
    const tokenDepositAPR = this.#getAPR(
      this.#marketRawData.poolTokenInfo.depositRatePerBlock[tokenIdx]
    );
    return BigNumber(tokenDepositMiningAPR).plus(tokenDepositAPR).toFixed(2);
  }

  /**
   *
   * @param {string} tokenAddress
   * @returns The borrow APR of a token(tokenAddress) in the HODLer market.
   */
  getMarketTokenBorrowAPR(tokenAddress) {
    const tokenIdx = this.#getTokenIdx(tokenAddress);
    const tokenBorrowMiningAPR =
      this.getMarketTokenBorrowMiningAPR(tokenAddress);
    const tokenBorrowAPR = this.#getAPR(
      this.#marketRawData.poolTokenInfo.borrowRatePerBlock[tokenIdx]
    );
    return BigNumber(tokenBorrowMiningAPR).plus(tokenBorrowAPR).toFixed(2);
  }

  /**
   * This public method computes the HODLer market base token's staking APR.
   * @returns The Staking APR of the HODLer market's base token.
   */
  getMarketBaseTokenStakingAPR() {
    const baseToken = this.#getMarketBaseTokenDetails();
    return this.getMarketTokenStakingAPR(baseToken.tokenAddress);
  }

  /**
   * This public method extracts the HODLer market base token's deposit minning APR from the fetched HODLer market's raw data.
   * @returns Hodler market base token's deposit mining APR.
   */
  getMarketBaseTokenDepositMiningAPR() {
    const baseToken = this.#getMarketBaseTokenDetails();
    return this.getMarketTokenDepositMiningAPR(baseToken.tokenAddress);
  }

  /**
   *
   * @returns the borrow APR of the HODLer market's base token.
   */
  getMarketBaseTokenBorrowAPR() {
    const baseToken = this.#getMarketBaseTokenDetails();
    return this.getMarketTokenBorrowAPR(baseToken.tokenAddress);
  }

  /**
   *
   * @returns The HODLer market base token borrow mining APR.
   */
  getMarketBaseTokenBorrowMiningAPR() {
    const baseToken = this.#getMarketBaseTokenDetails();
    return this.getMarketTokenBorrowMiningAPR(baseToken.tokenAddress);
  }

  /**
   *
   * @param {string} tokenAddress
   * @returns The total of deposits of a token(tokenAddress) for a HODLer market.
   */
  getMarketTokenTotalDeposit(tokenAddress) {
    const tokenIdx = this.#getTokenIdx(tokenAddress);
    const tokenTotalDepositsRaw =
      this.#marketRawData.poolTokenInfo.totalDeposit[tokenIdx];
    const tokenDecimals = this.#marketRawData.poolTokenInfo.decimals[tokenIdx];
    const tokenPirceInNative =
      this.#marketRawData.poolTokenInfo.price[tokenIdx];
    return BigNumber(tokenTotalDepositsRaw)
      .div(Math.pow(10, tokenDecimals))
      .times(BigNumber(tokenPirceInNative))
      .toFixed(0);
  }

  /**
   *
   * @param {string} tokenAddress
   * @returns The total of the outstanding loans of a token(tokenAddress) for a HODLer market.
   */
  getMarketTokenTotalLoan(tokenAddress) {
    const tokenIdx = this.#getTokenIdx(tokenAddress);
    const tokenTotalLoansRaw =
      this.#marketRawData.poolTokenInfo.totalLoans[tokenIdx];
    const tokenDecimals = this.#marketRawData.poolTokenInfo.decimals[tokenIdx];
    const tokenPirceInNative =
      this.#marketRawData.poolTokenInfo.price[tokenIdx];
    return BigNumber(tokenTotalLoansRaw)
      .div(Math.pow(10, tokenDecimals))
      .times(BigNumber(tokenPirceInNative))
      .toFixed(0);
  }
  /**
   * This public method computes the HODLer market base token's Total deposit
   * @returns Hodler market base token's total deposit in native token.
   */
  getMarketBaseTokenTotalDeposit() {
    const baseToken = this.#getMarketBaseTokenDetails();
    return this.getMarketTokenTotalDeposit(baseToken.tokenAddress);
  }

  /**
   *
   * @returns The market base token's total loans.
   */
  getMarketBaseTokenTotalLoan() {
    const baseToken = this.#getMarketBaseTokenDetails();
    return this.getMarketTokenTotalLoan(baseToken.tokenAddress);
  }

  /**
   *
   * @returns The market's header info.
   */
  getMarketHeaderInfo() {
    const marketHeaderInfo = {};
    marketHeaderInfo.creator = this.#marketRawData.poolInfo.poolCreator;
    const baseToken = this.#getMarketBaseTokenDetails();
    marketHeaderInfo.baseToken = baseToken.tokenAddress;
    marketHeaderInfo.stakingAPR = this.getMarketBaseTokenStakingAPR();
    marketHeaderInfo.loanAPR = this.getMarketBaseTokenBorrowAPR();
    marketHeaderInfo.totalDeposit = this.#marketRawData.poolTokenInfo.tokens
      .reduce(
        (total, token) =>
          BigNumber(total).plus(this.getMarketTokenTotalDeposit(token)),
        0
      )
      .toFixed(0);
    marketHeaderInfo.totalLoan = this.#marketRawData.poolTokenInfo.tokens
      .reduce(
        (total, token) =>
          BigNumber(total).plus(this.getMarketTokenTotalLoan(token)),
        0
      )
      .toFixed(0);
    marketHeaderInfo.maturityDate = this.#marketRawData.poolInfo.maturesOn;
    return marketHeaderInfo;
  }

  getMarketTokensDetails(tokenAddress = "ALL") {
    const tokenArr =
      tokenAddress === "ALL"
        ? this.#marketRawData.poolTokenInfo.tokens
        : [tokenAddress];
    return tokenArr.map((tokenAddr, idx) => {
      return {
        tokenAddress: tokenAddr,
        totalDeposit: this.getMarketTokenTotalDeposit(tokenAddr),
        totalLoan: this.getMarketTokenTotalLoan(tokenAddr),
        stakingAPR: this.getMarketTokenStakingAPR(tokenAddr),
        loanAPR: this.getMarketTokenBorrowAPR(tokenAddr),
        tokenInfo: {
          decimal: this.#marketRawData.poolTokenInfo.decimals[idx],
          enabled: this.#marketRawData.poolTokenInfo.enabled[idx],
          borrowLTV: this.#marketRawData.poolTokenInfo.borrowLTV[idx],
          price: this.#marketRawData.poolTokenInfo.price[idx],
          priceOracle: this.#marketRawData.poolTokenInfo.chainLinkOracle[idx],
        },
      };
    });
  }

  /**
   *
   * @returns the list of tokens in the HODLer market.
   */
  getMarketTokensList() {
    return this.#marketRawData.poolTokenInfo.tokens;
  }

  /**
   * This static method build an instance of the builder: MarketDataReaderBuilder.
   * @returns Instance of the builder: MarketDataReaderBuilder.
   */
  static getBuilder() {
    return new this.MarketDataReaderBuilder();
  }

  /**
   * The class MarketDataReaderBuilder is the builder for the class: MarketDataReader.
   */
  static MarketDataReaderBuilder = class extends MarketIntegrationBuilder {
    //chain Id where the market was created.
    #chainId;
    //Number of blocks generated per year on the blockchain identified by #chainId.
    #blocksPerYear;
    //HODLer Market Identifier.
    #marketId;
    //Web3 instance for interacting with the blockchain.
    #web3Obj;

    withChain(chain) {
      const chainLocal = Object.values(CHAINS).find(
        (chainObj) => chainObj.chainId === chain.chainId
      );
      if (!chainLocal) {
        throw new Error(`Chain ${chain.chainId} is not supported`);
      }
      this.#chainId = chainLocal.chainId;
      this.#blocksPerYear = chainLocal.blocksPerYear;
      return this;
    }

    withMarket(marketId) {
      this.#marketId = marketId;
      return this;
    }

    withWeb3Obj(web3Obj) {
      this.#web3Obj = web3Obj;
      return this;
    }
    async build() {
      if (this.#web3Obj === undefined || this.#web3Obj === null) {
        throw new Error("The web3Obj is missing");
      }
      if (this.#chainId === undefined || this.#chainId === null) {
        throw new Error("The chain is missing");
      }
      if (this.#marketId === undefined || this.#marketId === null) {
        throw new Error("the marketId is missing");
      }
      const marketDataReaderObj = new MarketDataReader();
      marketDataReaderObj.#setBlocksPerYear(this.#blocksPerYear);
      const marketDataHelperSC = this.getPoolDataHelperInstance(
        this.#chainId,
        this.#web3Obj
      );
      const marketRawData = await this.getMarketData(
        marketDataHelperSC,
        this.#marketId
      );
      marketDataReaderObj.#setMarketRawData(marketRawData);
      return marketDataReaderObj;
    }
  };
}
