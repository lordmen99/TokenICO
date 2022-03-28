// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {ScorpionToken} from "./ScorpionToken.sol";

contract SCRICO {   

    struct Sale{
        address investor;
        uint amount;
    }

    Sale[] public sales;
    address public tokenAdd;
    address public admin;
    uint public endDate;
    uint public price;
    uint public availableTokens;
    uint public minPurchase;
    uint public maxPurchase;
    uint public totalSupply;
    bool private tokensReleased;

    mapping(address=>bool) public investors;

    constructor() {
        tokenAdd = address(new ScorpionToken());
        admin = msg.sender;
        totalSupply = ScorpionToken(tokenAdd).totalSupply();
    }
    
    function startICO(uint _duration, uint _price, uint _tokensForSale, uint _min, uint _max) external onlyAdmin() icoNotActive() {
        require(_duration > 0, 'duration should be greater than zero');
        require(_price > 0, 'price should be greater than zero');
        require(_tokensForSale>0 && _tokensForSale<totalSupply,'give a reasonable amount for token sale');
        require(_min>0,'Min Purchase should be greater than zero');
        require(_max>0,'Max Purchase should be greater than zero');
        require(_max<_tokensForSale,'Max Purchase should be less than the tokens up for sale');

        endDate = block.timestamp + _duration;
        price = _price;
        availableTokens=_tokensForSale;
        minPurchase = _min;
        maxPurchase=_max;
    }

    function whitelist(address _investor) external onlyAdmin() {
        investors[_investor] = true;
    }

    
    function buyInPresale() external payable onlyInvestors() icoActive() {  
        require(msg.value % price == 0, 'have to send multiple of price');
        require(msg.value >= minPurchase && msg.value <= maxPurchase, 'have to send between Min & Max');
        require(msg.value * price <= availableTokens, 'not enough tokens left for sale');
        
        availableTokens -= msg.value * price;

        sales.push(Sale(
            msg.sender, 
            msg.value * price
        ));
    }

    function releaseTokens() external onlyAdmin() icoEnded() tokensNotReleased() {
        ScorpionToken tokenInstance = ScorpionToken(tokenAdd);
        //transfer tokens to all investors
        for(uint i;i<sales.length;i++){
            Sale storage sale = sales[i];
            tokenInstance.transfer(sale.investor, sale.amount);
        }
        tokensReleased = true;
    }


    function withdrawFunds(address payable _to) external onlyAdmin() icoEnded() tokensReleasedAlready {
        _to.transfer(address(this).balance);
    }

    function getSale(address _investor) external view returns(uint){
        for(uint i=0;i<sales.length;i++){
            if(sales[i].investor == _investor){
                return sales[i].amount;
            }
        }
        return 0;
    }
    
    modifier onlyAdmin() {
        require(msg.sender == admin, 'only admin can do it');
        _;
    }

    modifier icoNotActive() {
        require(endDate == 0, 'ICO should not be active');
        _;
    }

    modifier onlyInvestors() {
        require(investors[msg.sender] == true, 'only investors can buy in');
        _;
    }

    modifier icoActive() {
        require(endDate > 0, 'ICO has not started yet');
        require(block.timestamp < endDate, 'ICO is already over');
        require(availableTokens > 0, 'all tokens are sold out');
        _;
    }

    modifier icoEnded(){
        require(endDate > 0, 'ICO not active');
        require(endDate <= block.timestamp, 'ICO is not over yet');
        require(availableTokens == 0, 'ico is not over yet, tokens still left');
        _;
    }

    modifier tokensNotReleased() {
        require(tokensReleased == false, 'tokens must not have been released');
        _;
    }

    modifier tokensReleasedAlready() {
        require(tokensReleased == true, 'Tokens not released yet');
        _;
    }

}
