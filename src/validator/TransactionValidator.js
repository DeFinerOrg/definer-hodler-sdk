import BigNumber from "bignumber.js";
import { ERRORS } from "../constant/errors.js";
import { SMART_CONTRACTS } from "../constant/smartContracts.js";

export class TransactionValidator {
  #marketSCsHandler;
  #marketBaseTokenInfo;
  #web3Obj;

  constructor(marketSCsHandler, baseTokenInfo, web3Obj) {
    this.#marketSCsHandler = marketSCsHandler;
    this.#marketBaseTokenInfo = baseTokenInfo;
    this.#web3Obj = web3Obj;
  }

  validateDeposit(amount, tokenAddress) {
    return this.#validateToken(tokenAddress)
      .then(() => {
        if (amount === 0) return Promise.reject({ code: "ERR_TRS01" });
      })
      .catch((err) =>
        Promise.reject({ code: err.code, msg: ERRORS[err.code] })
      );
  }

  validateWithdraw(amount, tokenAddress) {
    return this.#validateTokenSupport(tokenAddress)
      .then(() =>
        this.#marketSCsHandler.call(SMART_CONTRACTS.SAVING_ACCOUNT, "paused")
      )
      .then((result) =>
        result
          ? Promise.reject({ code: "ERR_SC01" })
          : this.#validateMaturity(tokenAddress)
      )
      .then(() =>
        amount === 0
          ? Promise.reject({ code: "ERR_TRS01" })
          : Promise.resolve(true)
      )
      .then(() => this.#validateDepositBalance(amount, tokenAddress))
      .then(() => this.#validateCollateral(amount, tokenAddress, "withdraw"))
      .catch((err) =>
        Promise.reject({ code: err.code, msg: ERRORS[err.code] })
      );
  }

  validateWithdrawAll(tokenAddress) {
    return this.#marketSCsHandler
      .call(
        SMART_CONTRACTS.ACCOUNTS,
        "getDepositBalanceCurrent",
        {},
        tokenAddress,
        this.#marketSCsHandler.getCurrentAccount()
      )
      .then((amount) =>
        amount === 0
          ? Promise.reject({ code: "ERR_ACC04" })
          : this.validateWithdraw(amount, tokenAddress)
      )
      .catch((err) =>
        Promise.reject({ code: err.code, msg: ERRORS[err.code] })
      );
  }

  validateBorrow(amount, tokenAddress) {
    return this.#validateTokenSupport(tokenAddress)
      .then(() =>
        this.#marketSCsHandler.call(SMART_CONTRACTS.SAVING_ACCOUNT, "paused")
      )
      .then((result) =>
        result ? Promise.reject({ code: "ERR_SC01" }) : Promise.resolve(false)
      )
      .then(() =>
        amount === 0
          ? Promise.reject({ code: "ERR_TRS01" })
          : Promise.resolve(true)
      )
      .then(() =>
        this.#marketSCsHandler.call(
          SMART_CONTRACTS.ACCOUNTS,
          "isUserHasAnyDeposits",
          {},
          this.#marketSCsHandler.getCurrentAccount()
        )
      )
      .then((result) =>
        !result
          ? Promise.reject({ code: "ERR_ACC04" })
          : this.#validateCollateral(amount, tokenAddress, "borrow")
      )
      .catch((err) => {
        return Promise.reject({ code: err.code, msg: ERRORS[err.code] });
      });
  }

  validateRepay(amount, tokenAddress) {
    return this.#validateTokenSupport(tokenAddress)
      .then(() =>
        amount === 0
          ? Promise.reject({ code: "ERR_TRS01" })
          : Promise.resolve(true)
      )
      .then(() =>
        this.#marketSCsHandler.call(
          SMART_CONTRACTS.ACCOUNTS,
          "getBorrowPrincipal",
          {},
          this.#marketSCsHandler.getCurrentAccount(),
          tokenAddress
        )
      )
      .then(
        (borrowBalance) =>
          borrowBalance === 0 && Promise.reject({ code: "ERR_ACC05" })
      )
      .catch((err) =>
        Promise.reject({ code: err.code, msg: ERRORS[err.code] })
      );
  }

  #validateToken(tokenAddress) {
    return this.#validateTokenSupport(tokenAddress)
      .then(() =>
        this.#marketSCsHandler.call(
          SMART_CONTRACTS.TOKEN_REGISTRY,
          "isTokenEnabled",
          {},
          tokenAddress
        )
      )
      .then((result) => !result && Promise.reject({ code: "ERR_TK02" }));
  }

  #validateTokenSupport(tokenAddress) {
    return this.#marketSCsHandler
      .call(SMART_CONTRACTS.TOKEN_REGISTRY, "isTokenExist", {}, tokenAddress)
      .then((result) => !result && Promise.reject({ code: "ERR_TK01" }));
  }

  #validateMaturity(tokenAddress) {
    if (
      tokenAddress.toLowerCase() !==
      this.#marketBaseTokenInfo.tokenAddress.toLowerCase()
    ) {
      return Promise.resolve(true);
    } else {
      return this.#web3Obj.eth
        .getBlockNumber()
        .then((lastBlockNumber) => this.#web3Obj.eth.getBlock(lastBlockNumber))
        .then((block) =>
          block.timestamp > this.#marketBaseTokenInfo.maturesOn
            ? Promise.resolve(true)
            : Promise.reject({ code: "ERR_TK03" })
        );
    }
  }

  #validateDepositBalance(amount, tokenAddress) {
    return this.#marketSCsHandler
      .call(
        SMART_CONTRACTS.ACCOUNTS,
        "getDepositPrincipal",
        {},
        this.#marketSCsHandler.getCurrentAccount(),
        tokenAddress
      )
      .then((result) =>
        BigNumber(result).isLessThan(amount)
          ? Promise.reject({ code: "ERR_ACC01" })
          : Promise.resolve(true)
      );
  }

  #validateCollateral(amount, tokenAddress, action) {
    const promisesArr = [];
    promisesArr.push(
      this.#marketSCsHandler.call(
        SMART_CONTRACTS.TOKEN_REGISTRY,
        "getTokenInfoFromAddress",
        {},
        tokenAddress
      )
    );
    promisesArr.push(
      this.#marketSCsHandler.call(
        SMART_CONTRACTS.ACCOUNTS,
        "getBorrowETH",
        {},
        this.#marketSCsHandler.getCurrentAccount()
      )
    );
    promisesArr.push(
      this.#marketSCsHandler.call(
        SMART_CONTRACTS.ACCOUNTS,
        "getBorrowPower",
        {},
        this.#marketSCsHandler.getCurrentAccount()
      )
    );
    return Promise.all(promisesArr).then((results) => {
      let tokenDivisor, tokenPrice, borrowLTV;
      ({ 1: tokenDivisor, 2: tokenPrice, 3: borrowLTV } = results[0]);
      const borrowETH = BigNumber(results[1]);
      const borrowPower = BigNumber(results[2]);
      if (action === "withdraw") {
        const withdrawETH = BigNumber(amount)
          .multipliedBy(tokenPrice)
          .multipliedBy(borrowLTV)
          .dividedBy(tokenDivisor)
          .dividedBy(100);
        return borrowETH.isGreaterThan(borrowPower.minus(withdrawETH))
          ? Promise.reject({ code: "ERR_ACC03" })
          : Promise.resolve();
      } else {
        const newBorrowETH = BigNumber(borrowETH).plus(
          BigNumber(amount).multipliedBy(tokenPrice).dividedBy(tokenDivisor)
        );
        return newBorrowETH.isGreaterThan(borrowPower)
          ? Promise.reject({ code: "ERR_ACC02" })
          : Promise.resolve();
      }
    });
  }
}
