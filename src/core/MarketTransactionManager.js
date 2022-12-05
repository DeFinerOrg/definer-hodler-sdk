import { CHAINS } from "../constant/blockchains.js";
import { SMART_CONTRACTS } from "../constant/smartContracts.js";
import { MarketSmartContractsHandler } from "../handler/MarketSmartContractsHandler.js";
import { TransactionValidator } from "../validator/TransactionValidator.js";
import { isEth } from "../utils.js";
import { toChecksumAddress } from "ethereum-checksum-address";
import { MarketIntegrationBuilder } from "./MarketIntegrationBuilder.js";

export class MarketTransactionManager {
  //The HODLer market's raw data fetched from the smart contract.
  #marketRawData;
  //Handler for integrating with the HODLer market's smart contracts.
  #marketSCsHandler;
  //Object for validating transactions' input.
  #transactionValidator;

  #setMarketRawData(marketRawData) {
    this.#marketRawData = marketRawData;
  }

  #setMarketSCsHandler(marketSCsHandler) {
    this.#marketSCsHandler = marketSCsHandler;
  }

  #setTransactionValidator(transValidator) {
    this.#transactionValidator = transValidator;
  }

  /**
   * This method handles deposit on a HODLer market.
   * @param {Number} amount: The amount of tokens to be deposited.
   *             The amount is expected to be provided in the smallest denomination of the token to be deposited.
   *             Example: 1Eth is expected as 1000000000000000000
   * @param {String} tokenAddress: The address of the token to be deposited.
   * @returns: promise events.
   */
  async deposit(amount, tokenAddress) {
    return this.#transactionValidator
      .validateDeposit(amount, tokenAddress)
      .then(() => {
        const ethValue = isEth(tokenAddress) ? amount : 0;
        return this.#marketSCsHandler.send(
          SMART_CONTRACTS.SAVING_ACCOUNT,
          "deposit",
          { value: ethValue },
          tokenAddress,
          amount
        );
      });
  }

  /**
   * This method handles withdraw on a HODLer market.
   * @param {Number} amount: The amount of tokens to be withdrawn.
   *             The amount are expected to be provided in the smallest denomination of the token to be withdrawn.
   *             Example: 1Eth is expected as 1000000000000000000
   * @param {String} tokenAddress: The address of the token to be withdrawn.
   * @returns: promise events.
   */
  async withdraw(amount, tokenAddress) {
    return this.#transactionValidator
      .validateWithdraw(amount, tokenAddress)
      .then(() =>
        this.#marketSCsHandler.send(
          SMART_CONTRACTS.SAVING_ACCOUNT,
          "withdraw",
          { value: 0 },
          tokenAddress,
          amount
        )
      );
  }

  /**
   * This method handles withdrawAll on a HODLer market.
   * @param {String} tokenAddress: The address of the token to be withdraw all.
   * @returns: promise events.
   */
  async withdrawAll(tokenAddress) {
    return this.#transactionValidator
      .validateWithdrawAll(tokenAddress)
      .then(() =>
        this.#marketSCsHandler.send(
          SMART_CONTRACTS.SAVING_ACCOUNT,
          "withdrawAll",
          { value: 0 },
          tokenAddress
        )
      );
  }

  /**
   * This method handles borrow on a HODLer market.
   * @param {Number} amount: The amount of tokens to be borrowed.
   *             The amount are expected to be provided in the smallest denomination of the token to be borrowed.
   *             Example: 1Eth is expected as 1000000000000000000
   * @param {String} tokenAddress: The address of the token to be borrowed.
   * @returns: promise events.
   */
  async borrow(amount, tokenAddress) {
    return this.#transactionValidator
      .validateBorrow(amount, tokenAddress)
      .then(() =>
        this.#marketSCsHandler.send(
          SMART_CONTRACTS.SAVING_ACCOUNT,
          "borrow",
          { value: 0 },
          tokenAddress,
          amount
        )
      );
  }

  /**
   * This method handles repay of a loan on a HODLer market.
   * @param {Number} amount: The amount of tokens to be repayed.
   *             The amount are expected to be provided in the smallest denomination of the token to be repayed.
   *             Example: 1Eth is expected as 1000000000000000000
   * @param {String} tokenAddress: The address of the token to be repayed.
   * @returns: promise events.
   */
  repay(amount, tokenAddress) {
    return this.#transactionValidator
      .validateRepay(amount, tokenAddress)
      .then(() => {
        const ethValue = isEth(tokenAddress) ? amount : 0;
        return this.#marketSCsHandler.send(
          SMART_CONTRACTS.SAVING_ACCOUNT,
          "repay",
          { value: ethValue },
          tokenAddress,
          amount
        );
      });
  }

  /**
   * This method handles enabling or disabling a deposited token as collateral on a HODLer market.
   * @param {Number} tokenAddress: The desposited token's address to be set as collateral.
   * @param {Boolean} enabled: This flag to enable to disable the deposited tokens as collateral.
   * @returns: promise events.
   */
  setCollateral(tokenAddress, enable) {
    const tokenAddressLocal = toChecksumAddress(tokenAddress);
    const tokenIdx =
      this.#marketRawData.poolTokenInfo.tokens.indexOf(tokenAddressLocal);
    return this.#marketSCsHandler.send(
      SMART_CONTRACTS.ACCOUNTS,
      "setCollateral",
      {},
      tokenIdx,
      enable
    );
  }

  static getBuilder() {
    return new this.MarketTransactionManagerBuilder();
  }

  static MarketTransactionManagerBuilder = class extends MarketIntegrationBuilder {
    #chainId;
    //RPC URL corresponding to the blockchain identifiedy by #chainId
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
      return this;
    }

    withMarket(marketId) {
      this.#marketId = marketId;
      return this;
    }

    withWeb3Obj(web3Obj) {
      const accounts =
        web3Obj.currentProvider.selectedAccount |
        web3Obj.eth.accounts.wallet[0];
      if (accounts === undefined) {
        throw new Error("The provided Web3Obj does not have any account.");
      }
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
      const marketTransManagerObj = new MarketTransactionManager();
      const marketDataHelperSC = this.getPoolDataHelperInstance(
        this.#chainId,
        this.#web3Obj
      );
      const marketRawData = await this.getMarketData(
        marketDataHelperSC,
        this.#marketId
      );
      marketTransManagerObj.#setMarketRawData(marketRawData);
      const marketSmartContractsHandler = new MarketSmartContractsHandler(
        marketRawData.poolInfo,
        this.#web3Obj
      );
      marketTransManagerObj.#setMarketSCsHandler(marketSmartContractsHandler);
      const baseTokenInfo = {
        tokenAddress: marketRawData.poolInfo.baseToken,
        maturesOn: marketRawData.poolInfo.maturesOn,
      };
      const tansValidatorObj = new TransactionValidator(
        marketSmartContractsHandler,
        baseTokenInfo,
        this.#web3Obj
      );
      marketTransManagerObj.#setTransactionValidator(tansValidatorObj);
      return marketTransManagerObj;
    }
  };
}
