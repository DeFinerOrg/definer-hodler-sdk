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
  async #getMarketBaseTokenDetails() {
    const baseTokenAddress = this.#marketRawData.poolInfo.baseToken;
    const baseTokenIndx =
      this.#marketRawData.poolTokenInfo.tokens.indexOf(baseTokenAddress);
    return { tokenAddress: baseTokenAddress, tokenIndx: baseTokenIndx };
  }

  /**
   * This public method computes the HODLer market base token's staking APR.
   * @returns Hodler market base token's stacking APR.
   */
  async getMarketBaseTokenStakingAPR() {
    const baseToken = await this.#getMarketBaseTokenDetails();
    const baseTokenDepositMiningAPR =
      await this.getMarketBaseTokenDepositMiningAPR();
    const baseTokenDepositAPR = this.#getAPR(
      this.#marketRawData.poolTokenInfo.depositRatePerBlock[baseToken.tokenIndx]
    );
    return BigNumber(baseTokenDepositMiningAPR)
      .plus(baseTokenDepositAPR)
      .toFixed(2);
  }

  /**
   * This public method extracts the HODLer market base token's deposit minning APR from the fetched HODLer market's raw data.
   * @returns Hodler market base token's deposit mining APR.
   */
  async getMarketBaseTokenDepositMiningAPR() {
    const baseToken = await this.#getMarketBaseTokenDetails();
    return BigNumber(
      this.#marketRawData.poolTokenInfo.depositMiningAPR[baseToken.tokenIndx]
    )
      .div(Math.pow(10, 6))
      .toFixed(2);
  }

  /**
   * This public method computes the HODLer market base token's Total deposit
   * @returns Hodler market base token's total deposit in native token.
   */
  async getMarketBaseTokenTotalDeposit() {
    const baseToken = await this.#getMarketBaseTokenDetails();
    const baseTokenTotalDepositsRaw =
      this.#marketRawData.poolTokenInfo.totalDeposit[baseToken.tokenIndx];
    const baseTokenDecimals =
      this.#marketRawData.poolTokenInfo.decimals[baseToken.tokenIndx];
    const baseTokenPirceInNative =
      this.#marketRawData.poolTokenInfo.price[baseToken.tokenIndx];
    return BigNumber(baseTokenTotalDepositsRaw)
      .div(Math.pow(10, baseTokenDecimals))
      .times(BigNumber(baseTokenPirceInNative))
      .toFixed(0);
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
