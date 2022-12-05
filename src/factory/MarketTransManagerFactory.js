import { MarketTransactionManager } from "../core/MarketTransactionManager.js";
import { MarketIntegrationFactory } from "./MarketIntegrationFactory.js";
/**
 * This is the factory class that implements the steps required for creating an instance of MarketTransManager through its builder class.
 */
export class MarketTransManagerFactory extends MarketIntegrationFactory {
  /**
   * This method creates and returns a new instance of the class, MarketTransactionManager, using the build class: MarketTransManagerBuilder.
   * @param {Object} chain: The blockchain where the HODLer market was created.
   * @param {Number} marketId: The HODLer market identifier.
   * @param {Object} web3Obj: The web3 instance to use with the integration with the blockchain.
   * @returns: A new object of the class: MarketTransactionManager.
   */
  static async createNewInstance(chain, marketId, web3Obj) {
    const transManagerBuilder = MarketTransactionManager.getBuilder();
    const marketTransManager = await transManagerBuilder
      .withChain(chain)
      .withMarket(marketId)
      .withWeb3Obj(web3Obj)
      .build();
    return marketTransManager;
  }
}
