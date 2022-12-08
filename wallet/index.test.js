const Wallet = require('./index');
const { verifySignature } = require('../utilities');
const Transaction = require('./transaction');

describe('wallet', () => {
    let wallet;

    beforeEach(() => {
        wallet = new Wallet();
    });

    test('Has a `balance`', () => {
        expect(wallet).toHaveProperty('balance');
    });

    test('Has a `publicKey`', () => {
        expect(wallet).toHaveProperty('publicKey');        
    });

    describe('signing data', () => {
        const data = 'foobar';

        test('verifies a signature', () => {
            expect(verifySignature({
                publicKey: wallet.publicKey,
                data,
                signature: wallet.sign(data)                
            })
            ).toBe(true);
        });

        test('does not verify an invalid signature', () => {
            expect(verifySignature({
                publicKey: wallet.publicKey,
                data,
                signature: new Wallet().sign(data)
            })
            ).toBe(false);
        });
    });

    describe('createTransaction()', () => {
        describe('and the amount exceeds the balance', () => {
            test('throws an error', () => {
                expect(() => wallet.createTransaction({ amount:999999, recipient: 'foo'})).toThrow('Amount exceeds balance');
            });
        });

        describe('and the amount is valid', () => {
            let transaction, amount, recipient;

            beforeEach(() => {
                amount = 50;
                recipient = 'foo';
                transaction = wallet.createTransaction({ amount, recipient });
            })

            test('creates an instance of `Transaction`', () => {
                expect(transaction instanceof Transaction).toBe(true);
            });

            test('matches the transaction input with the wallet', () => {
                expect(transaction.input.address).toEqual(wallet.publicKey);
            });

            test('outputs the amount to the recipinet', () => {
                expect(transaction.outputMap[recipient]).toEqual(amount);
            });
        });
    })

})