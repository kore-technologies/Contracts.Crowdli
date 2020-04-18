const truffleAssert = require('truffle-assertions');
const CrowdliToken = artifacts.require('CrowdliToken');

contract("Crowdli Token Test", async accounts => {
    const owner = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    const chris = accounts[3];
    const broker = accounts[4];

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

    it("Approve 3500 tokens with bob for broker and send these Tokens to chris with broker on behalf of bob", async () => {
        let instance = await CrowdliToken.deployed();
        await instance.addUserListToKycRole([chris,broker]);

        await instance.approve(broker, 2500,{
            from: bob
        });

        let approvedTokens = await instance.allowance(bob,broker);
        assert.equal(approvedTokens, 2500);

        await instance.transferFrom(bob, chris, 2500, {
            from:broker
        });

        await instance.approve(broker, 2500,{
            from: bob
        });

        await instance.increaseAllowance(broker, 1500,{
            from:bob
        });

        let approvedTokensAfterIncrease = await instance.allowance(bob,broker);
        assert.equal(approvedTokensAfterIncrease, 4000);

        await instance.decreaseAllowance(broker, 3000,{
            from:bob
        });

        let approvedTokensAfterDecrease = await instance.allowance(bob,broker);
        assert.equal(approvedTokensAfterDecrease, 1000);

        await truffleAssert.reverts(instance.transferFrom(bob, chris, 2500,{
            from:broker
        }), "ERC20: transfer amount exceeds allowance");

        await instance.transferFrom(bob, chris, 1000, {
            from:broker
        });

        let balanceOfAlice = await instance.balanceOf(alice);
        let balanceOfBob = await instance.balanceOf(bob);
        let balanceOfChris = await instance.balanceOf(chris);
        let balanceOfBroker = await instance.balanceOf(broker);

        assert.equal(balanceOfAlice, 500000);
        assert.equal(balanceOfBob, 496500);
        assert.equal(balanceOfChris, 3500);
        assert.equal(balanceOfBroker, 0);
    });

    it("Transfer Restriction Code Test", async () => {
        let instance = await CrowdliToken.deployed();
        await truffleAssert.reverts(instance.messageForTransferRestriction(99), "CROWDLITOKEN: The code does not exist");

        let CODE_0 = await instance.messageForTransferRestriction(0);
        assert.equal(CODE_0, 'NO_RESTRICTIONS');

        let CODE_1 = await instance.messageForTransferRestriction(1);
        assert.equal(CODE_1, 'FROM_NOT_IN_KYC_ROLE');

        let CODE_2 = await instance.messageForTransferRestriction(2);
        assert.equal(CODE_2, 'TO_NOT_IN_KYC_ROLE');

        let CODE_3 = await instance.messageForTransferRestriction(3);
        assert.equal(CODE_3, 'FROM_IN_TRANSFERBLOCK_ROLE');

        let CODE_4 = await instance.messageForTransferRestriction(4);
        assert.equal(CODE_4, 'TO_IN_TRANSFERBLOCK_ROLE');

        let CODE_5 = await instance.messageForTransferRestriction(5);
        assert.equal(CODE_5, 'NOT_ENOUGH_FUNDS');

        let CODE_6 = await instance.messageForTransferRestriction(6);
        assert.equal(CODE_6, 'NOT_ENOUGH_UNALLOCATED_FUNDS');

        await truffleAssert.reverts(instance.removeRestrictionCode(1005), "CROWDLITOKEN: The code does not exist");
        await truffleAssert.reverts(instance.removeRestrictionCode(5), "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        await truffleAssert.reverts(instance.setRestrictionCode(5, "TESTCODE"), "CROWDLITOKEN: The code already exists");
        await truffleAssert.reverts(instance.setRestrictionCode(99, "TESTCODE"), "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        await instance.setRestrictionCode(105,"TESTCODE");
        let CODE_TEST = await instance.messageForTransferRestriction(105);
        assert.equal(CODE_TEST, 'TESTCODE');

        await instance.removeRestrictionCode(105);
        await truffleAssert.reverts(instance.removeRestrictionCode(105), "CROWDLITOKEN: The code does not exist");
        await truffleAssert.reverts(instance.messageForTransferRestriction(105), "CROWDLITOKEN: The code does not exist");
    });

    it("Burn Code Test", async () => {
        let instance = await CrowdliToken.deployed();
        await truffleAssert.reverts(instance.messageForBurnCode(99), "CROWDLITOKEN: The code does not exist");

        let CODE_0 = await instance.messageForBurnCode(0);
        assert.equal(CODE_0, 'KYC_ISSUE');

        let CODE_1 = await instance.messageForBurnCode(1);
        assert.equal(CODE_1, 'REFUND_EXIT');

        let CODE_2 = await instance.messageForBurnCode(2);
        assert.equal(CODE_2, 'REPLACE_TOKENS');

        let CODE_3 = await instance.messageForBurnCode(3);
        assert.equal(CODE_3, 'OTHER');

        await truffleAssert.reverts(instance.removeBurnCode(1005), "CROWDLITOKEN: The code does not exist");
        await truffleAssert.reverts(instance.removeBurnCode(3), "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        await truffleAssert.reverts(instance.setBurnCode(3, "TESTCODE"), "CROWDLITOKEN: The code already exists");
        await truffleAssert.reverts(instance.setBurnCode(99, "TESTCODE"), "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        await instance.setBurnCode(105,"TESTCODE");
        let CODE_TEST = await instance.messageForBurnCode(105);
        assert.equal(CODE_TEST, 'TESTCODE');

        await instance.removeBurnCode(105);
        await truffleAssert.reverts(instance.removeBurnCode(105), "CROWDLITOKEN: The code does not exist");
        await truffleAssert.reverts(instance.messageForBurnCode(105), "CROWDLITOKEN: The code does not exist");
    });

    it("Mint Code Test", async () => {
        let instance = await CrowdliToken.deployed();
        await truffleAssert.reverts(instance.messageForMintCode(99), "CROWDLITOKEN: The code does not exist");

        let CODE_0 = await instance.messageForMintCode(0);
        assert.equal(CODE_0, 'CRT_SALE');

        let CODE_1 = await instance.messageForMintCode(1);
        assert.equal(CODE_1, 'ANNUAL_ISSUANCE_FEE');

        let CODE_2 = await instance.messageForMintCode(2);
        assert.equal(CODE_2, 'QUARTERLY_ISSUANCE_FEE');

        let CODE_3 = await instance.messageForMintCode(3);
        assert.equal(CODE_3, 'REPLACE_TOKENS');

        let CODE_4 = await instance.messageForMintCode(4);
        assert.equal(CODE_4, 'OTHER');

        await truffleAssert.reverts(instance.removeMintCode(1005), "CROWDLITOKEN: The code does not exist");
        await truffleAssert.reverts(instance.removeMintCode(3), "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        await truffleAssert.reverts(instance.setMintCode(3, "TESTCODE"), "CROWDLITOKEN: The code already exists");
        await truffleAssert.reverts(instance.setMintCode(99, "TESTCODE"), "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        await instance.setMintCode(105,"TESTCODE");
        let CODE_TEST = await instance.messageForMintCode(105);
        assert.equal(CODE_TEST, 'TESTCODE');

        await instance.removeMintCode(105);
        await truffleAssert.reverts(instance.removeMintCode(105), "CROWDLITOKEN: The code does not exist");
        await truffleAssert.reverts(instance.messageForMintCode(105), "CROWDLITOKEN: The code does not exist");
    });

    it("Block Code Test", async () => {
        let instance = await CrowdliToken.deployed();
        await truffleAssert.reverts(instance.messageForBlockCode(99), "CROWDLITOKEN: The code does not exist");

        let CODE_0 = await instance.messageForBlockCode(0);
        assert.equal(CODE_0, 'KYC_ISSUE');

        let CODE_1 = await instance.messageForBlockCode(1);
        assert.equal(CODE_1, 'KYT_ISSUE');

        let CODE_2 = await instance.messageForBlockCode(2);
        assert.equal(CODE_2, 'LOST_TOKENS');

        let CODE_3 = await instance.messageForBlockCode(3);
        assert.equal(CODE_3, 'MAINTENANCE');

        let CODE_4 = await instance.messageForBlockCode(4);
        assert.equal(CODE_4, 'OTHER');

        await truffleAssert.reverts(instance.removeBlockCode(1005), "CROWDLITOKEN: The code does not exist");
        await truffleAssert.reverts(instance.removeBlockCode(3), "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        await truffleAssert.reverts(instance.setBlockCode(3, "TESTCODE"), "CROWDLITOKEN: The code already exists");
        await truffleAssert.reverts(instance.setBlockCode(99, "TESTCODE"), "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        await instance.setBlockCode(105,"TESTCODEBLOCK");
        let CODE_TEST = await instance.messageForBlockCode(105);
        assert.equal(CODE_TEST, 'TESTCODEBLOCK');

        await instance.removeBlockCode(105);
        await truffleAssert.reverts(instance.removeBlockCode(105), "CROWDLITOKEN: The code does not exist");
        await truffleAssert.reverts(instance.messageForBlockCode(105), "CROWDLITOKEN: The code does not exist");
    });

    it("Transfer Block Check", async () => {
        let instance = await CrowdliToken.deployed();
        await truffleAssert.reverts(instance.addTranserBlock(alice,508), "CROWDLITOKEN: The code does not exist");
        await instance.addTranserBlock(alice,2);

        let balanceOfAliceA = await instance.balanceOf(alice);
        let balanceOfBobA = await instance.balanceOf(bob);
        let balanceOfChrisA = await instance.balanceOf(chris);
        let balanceOfBrokerA = await instance.balanceOf(broker);

        assert.equal(balanceOfAliceA, 500000);
        assert.equal(balanceOfBobA, 496500);
        assert.equal(balanceOfChrisA, 3500);
        assert.equal(balanceOfBrokerA, 0);

        let transferRestiction = await instance.detectTransferRestriction(alice, bob, 2500);
        assert.equal(transferRestiction, 3);

        let CODE = await instance.messageForTransferRestriction(transferRestiction);
        assert.equal(CODE, 'FROM_IN_TRANSFERBLOCK_ROLE');

        await truffleAssert.reverts(instance.transfer(bob, 2500, {
            from : alice
        }), "CROWDLITOKEN: Transferrestriction detected please call detectTransferRestriction(address from, address to, uint256 value) for detailed information");

        await truffleAssert.reverts(instance.removeTransferblock(alice,508), "CROWDLITOKEN: The code does not exist");
        await instance.removeTransferblock(alice,2);

        let transferRestictionAfterRemove = await instance.detectTransferRestriction(alice, bob, 2500);
        assert.equal(transferRestictionAfterRemove, 0);

        let CODEAfterRemove = await instance.messageForTransferRestriction(transferRestictionAfterRemove);
        assert.equal(CODEAfterRemove, 'NO_RESTRICTIONS');

        let balanceOfAliceB = await instance.balanceOf(alice);
        let balanceOfBobB = await instance.balanceOf(bob);
        let balanceOfChrisB = await instance.balanceOf(chris);
        let balanceOfBrokerB = await instance.balanceOf(broker);

        assert.equal(balanceOfAliceB, 500000);
        assert.equal(balanceOfBobB, 496500);
        assert.equal(balanceOfChrisB, 3500);
        assert.equal(balanceOfBrokerB, 0);

        await instance.addTranserBlock(bob,3);
        let transferRestictionBob = await instance.detectTransferRestriction(alice, bob, 2500);
        assert.equal(transferRestictionBob, 4);

        let CODEBOB = await instance.messageForTransferRestriction(transferRestictionBob);
        assert.equal(CODEBOB, 'TO_IN_TRANSFERBLOCK_ROLE');

        await truffleAssert.reverts(instance.transfer(bob, 2500, {
            from : alice
        }), "CROWDLITOKEN: Transferrestriction detected please call detectTransferRestriction(address from, address to, uint256 value) for detailed information");

        await truffleAssert.reverts(instance.removeTransferblock(bob,520), "CROWDLITOKEN: The code does not exist");
        await instance.removeTransferblock(bob,4);

        let transferRestictionBobAfterRemove = await instance.detectTransferRestriction(alice, bob, 2500);
        assert.equal(transferRestictionBobAfterRemove, 0);

        await instance.transfer(bob, 2500, {
            from : alice
        });

        let balanceOfAlice = await instance.balanceOf(alice);
        let balanceOfBob = await instance.balanceOf(bob);
        let balanceOfChris = await instance.balanceOf(chris);
        let balanceOfBroker = await instance.balanceOf(broker);

        assert.equal(balanceOfAlice, 497500);
        assert.equal(balanceOfBob, 499000);
        assert.equal(balanceOfChris, 3500);
        assert.equal(balanceOfBroker, 0);
    });
});