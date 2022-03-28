const { expectRevert, time } = require('@openzeppelin/test-helpers');

const ICO = artifacts.require('SCRICO.sol');
const Token = artifacts.require('ScorpionToken.sol');


contract('SCRICO', (accounts)=>{
    let icoInstance = undefined;
    let tokenInstance = undefined;
    let tokenAddress = undefined;

    const totalSupplyInitial = web3.utils.toBN(web3.utils.toWei('1000000','ether'));
    
    //const price = web3.utils.toBN(web3.utils.toWei('1','ether'));

    beforeEach(async()=>{
        icoInstance = await ICO.new();
        tokenAddress = await icoInstance.tokenAdd();    
        tokenInstance = await Token.at(tokenAddress);
    });

    it('should fetch the Scorpion Token details correctly', async()=>{
        let name = await tokenInstance.name();
        let symbol = await tokenInstance.symbol();
        let decimals = await tokenInstance.decimals();
        let totalSupply = await tokenInstance.totalSupply();
        assert(name === 'Scorpion Token');
        assert(symbol === 'SCR');
        assert(decimals.toString() === '18');
        assert(totalSupply.eq(totalSupplyInitial));
    });

    it('should start the ICO process', async () =>{
        const duration = 100; //seconds
        const price = web3.utils.toWei('1','ether');
        const availableToken = web3.utils.toWei('100','ether');
        const minPurchase = web3.utils.toWei('10','ether');
        const maxPurchase = web3.utils.toWei('30','ether');

        const start = parseInt((new Date()).getTime() / 1000);
        time.increaseTo(start);
        //startICO(uint _duration, uint _price, uint _tokensForSale, uint _min, uint _max) 
        await icoInstance.startICO(duration,price,availableToken,minPurchase,maxPurchase);

        const expectEnd = web3.utils.toBN(start + duration);
        const end = await icoInstance.endDate();
        const price11 = await icoInstance.price();
        const actualAvaTokens = await icoInstance.availableTokens();
        const actualMinPurchase = await icoInstance.minPurchase();
        const actualMaxPurchase = await icoInstance.maxPurchase();

        assert(price11.eq(web3.utils.toBN(price)));
        assert(actualAvaTokens.eq(web3.utils.toBN(availableToken)));
        assert(actualMinPurchase.eq(web3.utils.toBN(minPurchase)));
        assert(actualMaxPurchase.eq(web3.utils.toBN(maxPurchase)));
    });

    context('sale started', ()=>{
        let start;
        const duration = 100;
        const price = 2;
        const availableTokens = web3.utils.toWei('30');
        const minPurchase = web3.utils.toWei('1'); 
        const maxPurchase = web3.utils.toWei('10');
        
        beforeEach(async() => {
            start = parseInt((new Date()).getTime() / 100);
            time.increaseTo(start);
            await icoInstance.startICO(
              duration, 
              price, 
              availableTokens, 
              minPurchase, 
              maxPurchase
            ); 
        });

        it('should NOT let non-investors buy', async () => {
            await expectRevert(
              icoInstance.buyInPresale({from: accounts[2], value: web3.utils.toWei('1')}),
              'only investors can buy in'
            );
        });
        
        it('should NOT buy if not between min and max purchase', async () => {
            await icoInstance.whitelist(accounts[2]);
            let value = web3.utils.toBN(minPurchase).sub(web3.utils.toBN(2)); 
            await expectRevert(
              icoInstance.buyInPresale({from: accounts[2], value}),
              'have to send between Min & Max'
            );
            value = web3.utils.toBN(maxPurchase).add(web3.utils.toBN(2)); 
            await expectRevert(
              icoInstance.buyInPresale({from: accounts[2], value}),
              'have to send between Min & Max'
            );
        });
        
        it('full ICO process..investors buy/Admin Release/withdraw funds', async()=>{
            const [investor1, investor2] = [accounts[1], accounts[2]];
            const [amount1, amount2] = [
              web3.utils.toBN(web3.utils.toWei('5')),
              web3.utils.toBN(web3.utils.toWei('10')),
            ];
            
            await icoInstance.whitelist(investor1);
            await icoInstance.whitelist(investor2);
            await icoInstance.buyInPresale({from: investor1, value: amount1}); 
            await icoInstance.buyInPresale({from: investor2, value: amount2}); 

            const avail = await icoInstance.availableTokens();
            console.log('avail',avail.toString());

            await expectRevert(
                icoInstance.releaseTokens({from: investor1}),
                'only admin can do it'
            );

            await expectRevert(
                icoInstance.withdrawFunds(accounts[9]),
                'ICO is not over yet'
            );
            
            time.increaseTo(start + duration + 10);
            await icoInstance.releaseTokens();
            const balance1 = await tokenInstance.balanceOf(investor1);
            const balance2 = await tokenInstance.balanceOf(investor2);
            assert(balance1.eq(amount1.mul(web3.utils.toBN(price))));
            assert(balance2.eq(amount2.mul(web3.utils.toBN(price))));
      
            await expectRevert(
              icoInstance.withdrawFunds(accounts[9], {from: investor1}),
              'only admin can do it'
            );
      
         // Admin withdraw ether that was sent to the ico
            const balanceContract = web3.utils.toBN(
                await web3.eth.getBalance(icoInstance.address)
            );

            console.log('contract balance', balanceContract.toString());
            const balanceBefore = web3.utils.toBN(
                await web3.eth.getBalance(accounts[9])
            );
            await icoInstance.withdrawFunds(accounts[9]);

            const balanceAfter = web3.utils.toBN(
                await web3.eth.getBalance(accounts[9])
            );
            assert(balanceAfter.sub(balanceBefore).eq(balanceContract));

      
        });
      
    });



})