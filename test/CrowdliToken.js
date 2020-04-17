const truffleAssert = require('truffle-assertions');
const CrowdliToken = artifacts.require('CrowdliToken');

contract("Crowdli Token Test", async accounts => {
    const owner = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    const chris = accounts[3];
    const thom = accounts[4];

    it("Name should be equals to `CROWDLITOKEN`", async () => {
        let instance = await CrowdliToken.deployed();
        let name = await instance.name();
        assert.equal(name, "CROWDLITOKEN");
    });

    it("Symbol should be equals to `CRT`", async () => {
        let instance = await CrowdliToken.deployed();
        let symbol = await instance.symbol();
        assert.equal(symbol, "CRT");
    });

    it("Decimals should be equals to 5", async () => {
        let instance = await CrowdliToken.deployed();
        let decimals = await instance.decimals();
        assert.equal(decimals, 5);
    });

    it("Mint without KYC should throw the following errormessage: CROWDLITOKEN: address is not in kyc list", async () => {
        let instance = await CrowdliToken.deployed();
        await truffleAssert.reverts(instance.mintTo(alice, 10000, 0), "CROWDLITOKEN: address is not in kyc list");
    });

    it("Mint with KYC", async () => {
        let instance = await CrowdliToken.deployed();
        await instance.addUserListToKycRole([alice]);
        await instance.mintTo(alice, 1000000, 0);
        let balanceOfAlice = await instance.balanceOf(alice);
        assert.equal(balanceOfAlice, 1000000);
    });

    it("Total Supply Should be 1'000'000 at this moment", async () => {
        let instance = await CrowdliToken.deployed();
        let totalSupply = await instance.totalSupply();
        assert.equal(totalSupply, 1000000);
    });

    it("Transfer should not work from alice to bob because bob is not in KYC list", async () => {
        let instance = await CrowdliToken.deployed();
        await truffleAssert.reverts(instance.transfer(bob, 500000), "CROWDLITOKEN: Transferrestriction detected please call detectTransferRestriction(address from, address to, uint256 value) for detailed information");
    });

    it("Transfer Should Work (from alice to bob) .transfer(address recipient, uint256 amount)", async () => {
        let instance = await CrowdliToken.deployed();
        await instance.addUserListToKycRole([bob]);
        await instance.transfer(bob, 500000, {
            from : alice
        });
        let balanceOfAlice = await instance.balanceOf(alice);
        let balanceOfBob = await instance.balanceOf(bob);
        assert.equal(balanceOfAlice, 500000);
        assert.equal(balanceOfBob, 500000);
    });

    it("Total Supply Should be 1'000'000 at this moment", async () => {
        let instance = await CrowdliToken.deployed();
        let totalSupply = await instance.totalSupply();
        assert.equal(totalSupply, 1000000);
    });

    it("Account already in KYC List", async () => {
        let instance = await CrowdliToken.deployed();
        await truffleAssert.reverts(instance.addUserListToKycRole([alice]), "Roles: account already has role");
    });

    it("Transfer Should not Work .transferFrom(address sender, address recipient, uint256 amount) if the given allowance is not there", async () => {
        let instance = await CrowdliToken.deployed();
        await instance.addUserListToKycRole([owner]);
        await truffleAssert.reverts(instance.transferFrom(bob, owner, 2500,{
            from:alice
        }), "ERC20: transfer amount exceeds allowance");
    });

    it("Approve 3500 tokens with bob for alice and send these Tokens to chris with alice on behalf of bob", async () => {
        let instance = await CrowdliToken.deployed();
        await instance.addUserListToKycRole([chris]);

        await instance.approve(alice, 2500,{
            from: bob
        });

        let approvedTokens = await instance.allowance(bob,alice);
        assert.equal(approvedTokens, 2500);

        await instance.transferFrom(bob, chris, 2500, {
            from:alice
        });

        await instance.approve(alice, 2500,{
            from: bob
        });

        await instance.increaseAllowance(alice, 1500,{
            from:bob
        });

        let approvedTokensAfterIncrease = await instance.allowance(bob,alice);
        assert.equal(approvedTokensAfterIncrease, 4000);

        await instance.decreaseAllowance(alice, 3000,{
            from:bob
        });

        let approvedTokensAfterDecrease = await instance.allowance(bob,alice);
        assert.equal(approvedTokensAfterDecrease, 1000);

        await truffleAssert.reverts(instance.transferFrom(bob, chris, 2500,{
            from:alice
        }), "ERC20: transfer amount exceeds allowance");

        await instance.transferFrom(bob, chris, 1000, {
            from:alice
        });

        let balanceOfAlice = await instance.balanceOf(alice);
        let balanceOfBob = await instance.balanceOf(bob);
        let balanceOfChris = await instance.balanceOf(chris);

        assert.equal(balanceOfAlice, 500000);
        assert.equal(balanceOfBob, 496500);
        assert.equal(balanceOfChris, 3500);
    });
});