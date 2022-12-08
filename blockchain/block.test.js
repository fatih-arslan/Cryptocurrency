const hexToBinary = require('hex-to-binary');
const Block = require("./block");
const { GENESIS_DATA, MINE_RATE } = require("../config");
const { cryptoHash } = require("../utilities");

describe('Block', () => {
    const timestamp = 2000;
    const lastHash = 'foo-hash';
    const data = ['blockchain', 'data'];
    const hash = 'bar-hash';
    const nonce = 1;
    const difficulty = 1;
    const block = new Block({timestamp, data, hash, lastHash, nonce, difficulty}); 

    test('Block has a timestamp, lastHash, data, hash, nonce, difficulty property', () => {
        expect(block.timestamp).toEqual(timestamp);        
        expect(block.lastHash).toEqual(lastHash);        
        expect(block.data).toEqual(data);        
        expect(block.hash).toEqual(hash);        
        expect(block.nonce).toEqual(nonce);        
        expect(block.difficulty).toEqual(difficulty);        
    });

    describe('genesis()', () => {
        const genesisBlock = Block.genesis();
    
        test('return a Block instance', () => {
            expect(genesisBlock instanceof Block).toBe(true);
        });
    
        test('returns the genesis data', () => {
            expect(genesisBlock).toEqual(GENESIS_DATA);
        })
    })

    describe('mine block', () => {
        const lastBlock = Block.genesis();
        const data = 'mined data';
        const minedBlock = Block.mineBlock({lastBlock, data});

        test('Returns a block instance', () => {
            expect(minedBlock instanceof Block).toBe(true);            
        });

        test('Sets the `lastHash` to be the hash of the last block', () => {
            expect(minedBlock.lastHash).toEqual(lastBlock.hash);
        })

        test('Sets the `data`', () => {
            expect(minedBlock.data).toEqual(data);
        })

        test('Sets a `timestamp`', () => {
            expect(minedBlock.timestamp).not.toEqual(undefined);
        })

        test('Creates a sha-256 `hash` based on the proper inputs', () => {
            expect(minedBlock.hash).toEqual(cryptoHash(
                minedBlock.timestamp, 
                lastBlock.hash, 
                data, 
                minedBlock.nonce, 
                minedBlock.difficulty
                ));
        });

        test('Sets a `hash` that matches the difficulty criteria', () => {
            expect(hexToBinary(minedBlock.hash).substring(0, minedBlock.difficulty)).toEqual('0'.repeat(minedBlock.difficulty));
        });

        test('Adjusts the difficulty', () => {
            const possibleResults = [lastBlock.difficulty+1, lastBlock.difficulty-1];
            
            expect(possibleResults.includes(minedBlock.difficulty)).toBe(true);
        })
    });

    describe('adjustDifficulty', () => {
        test('Raises the difficulty for a quickly mined block', () => {
            expect(Block.adjustDifficulty({
                originalBlock: block, timestamp: block.timestamp + MINE_RATE - 100
            })).toEqual(block.difficulty+1);
        })

        test('Lowers the difficulty for a slowly mined block', () => {
            expect(Block.adjustDifficulty({
                originalBlock: block, timestamp: block.timestamp + MINE_RATE + 100
            })).toEqual(block.difficulty-1);
        })

        test('Has a lower limit of 1', () => {
            block.difficulty = -1;

            expect(Block.adjustDifficulty({originalBlock: block})).toEqual(1);
        })
    })
    
});

