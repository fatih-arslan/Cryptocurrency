const cryptoHash = require('./crypto-hash');

describe('cryptoHash()', () => {
    const fooHash = '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae';

    test('Generates a sha-256 hashed output', () => {
        expect(cryptoHash('foo')).toEqual(fooHash);
    });

    test('Produces the same hash with the same input arguments in any order', () => {
        expect(cryptoHash('one', 'two', 'three')).toEqual(cryptoHash('three', 'one', 'two'));
    })
})