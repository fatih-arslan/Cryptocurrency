const Blockchain = require('./blockchain');
const Block = require('./block');
const cryptoHash = require('./crypto-hash');

describe('Blockchain', () => {
    let blockchain, newChain, originalChain;

    beforeEach(() => {
        blockchain = new Blockchain();
        newChain = new Blockchain();

        originalChain = blockchain.chain;
    })

    test('Contains a `chain` array instance', () => {
        expect(blockchain.chain instanceof Array).toBe(true);
    });

    test('Starts with the genesis block', () => {
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    })

    test('Adds new block to chain', () => {
        const newData = 'foo-data';
        blockchain.addBlock({data: newData});

        expect(blockchain.chain[blockchain.chain.length-1].data).toEqual(newData);
    })

    describe('isChainValid()', () => {
        describe('When the chain does not start with the genesis block', () => {
            test('returns false', () => {
                blockchain.chain[0] = {data: 'fake-genesis'};

                expect(Blockchain.isChainValid(blockchain.chain)).toBe(false);
            });
        });

        describe('When the chain starts with the genesis block and has multiple blocks', () => {
            beforeEach(() => {
                blockchain.addBlock({data: 'data1'});
                blockchain.addBlock({data: 'data2'});
                blockchain.addBlock({data: 'data3'});
            })
            describe('and a lastHash reference has changed', () => {
                test('returns false', () => {
                    blockchain.chain[2].lastHash = 'broken-lastHash';

                    expect(Blockchain.isChainValid(blockchain.chain)).toBe(false);
                });
            });

            describe('and the chain contains a block with an invalid field', () => {
                test('returns false', () => {
                    blockchain.chain[2].data = 'malicious-data';

                    expect(Blockchain.isChainValid(blockchain.chain)).toBe(false);                    
                });
            });

            describe('and the chain contains a block with a jumped difficulty', () => {
                test('return false', () => {
                    const lastBlock = blockchain.chain[blockchain.chain.length-1];
                    const lastHash = lastBlock.hash;
                    const timestamp = Date.now();
                    const nonce = 0;
                    const data = [];
                    const difficulty = lastBlock.difficulty-3;
                    const hash = cryptoHash(timestamp, lastHash, difficulty, nonce, data);
                    const badBlock = new Block({ timestamp, lastHash, hash, nonce, difficulty, data  })

                    blockchain.chain.push(badBlock);

                    expect(Blockchain.isChainValid(blockchain.chain)).toBe(false);
                })
            })

            describe('and the chain does not contain any invalid blocks', () => {
                test('returns true', () => {

                    expect(Blockchain.isChainValid(blockchain.chain)).toBe(true);
                });
            });
        });
    });

    describe('replaceChain()', () => {
        let errorMock, logMock;

        beforeEach(() => {
            errorMock = jest.fn();
            logMock = jest.fn();

            global.console.error = errorMock;
            global.console.log = logMock;
        })
        describe('When the new chain is not longer', () => {
            beforeEach(() => {
                newChain.chain[0] = {new: 'chain'};
                blockchain.replaceChain(newChain.chain);
            })

            test('Does not replace the chain', () => {                
                expect(blockchain.chain).toEqual(originalChain);
            });

            test('Logs an error', () => {
                expect(errorMock).toHaveBeenCalled();
            })
        });

        describe('When the new chain is longer', () => {
            beforeEach(() => {
                newChain.addBlock({data: 'data1'});
                newChain.addBlock({data: 'data2'});
                newChain.addBlock({data: 'data3'});
            })
            describe('and the new chain is invalid', () => {
                beforeEach(() => {
                    newChain.chain[2].hash = 'fake-hash';

                    blockchain.replaceChain(newChain.chain);
                })

                test('Does not replace the chain', () => {
                    expect(blockchain.chain).toEqual(originalChain);
                });

                test('Logs an error', () => {
                    expect(errorMock).toHaveBeenCalled();
                })
            });

            describe('and the new chain is valid', () => {
                beforeEach(() => {
                    blockchain.replaceChain(newChain.chain);
                })
                test('replaces the chain', () => {
                    expect(blockchain.chain).toEqual(newChain.chain);
                });

                test('Logs about chain replacement', () => {
                    expect(logMock).toHaveBeenCalled();
                })
            });
        });
    });
});