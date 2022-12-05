import { SMART_CONTRACTS } from "../constant/smartContracts.js";
import marketSCABIs from "../abi/market-smart-contracts-abis.json" assert { type: "json" };
import BigNumber from "bignumber.js";

//This class handles the transactions with a HODLer market's smart contracts.
export class MarketSmartContractsHandler {
  //Map for instances of all the smart contract of a HODLer market.
  #marketSCMap;
  //Web3 instance used to create the smart contract instances.
  #web3Obj;

  /**
   * This constructor also builds the map (stored in #marketSCMap) that holds instances
   *    of all the smart contracts supported by the handler object.
   * @param {Object} poolInfo: HODLer market poolInfo object that holds all the HODLer market smart contracts addresses.
   * @param {Object} web3Obj: Instance of the Web3 to integrate with the blockchain.
   */
  constructor(poolInfo, web3Obj) {
    this.#web3Obj = web3Obj;
    this.#marketSCMap = new Map();
    this.#marketSCMap.set(
      SMART_CONTRACTS.GLOBAL_CONFIG,
      new web3Obj.eth.Contract(
        marketSCABIs.global_config_abi,
        poolInfo.globalConfig
      )
    );
    this.#marketSCMap.set(
      SMART_CONTRACTS.SAVING_ACCOUNT,
      new web3Obj.eth.Contract(
        marketSCABIs.saving_account_abi,
        poolInfo.savingAccount
      )
    );
    this.#marketSCMap.set(
      SMART_CONTRACTS.BANK,
      new web3Obj.eth.Contract(marketSCABIs.saving_bank_abi, poolInfo.bank)
    );
    this.#marketSCMap.set(
      SMART_CONTRACTS.TOKEN_REGISTRY,
      new web3Obj.eth.Contract(
        marketSCABIs.token_registry_abi,
        poolInfo.tokenRegistry
      )
    );
    this.#marketSCMap.set(
      SMART_CONTRACTS.ACCOUNTS,
      new web3Obj.eth.Contract(marketSCABIs.accounts_abi, poolInfo.accounts)
    );
  }

  /**
   * This method returns the account address included in the provided web3Obj.
   * @returns The account address
   */
  getCurrentAccount() {
    return (
      this.#web3Obj.currentProvider.selectedAddress ||
      this.#web3Obj.eth.accounts.wallet[0]?.address
    );
  }

  /**
   * This method calls a smart contract method without sending any transaction and altering the smart contract state.
   * @param {String} scName: The name of the smart contract to interact with.
   * @param {String} scMethodName: The name of the smart contract method to invoke.
   * @param {Object} sendData(Optional): Object to include options for calling.
   * @param  {...any} args: The arguments to be passed to the smart contract method.
   * @returns
   */
  call(scName, scMethodName, sendData = {}, ...args) {
    console.log("call", scName, scMethodName, sendData, ...args);
    const smartContractInstance = this.#marketSCMap.get(scName);
    return smartContractInstance.methods[scMethodName](...args).call({
      from: this.getCurrentAccount(),
      ...sendData,
    });
  }

  /**
   * This method calls a smart contract method by sending a transaction and altering the smart contract state.
   * @param {String} scName: The name of the smart contract to interact with.
   * @param {String} scMethodName: The name of the smart contract method to invoke.
   * @param {Object} sendData(Optional): Object to include options for sending.
   * @param  {...any} args: The arguments to be passed to the smart contract method.
   * @returns
   */
  send(scName, scMethodName, sendData = {}, ...args) {
    const smartContractInstance = this.#marketSCMap.get(scName);
    return this.call(scName, scMethodName, sendData, ...args)
      .then(() => this.estimateGasCost(scName, scMethodName, sendData, ...args))
      .then((gas) => (sendData.gas = parseInt(gas * 1.05, 10)))
      .then(() => this.#web3Obj.eth.getGasPrice())
      .then((gasPrice) => {
        const localGasPrice = BigNumber(gasPrice).multipliedBy(1.6).toFixed(0);
        sendData.gasPrice = localGasPrice;
        return smartContractInstance.methods[scMethodName](...args).send({
          from: this.getCurrentAccount(),
          ...sendData,
        });
      });
  }

  /**
   * This method gets the estimated gas cost for invoking a smart contract method. The estimated gas depends on the state of the smart contract.
   * @param {String} scName: The name of the smart contract to interact with.
   * @param {String} scMethodName: The name of the smart contract method to invoke.
   * @param {Object} sendData(Optional): Object to include options for calling.
   * @param  {...any} args: The arguments to be passed to the smart contract method.
   * @returns
   */
  estimateGasCost(scName, scMethodName, sendData = {}, ...args) {
    const smartContractInstance = this.#marketSCMap.get(scName);
    return smartContractInstance.methods[scMethodName](...args).estimateGas({
      from: this.getCurrentAccount(),
      ...sendData,
    });
  }
}
