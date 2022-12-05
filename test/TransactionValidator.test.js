import { MarketSmartContractsHandler } from "../src/handler/MarketSmartContractsHandler";
import { TransactionValidator } from "../src/validator/TransactionValidator";
import { ERRORS } from "../src/constant/errors";
import Web3 from "web3";

jest.mock("../src/handler/MarketSmartContractsHandler");
jest.mock("web3");
describe("TransactionValidator", () => {
  const TOKEN_ADDRESS = "0x770f030fdbf63ebf1c939de8bcff8943c2c2d454";
  describe("desposit", () => {
    beforeEach(() => MarketSmartContractsHandler.mockClear());
    test("token is not supported", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) =>
            Promise.reject({ code: "ERR_TK01" }),
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      return expect(
        transactionValidator.validateDeposit(1, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_TK01", msg: ERRORS["ERR_TK01"] });
    });
    test("token is supported but not enabled", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => {
            if (scMethodName === "isTokenExist") {
              return Promise.resolve(true);
            } else {
              return Promise.resolve(false);
            }
          },
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      return expect(
        transactionValidator.validateDeposit(1, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_TK02", msg: ERRORS["ERR_TK02"] });
    });
    test("deposit amount cannot be 0", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => Promise.resolve(true),
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      return expect(
        transactionValidator.validateDeposit(0, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_TRS01", msg: ERRORS["ERR_TRS01"] });
    });
  });
  describe("withdraw", () => {
    beforeEach(() => MarketSmartContractsHandler.mockClear());
    test("token is not supported", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => Promise.resolve(false),
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      expect(
        transactionValidator.validateWithdraw(0, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_TK01", msg: ERRORS["ERR_TK01"] });
    });
    test("token is supported but the smart contract is paused", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) =>
            scMethodName === "paused"
              ? Promise.resolve(true)
              : Promise.resolve(true),
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      expect(
        transactionValidator.validateWithdraw(1, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_SC01", msg: ERRORS["ERR_SC01"] });
    });
    test("token is supported, the smart contract is not paused, but the withdraw amount is zero", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) =>
            scMethodName === "paused"
              ? Promise.resolve(false)
              : Promise.resolve(true),
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler, {
        tokenAddress: "DUMMY",
      });
      expect(
        transactionValidator.validateWithdraw(0, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_TRS01", msg: ERRORS["ERR_TRS01"] });
    });
    test("token is supported, the smart contract is not paused, but the maturity is not reached", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) =>
            scMethodName === "paused"
              ? Promise.resolve(false)
              : Promise.resolve(true),
        };
      });
      Web3.mockImplementation(() => {
        return {
          eth: {
            getBlockNumber: () => Promise.resolve(1111),
            getBlock: (blockNumber) =>
              Promise.resolve({ timestamp: 123456780 }),
          },
        };
      });
      const web3Obj = new Web3();
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(
        handler,
        {
          tokenAddress: "BASE_TOKEN_ADDRESS",
          maturesOn: 123456789,
        },
        web3Obj
      );
      expect(
        transactionValidator.validateWithdraw(0, "BASE_TOKEN_ADDRESS")
      ).rejects.toEqual({ code: "ERR_TK03", msg: ERRORS["ERR_TK03"] });
    });
    test("deposit balance is less than the amount to be withdrawn", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => {
            switch (scMethodName) {
              case "paused":
                return Promise.resolve(false);
              case "getDepositPrincipal":
                return Promise.resolve(3);
              default:
                return Promise.resolve(true);
            }
          },
          getCurrentAccount: () => "ACCOUNT_ADDRESS01",
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler, {
        tokenAddress: "DUMMY",
      });
      expect(
        transactionValidator.validateWithdraw(5, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_ACC01", msg: ERRORS["ERR_ACC01"] });
    });
    test("Existing loans and no enough collateral left.", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => {
            switch (scMethodName) {
              case "paused":
                return Promise.resolve(false);
              case "getDepositPrincipal":
                return Promise.resolve(6);
              case "getTokenInfoFromAddress":
                return Promise.resolve({ 1: "2", 2: "1", 3: 30 });
              case "getBorrowPower":
                return Promise.resolve(1);
              case "getBorrowETH":
                return Promise.resolve(5);
              default:
                return Promise.resolve(true);
            }
          },
          getCurrentAccount: () => "ACCOUNT_ADDRESS01",
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler, {
        tokenAddress: "DUMMY",
      });
      expect(
        transactionValidator.validateWithdraw(5, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_ACC03", msg: ERRORS["ERR_ACC03"] });
    });
    test("Existing loans and no enough collateral left.", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => {
            switch (scMethodName) {
              case "paused":
                return Promise.resolve(false);
              case "getDepositPrincipal":
                return Promise.resolve(6);
              case "getTokenInfoFromAddress":
                return Promise.resolve({ 1: "2", 2: "1", 3: 30 });
              case "getBorrowPower":
                return Promise.resolve(1);
              case "getBorrowETH":
                return Promise.resolve(5);
              default:
                return Promise.resolve(true);
            }
          },
          getCurrentAccount: () => "ACCOUNT_ADDRESS01",
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler, {
        tokenAddress: "DUMMY",
      });
      expect(
        transactionValidator.validateWithdraw(5, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_ACC03", msg: ERRORS["ERR_ACC03"] });
    });
  });
  describe("withdrawAll", () => {
    beforeEach(() => MarketSmartContractsHandler.mockClear());
    //validateWithdrawAll uses internal validateWithdraw.
    test("account does not have a deposit", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => Promise.resolve(0),
          getCurrentAccount: () => "ACCOUNT_ADDRESS01",
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      expect(
        transactionValidator.validateWithdrawAll(TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_ACC04", msg: ERRORS["ERR_ACC04"] });
    });
  });
  describe("borrow", () => {
    beforeEach(() => MarketSmartContractsHandler.mockClear());
    test("token not supported", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => Promise.resolve(false),
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      expect(
        transactionValidator.validateBorrow(1, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_TK01", msg: ERRORS["ERR_TK01"] });
    });
    test("smart contract is paused", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => {
            return Promise.resolve(true);
          },
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      expect(
        transactionValidator.validateBorrow(1, TOKEN_ADDRESS)
      ).rejects.toEqual({
        code: "ERR_SC01",
        msg: ERRORS["ERR_SC01"],
      });
    });
    test("borrow amount is zero.", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => {
            switch (scMethodName) {
              case "paused":
                return Promise.resolve(false);
              default:
                return Promise.resolve(true);
            }
          },
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      expect(
        transactionValidator.validateBorrow(0, TOKEN_ADDRESS)
      ).rejects.toEqual({
        code: "ERR_TRS01",
        msg: ERRORS["ERR_TRS01"],
      });
    });
    test("Account does not have any deposit", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => {
            switch (scMethodName) {
              case "paused":
                return Promise.resolve(false);
              case "isUserHasAnyDeposits":
                return Promise.resolve(false);
              default:
                return Promise.resolve(true);
            }
          },
          getCurrentAccount: () => "ACCOUNT_ADDRESS01",
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      expect(
        transactionValidator.validateBorrow(4, TOKEN_ADDRESS)
      ).rejects.toEqual({
        code: "ERR_ACC04",
        msg: ERRORS["ERR_ACC04"],
      });
    });
  });
  describe("repay", () => {
    beforeEach(() => MarketSmartContractsHandler.mockClear());
    test("token not supported", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => Promise.resolve(false),
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      expect(
        transactionValidator.validateRepay(1, TOKEN_ADDRESS)
      ).rejects.toEqual({ code: "ERR_TK01", msg: ERRORS["ERR_TK01"] });
    });
    test("repay amount is zero.", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => Promise.resolve(true),
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      expect(
        transactionValidator.validateRepay(0, TOKEN_ADDRESS)
      ).rejects.toEqual({
        code: "ERR_TRS01",
        msg: ERRORS["ERR_TRS01"],
      });
    });
    test("account borrow principal is zero.", () => {
      MarketSmartContractsHandler.mockImplementation(() => {
        return {
          call: (scName, scMethodName, sendData) => {
            switch (scMethodName) {
              case "getBorrowPrincipal":
                return Promise.resolve(0);
              default:
                return Promise.resolve(true);
            }
          },
          getCurrentAccount: () => "ACCOUNT_ADDRESS01",
        };
      });
      const handler = new MarketSmartContractsHandler();
      const transactionValidator = new TransactionValidator(handler);
      expect(
        transactionValidator.validateRepay(3, TOKEN_ADDRESS)
      ).rejects.toEqual({
        code: "ERR_ACC05",
        msg: ERRORS["ERR_ACC05"],
      });
    });
  });
});
