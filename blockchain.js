const Block = require('./block');
const cryptoHash = require('./crypto-hash');

class Blockchain{
    constructor(){
        this.chain = [Block.genesis()];
    }

    addBlock({ data }){
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length-1],
            data: data
        })

        this.chain.push(newBlock);
    }

    static isChainValid(chain){
        if(JSON.stringify(chain[0]) != JSON.stringify(Block.genesis())){
            return false;
        }

        for(let i = 1; i < chain.length; i++){
            const {timestamp, lastHash, nonce, difficulty, data, hash} = chain[i];
            const actualLastHash = chain[i-1].hash;
            const lastDifficulty = chain[i-1].difficulty;

            if(lastHash != actualLastHash){
                return false;
            }

            let validatedHash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
            
            if(hash != validatedHash){
                return false;
            }

            if(Math.abs(lastDifficulty - difficulty) > 1){
                return false;
            }
        }

        return true;
    }

    replaceChain(chain) {
        if(chain.length <= this.chain.length){
            console.error('The incoming chain must be longer');
            return;
        }

        if(!Blockchain.isChainValid(chain)){
            console.error('The incoming chain must be valid');
            return;
        }

        console.log('Replacing chain with', chain);
        this.chain = chain;
    }
}

module.exports = Blockchain;