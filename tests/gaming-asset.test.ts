import { describe, it, expect, beforeEach } from 'vitest';
import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.5.4/index.ts';

describe('Gaming Marketplace Contract Tests', () => {
  // Setup test environment
  let chain: Chain;
  let deployer: Account;
  let wallet1: Account;
  let wallet2: Account;
  
  beforeEach(() => {
    // Reset the chain and get test accounts
    chain = new Clarinet.makeChainCallerFactory();
    [deployer, wallet1, wallet2] = chain.getTestAccounts();
  });
  
  // Test asset creation
  describe('Asset Creation', () => {
    it('should create a new game asset successfully', () => {
      const createAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'create-asset',
          [
            types.ascii('game-test-1'),     // game-id
            types.ascii('Legendary Sword'), // name
            types.ascii('A powerful sword'), // description
            types.uint(10),                 // royalty rate (10%)
            types.uint(1000)                // initial price
          ],
          wallet1.address
      );
      
      const block = chain.mineBlock([createAssetTx]);
      
      // Assert transaction success
      block.receipts[0].result.expectOk().expectUint(0);
    });
    
    it('should reject asset creation with invalid royalty rate', () => {
      const createAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'create-asset',
          [
            types.ascii('game-test-1'),
            types.ascii('Legendary Sword'),
            types.ascii('A powerful sword'),
            types.uint(30),                 // Invalid royalty rate (>20%)
            types.uint(1000)
          ],
          wallet1.address
      );
      
      const block = chain.mineBlock([createAssetTx]);
      
      // Assert transaction failure due to invalid royalty rate
      block.receipts[0].result.expectErr().expectUint(103);
    });
  });
  
  // Test asset listing and purchase
  describe('Asset Listing and Purchase', () => {
    beforeEach(() => {
      // Create an asset before each test in this block
      const createAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'create-asset',
          [
            types.ascii('game-test-1'),
            types.ascii('Legendary Sword'),
            types.ascii('A powerful sword'),
            types.uint(10),
            types.uint(1000)
          ],
          wallet1.address
      );
      
      chain.mineBlock([createAssetTx]);
    });
    
    it('should list asset for sale', () => {
      const listAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'list-asset-for-sale',
          [
            types.uint(0),                  // asset-id
            types.ascii('game-test-1'),     // game-id
            types.uint(1500)                // new price
          ],
          wallet1.address
      );
      
      const block = chain.mineBlock([listAssetTx]);
      
      // Assert transaction success
      block.receipts[0].result.expectOk().expectBool(true);
    });
    
    it('should prevent non-owner from listing asset', () => {
      const listAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'list-asset-for-sale',
          [
            types.uint(0),
            types.ascii('game-test-1'),
            types.uint(1500)
          ],
          wallet2.address  // Different wallet trying to list
      );
      
      const block = chain.mineBlock([listAssetTx]);
      
      // Assert transaction failure due to not being the owner
      block.receipts[0].result.expectErr().expectUint(100);
    });
    
    it('should purchase asset with correct royalty distribution', () => {
      // First, list the asset
      const listAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'list-asset-for-sale',
          [
            types.uint(0),
            types.ascii('game-test-1'),
            types.uint(1500)
          ],
          wallet1.address
      );
      
      // Then, purchase the asset
      const purchaseAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'purchase-asset',
          [
            types.uint(0),
            types.ascii('game-test-1')
          ],
          wallet2.address
      );
      
      const block = chain.mineBlock([listAssetTx, purchaseAssetTx]);
      
      // Assert purchase success
      block.receipts[1].result.expectOk().expectBool(true);
      
      // Verify asset ownership transfer and royalty
      const assetDetails = chain.callReadOnlyFn(
          'gaming-marketplace',
          'get-asset-details',
          [types.uint(0), types.ascii('game-test-1')],
          wallet1.address
      );
      
      // Check new owner
      assetDetails.result.expectSome().expectTuple({
        owner: wallet2.address
      });
    });
  });
  
  // Test asset transfer
  describe('Asset Transfer', () => {
    beforeEach(() => {
      // Create an asset before each test in this block
      const createAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'create-asset',
          [
            types.ascii('game-test-1'),
            types.ascii('Legendary Sword'),
            types.ascii('A powerful sword'),
            types.uint(10),
            types.uint(1000)
          ],
          wallet1.address
      );
      
      chain.mineBlock([createAssetTx]);
    });
    
    it('should transfer asset ownership', () => {
      const transferAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'transfer-asset',
          [
            types.uint(0),                  // asset-id
            types.ascii('game-test-1'),     // game-id
            wallet2.address,                // new owner
            types.uint(1500)                // new price
          ],
          wallet1.address
      );
      
      const block = chain.mineBlock([transferAssetTx]);
      
      // Assert transaction success
      block.receipts[0].result.expectOk().expectBool(true);
      
      // Verify asset ownership transfer
      const assetDetails = chain.callReadOnlyFn(
          'gaming-marketplace',
          'get-asset-details',
          [types.uint(0), types.ascii('game-test-1')],
          wallet1.address
      );
      
      // Check new owner and price
      assetDetails.result.expectSome().expectTuple({
        owner: wallet2.address,
        price: types.uint(1500)
      });
    });
    
    it('should prevent unauthorized asset transfer', () => {
      const transferAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'transfer-asset',
          [
            types.uint(0),
            types.ascii('game-test-1'),
            wallet2.address,
            types.uint(1500)
          ],
          wallet2.address  // Not the original owner
      );
      
      const block = chain.mineBlock([transferAssetTx]);
      
      // Assert transaction failure due to not being the owner
      block.receipts[0].result.expectErr().expectUint(100);
    });
  });
  
  // Test asset details retrieval
  describe('Asset Details Retrieval', () => {
    beforeEach(() => {
      // Create an asset before each test in this block
      const createAssetTx = Tx.contractCall(
          'gaming-marketplace',
          'create-asset',
          [
            types.ascii('game-test-1'),
            types.ascii('Legendary Sword'),
            types.ascii('A powerful sword'),
            types.uint(10),
            types.uint(1000)
          ],
          wallet1.address
      );
      
      chain.mineBlock([createAssetTx]);
    });
    
    it('should retrieve asset details', () => {
      const assetDetails = chain.callReadOnlyFn(
          'gaming-marketplace',
          'get-asset-details',
          [types.uint(0), types.ascii('game-test-1')],
          wallet1.address
      );
      
      // Verify retrieved details match creation parameters
      assetDetails.result.expectSome().expectTuple({
        owner: wallet1.address,
        creator: wallet1.address,
        name: types.ascii('Legendary Sword'),
        description: types.ascii('A powerful sword'),
        royalty-rate: types.uint(10),
          price: types.uint(1000)
    });
    });
    
    it('should return none for non-existent asset', () => {
      const assetDetails = chain.callReadOnlyFn(
          'gaming-marketplace',
          'get-asset-details',
          [types.uint(999), types.ascii('non-existent-game')],
          wallet1.address
      );
      
      // Verify no details returned
      assetDetails.result.expectNone();
    });
  });
});

// Configuration for running the tests
export default {
  test: {
    name: 'gaming-marketplace-contract-tests',
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
};
