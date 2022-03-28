const ICO = artifacts.require('SCRICO.sol');
const Token = artifacts.require('ScorpionToken.sol');

module.exports = async function(deployer, network, accounts){
    await Promise.all(
        [Token,ICO].map(contract=>deployer.deploy(contract))
    );

}