/**
 * This an abstract class that represents the factory for getting a new instance of a market integration object(MaketDataReader, MarketTransactionManager).
 */
export class MarketIntegrationFactory {
  static async getNewInstance(chain, marketId, web3Obj) {
    return this.createNewInstance(chain, marketId, web3Obj);
  }

  static async createNewInstance(chain, marketId, web3Obj) {
    throw new Error(`Method "createNewInstance()" must be implemented`);
  }
}
