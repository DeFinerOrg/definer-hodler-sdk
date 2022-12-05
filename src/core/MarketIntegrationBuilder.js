import poolDataHelperABI from "../abi/pool-data-helper.abi.json" assert { type: "json" };
import smartContract from "../config/smartContract.json" assert { type: "json" };
export class MarketIntegrationBuilder {
  constructor() {
    if (this.constructor === MarketIntegrationBuilder) {
      throw new Error(
        `Class "MarketIntegrationBuilder cannot be instantiated.`
      );
    }
  }

  build() {
    throw new Error(`Method "build()" must be implemented.`);
  }

  /**
   * @returns constract instance for PoolDataHelper smart contract.
   */
  getPoolDataHelperInstance(chainId, web3Obj) {
    //Get the poolDataHelper smart contract address.
    const poolDataHelperContractAddress = smartContract.poolDataHelper.find(
      (item) => item.chainId === chainId
    )?.address;
    if (!poolDataHelperContractAddress) {
      throw new Error("smart contract Address is missing");
    }
    return new web3Obj.eth.Contract(
      poolDataHelperABI,
      poolDataHelperContractAddress
    );
  }

  /**
   * This private method when initially invoked fetches the HODLer market's raw data from the smart contract and stores it in the property: #marketId.
   *    the value of the property: #marketId is returned for subsequent invocations.
   * @returns The HODLer market's raw data fetched from the smart contract.
   */
  async getMarketData(marketDataHelperSC, marketId) {
    const marketRawData = await marketDataHelperSC.methods
      .getPoolData(marketId)
      .call();
    return marketRawData;
  }
}
