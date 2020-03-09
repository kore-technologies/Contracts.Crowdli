const toBigNumber = require("./helpers.js").toBigNumber;
const expectRevertOrFail = require("./helpers.js").expectRevertOrFail;
const encodeBytes = require("./helpers.js").encodeBytes;

const expect = require('chai').use(require('chai-bignumber')(web3.BigNumber)).expect;

const CrowdliToken = artifacts.require('CrowdliToken');

module.exports = function(options) {
    const sid = options.accounts[0];
    const alice = options.accounts[1];
    const bob = options.accounts[2];
    const charles = options.accounts[3];

    describe('transferFrom(_from, _to, _value)', function() {
        describeIt('when(_from != _to and _to != sender)', alice, bob, charles);
        describeIt('when(_from != _to and _to == sender)', alice, bob, bob);
        describeIt('when(_from == _to and _to != sender)', alice, alice, bob);
        describeIt('when(_from == _to and _to == sender)', alice, alice, alice);

        it('should revert when trying to transfer while not allowed at all', async function () {
            await credit(alice, tokens(3));
            await expectRevertOrFail(contract.transferFrom(alice, bob, tokens(1), {from: bob}));
            await expectRevertOrFail(contract.transferFrom(alice, charles, tokens(1), {from: bob}));
        });
    });
}