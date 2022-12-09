const Blockchain = require('./index');
const Block = require('./block');
const { cryptoHash } = require('../utilities');
const Wallet = require('../wallet');
const Transaction = require('../wallet/transaction');

describe('Blockchain', () => {
    let blockchain, newChain, originalChain, errorMock;

    beforeEach(() => {
        blockchain = new Blockchain();
        newChain = new Blockchain();
        errorMock = jest.fn();

        originalChain = blockchain.chain;
        global.console.error = errorMock;
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
        let logMock;

        beforeEach(() => {
            logMock = jest.fn();

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

        describe('and the `validateTransactions` flag is true', () => {
            test('calls validTransactionData()', () => {
                const validTransactionDataMock = jest.fn();

                blockchain.validTransactionData = validTransactionDataMock;

                newChain.addBlock({ data: 'foo' });
                blockchain.replaceChain(newChain.chain, true);

                expect(validTransactionDataMock).toHaveBeenCalled();
            })
        })
    });

    describe('validTransactionData()', () => {
        let transaction, rewardTransaction, wallet;

        beforeEach(() => {
            wallet = new Wallet();
            transaction = wallet.createTransaction({ recipient: 'foo-adress', amount: 65 });
            rewardTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
        });

        describe('and the transaction data is valid', () => {
            test('returns true', () => {
                newChain.addBlock({ data: [transaction, rewardTransaction] });

                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(true);
            });
        });

        describe('and the transaction data has multiple rewards', () => {
            test('returns false and logs an error', () => {
                newChain.addBlock({ data: [transaction, rewardTransaction, rewardTransaction]});

                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        }); 

        describe('and the transaction data has at least one malformed outputMap', () => {
            describe('and the transaction is not a reward transaction', () => {
                test('returns false and logs an error', () => {
                    transaction.outputMap[wallet.publicKey] = 999999;

                    newChain.addBlock({ data: [transaction, rewardTransaction] });

                    expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe('and the transaction is a reward transaction()', () => {
                test('returns false and logs an error', () => {
                    rewardTransaction.outputMap[wallet.publicKey] = 999999;

                    newChain.addBlock({ data: [transaction, rewardTransaction] });

                    expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false); 
                    expect(errorMock).toHaveBeenCalled();
                });
            });            
        });

        describe('and the transaction data has at least one malformed input', () => {
            test('returns false and logs an error', () => {
                wallet.balance = 9000;

                const evilOutputMap = {
                    [wallet.publicKey]: 8900,
                    fooRecipient: 100
                };

                const evilTransaction = {
                    input: {
                        timestamp: Date.now(),
                        amount: wallet.balance,
                        address: wallet.publicKey,
                        signature: wallet.sign(evilOutputMap)
                    },
                    outputMap: evilOutputMap
                }

                newChain.addBlock({ data: [evilTransaction, rewardTransaction]});
                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe('and a block contains multiple identical transactions', () => {
            test('returns false and logs error', () => {
                newChain.addBlock({
                    data: [transaction, transaction, transaction, rewardTransaction]
                });

                expect(blockchain.validTransactionData({ chain: newChain.chain })).toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });
    });
});