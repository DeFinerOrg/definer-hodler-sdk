import { MarketDataReader } from "../core/MarketDataReader.js";
import { MarketIntegrationFactory } from "./MarketIntegrationFactory.js";
/**
 * This is the factory class that implements the steps required for creating an instance of MarketDataReader through its builder class.
 */
export class MarketDataReaderFactory extends MarketIntegrationFactory {
  /**
   * This method creates and returns a new instance of the class, MarketDataReader, using the build class: MarketDataReaderBuilder.
   * @param {Object} chain: The blockchain where the HODLer market was created.
   * @param {Number} marketId: The HODLer market identifier.
   * @param {Object} web3Obj: The web3 instance to use with the integration with the blockchain.
   * @returns: A new object of the class: MarketDataReader.
   */
  static async createNewInstance(chain, marketId, web3Obj) {
    const dataReaderBuilder = MarketDataReader.getBuilder();
    const marketDataReader = await dataReaderBuilder
      .withChain(chain)
      .withMarket(marketId)
      .withWeb3Obj(web3Obj)
      .build();
    return marketDataReader;
  }
}
