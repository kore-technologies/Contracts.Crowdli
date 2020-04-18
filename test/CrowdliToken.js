const truffleAssert = require('truffle-assertions');
const CrowdliToken = artifacts.require('CrowdliToken');

contract("Crowdli Token Test", async accounts => {
    const owner = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    const chris = accounts[3];
    const broker = accounts[4];
    let countTransferEvents = 0;
    let countAllocateEvents = 0;
    let countUnallocateEvents = 0;
    let countBurnEvents = 0;
    let countMintEvents = 0;
    let countBlockEvents = 0;
    let countUnblockEvents = 0;
    let countApprovalEvents = 0;

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
        let tx = await instance.mintTo(alice, 1000000, 0);
        truffleAssert.eventEmitted(tx, 'Mint', (ev) => {
            countMintEvents++;
            return ev.to == alice && ev.value == 1000000 && ev.code == 0;
        });
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
        let tx = await instance.transfer(bob, 250000, {
            from : alice
        });
        truffleAssert.eventEmitted(tx, 'Transfer', (ev) => {
            countTransferEvents++;
            return ev.from == alice && ev.to == bob && ev.value == 250000;
        });
        let balanceOfAlice = await instance.balanceOf(alice);
        let balanceOfBob = await instance.balanceOf(bob);
        assert.equal(balanceOfAlice, 750000);
        assert.equal(balanceOfBob, 250000);
    });

    it("Transfer should emit a Transfer Event", async () => {
        let instance = await CrowdliToken.deployed();

        let tx = await instance.transfer(bob, 250000, {
            from : alice
        });

        truffleAssert.eventEmitted(tx, 'Transfer', (ev) => {
            countTransferEvents++;
            return ev.from == alice && ev.to == bob && ev.value == 250000;
        });
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

    it("Broker Check: Approve 3500 tokens with bob for broker and send these Tokens to chris with broker on behalf of bob", async () => {
        let instance = await CrowdliToken.deployed();
        await instance.addUserListToKycRole([chris,broker]);

        let approveTx = await instance.approve(broker, 2500,{
            from: bob
        });
        truffleAssert.eventEmitted(approveTx, 'Approval', (ev) => {
            countApprovalEvents++;
            return ev.owner == bob && ev.spender == broker && ev.value == 2500;
        });

        let approvedTokens = await instance.allowance(bob,broker);
        assert.equal(approvedTokens, 2500);

        let tx = await instance.transferFrom(bob, chris, 2500, {
            from:broker
        });

        truffleAssert.eventEmitted(tx, 'Transfer', (ev) => {
            countTransferEvents++;
            return ev.from == bob && ev.to == chris && ev.value == 2500;
        });

        truffleAssert.eventEmitted(tx, 'Approval', (ev) => {
            countApprovalEvents++;
            return ev.owner == bob && ev.spender == broker && ev.value == 0;
        });

        let approveTxA = await instance.approve(broker, 2500,{
            from: bob
        });
        truffleAssert.eventEmitted(approveTxA, 'Approval', (ev) => {
            countApprovalEvents++;
            return ev.owner == bob && ev.spender == broker && ev.value == 2500;
        });

        let increaseTx = await instance.increaseAllowance(broker, 1500,{
            from:bob
        });
        truffleAssert.eventEmitted(increaseTx, 'Approval', (ev) => {
            countApprovalEvents++;
            return ev.owner == bob && ev.spender == broker && ev.value == 4000;
        });

        let approvedTokensAfterIncrease = await instance.allowance(bob,broker);
        assert.equal(approvedTokensAfterIncrease, 4000);

        let decreaseTx = await instance.decreaseAllowance(broker, 3000,{
            from:bob
        });
        truffleAssert.eventEmitted(decreaseTx, 'Approval', (ev) => {
            countApprovalEvents++;
            return ev.owner == bob && ev.spender == broker && ev.value == 1000;
        });

        let approvedTokensAfterDecrease = await instance.allowance(bob,broker);
        assert.equal(approvedTokensAfterDecrease, 1000);

        await truffleAssert.reverts(instance.transferFrom(bob, chris, 2500,{
            from:broker
        }), "ERC20: transfer amount exceeds allowance");

        let txA = await instance.transferFrom(bob, chris, 1000, {
            from:broker
        });

        truffleAssert.eventEmitted(txA, 'Transfer', (ev) => {
            countTransferEvents++;
            return ev.from == bob && ev.to == chris && ev.value == 1000;
        });

        truffleAssert.eventEmitted(txA, 'Approval', (ev) => {
            countApprovalEvents++;
            return ev.owner == bob && ev.spender == broker && ev.value == 0;
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
        await truffleAssert.reverts(instance.addTransferBlock(alice,508), "CROWDLITOKEN: The code does not exist");
        let blockTx = await instance.addTransferBlock(alice,2);
        truffleAssert.eventEmitted(blockTx, 'Block', (ev) => {
            countBlockEvents++;
            return ev.blockAddress == alice && ev.code == 2;
        });

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
        let unblockTx = await instance.removeTransferblock(alice,2);
        truffleAssert.eventEmitted(unblockTx, 'Unblock', (ev) => {
            countUnblockEvents++;
            return ev.unblockAddress == alice && ev.code == 2;
        });

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

        let blockTxA = await instance.addTransferBlock(bob,3);
        truffleAssert.eventEmitted(blockTxA, 'Block', (ev) => {
            countBlockEvents++;
            return ev.blockAddress == bob && ev.code == 3;
        });
        let transferRestictionBob = await instance.detectTransferRestriction(alice, bob, 2500);
        assert.equal(transferRestictionBob, 4);

        let CODEBOB = await instance.messageForTransferRestriction(transferRestictionBob);
        assert.equal(CODEBOB, 'TO_IN_TRANSFERBLOCK_ROLE');

        await truffleAssert.reverts(instance.transfer(bob, 2500, {
            from : alice
        }), "CROWDLITOKEN: Transferrestriction detected please call detectTransferRestriction(address from, address to, uint256 value) for detailed information");

        await truffleAssert.reverts(instance.removeTransferblock(bob,520), "CROWDLITOKEN: The code does not exist");
        let unblockTxA = await instance.removeTransferblock(bob,4);
        truffleAssert.eventEmitted(unblockTxA, 'Unblock', (ev) => {
            countUnblockEvents++;
            return ev.unblockAddress == bob && ev.code == 4;
        });

        let transferRestictionBobAfterRemove = await instance.detectTransferRestriction(alice, bob, 2500);
        assert.equal(transferRestictionBobAfterRemove, 0);

        let tx = await instance.transfer(bob, 2500, {
            from : alice
        });

        truffleAssert.eventEmitted(tx, 'Transfer', (ev) => {
            countTransferEvents++;
            return ev.from == alice && ev.to == bob && ev.value == 2500;
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

    it("Allocate and Unallocate Crowdlitokens to a Property", async () => {
        let instance = await CrowdliToken.deployed();
        await truffleAssert.reverts(instance.allocateAmountFromAddressForProperty(chris,"0x2575704BdF16ABbd6249a21652Cc59333c33Db87",4500), "CrowdliToken: Not enough unallocated tokens to allocate the requested amount");
        let allocTx = await instance.allocateAmountFromAddressForProperty(chris,"0x2575704BdF16ABbd6249a21652Cc59333c33Db87",3000);
        truffleAssert.eventEmitted(allocTx, 'Allocate', (ev) => {
            countAllocateEvents++;
            return ev.owner == chris && ev.propertyAddress == "0x2575704bdf16abbd6249a21652cc59333c33db87000000000000000000000000" && ev.amount == 3000;
        });
        let allocatedBalanceOfChris = await instance.propertyLock(chris,"0x2575704BdF16ABbd6249a21652Cc59333c33Db87");
        let balanceOfChris = await instance.balanceOf(chris);
        assert.equal(allocatedBalanceOfChris, 3000);
        assert.equal((balanceOfChris-allocatedBalanceOfChris), 500);

        let totalAllocatedTokensOfChris = await instance.allocatedTokens(chris);
        assert.equal(totalAllocatedTokensOfChris, 3000);

        await truffleAssert.reverts(instance.allocateAmountFromAddressForProperty(chris,"0x2575704BdF16ABbd6249a21652Cc59333c33Db87",501), "CrowdliToken: Not enough unallocated tokens to allocate the requested amount");
        await truffleAssert.reverts(instance.unallocatePropertyFromAddress(chris,"0x3575704BdF16ABbd6249a21652Cc59333c33Db87",1), "CROWDLITOKEN: The property has no allocated tokens for that address");
        await truffleAssert.reverts(instance.unallocatePropertyFromAddress(chris,"0x2575704BdF16ABbd6249a21652Cc59333c33Db87",3005), "CROWDLITOKEN: There are not enough allocated tokens to unallocate the requested amount");

        let unallocTx = await instance.unallocatePropertyFromAddress(chris,"0x2575704BdF16ABbd6249a21652Cc59333c33Db87",1510);
        truffleAssert.eventEmitted(unallocTx, 'Unallocate', (ev) => {
            countUnallocateEvents++;
            return ev.owner == chris && ev.propertyAddress == "0x2575704bdf16abbd6249a21652cc59333c33db87000000000000000000000000" && ev.amount == 1510;
        });

        let allocatedBalanceOfChrisAfter = await instance.propertyLock(chris,"0x2575704BdF16ABbd6249a21652Cc59333c33Db87");

        assert.equal(allocatedBalanceOfChrisAfter, 1490);
        assert.equal((balanceOfChris-allocatedBalanceOfChrisAfter), 2010);

        await truffleAssert.reverts(instance.transfer(bob, 2020, {
            from : chris
        }), "CROWDLITOKEN: Transferrestriction detected please call detectTransferRestriction(address from, address to, uint256 value) for detailed information");

        let unnalocTxA = await instance.unallocatePropertyFromAddress(chris,"0x2575704BdF16ABbd6249a21652Cc59333c33Db87",10);
        truffleAssert.eventEmitted(unnalocTxA, 'Unallocate', (ev) => {
            countUnallocateEvents++;
            return ev.owner == chris && ev.propertyAddress == "0x2575704bdf16abbd6249a21652cc59333c33db87000000000000000000000000" && ev.amount == 10;
        });

        let tx = await instance.transfer(bob, 2020, {
            from : chris
        });

        truffleAssert.eventEmitted(tx, 'Transfer', (ev) => {
            countTransferEvents++;
            return ev.from == chris && ev.to == bob && ev.value == 2020;
        });
    });

    it("Check KYC and Burn with Restrictions", async () => {
        let instance = await CrowdliToken.deployed();
        await truffleAssert.reverts(instance.removeUserFromKycRole(chris), "CROWDLITOKEN: To remove someone from the whitelist the balance have to be 0");
        await truffleAssert.reverts(instance.burn(chris,3500,1), "CROWDLITOKEN: There are token allocations, its not allowed to burn tokens if there are token allocations");

        let allocatedBalanceOfChris = await instance.propertyLock(chris,"0x2575704BdF16ABbd6249a21652Cc59333c33Db87");
        let unallocTxB = await instance.unallocatePropertyFromAddress(chris,"0x2575704BdF16ABbd6249a21652Cc59333c33Db87",allocatedBalanceOfChris);
        truffleAssert.eventEmitted(unallocTxB, 'Unallocate', (ev) => {
            countUnallocateEvents++;
            return ev.owner == chris && ev.propertyAddress == "0x2575704bdf16abbd6249a21652cc59333c33db87000000000000000000000000" && ev.amount == allocatedBalanceOfChris.toNumber();
        });

        await truffleAssert.reverts(instance.burn(chris,3500,1), "ERC20: burn amount exceeds balance");
        let burnTx = await instance.burn(chris,1480,1);
        truffleAssert.eventEmitted(burnTx, 'Burn', (ev) => {
            countBurnEvents++;
            return ev.from == chris && ev.value == 1480 && ev.code == 1;
        });

        let balanceOfAlice = await instance.balanceOf(alice);
        let balanceOfBobA = await instance.balanceOf(bob);
        let balanceOfChris = await instance.balanceOf(chris);
        let balanceOfBroker = await instance.balanceOf(broker);

        assert.equal(balanceOfAlice, 497500);
        assert.equal(balanceOfBobA, 501020);
        assert.equal(balanceOfChris, 0);
        assert.equal(balanceOfBroker, 0);

        let burnTxA = await instance.burn(bob,501020,0);
        truffleAssert.eventEmitted(burnTxA, 'Burn', (ev) => {
            countBurnEvents++;
            return ev.from == bob && ev.value == 501020 && ev.code == 0;
        });
        let balanceOfBobB = await instance.balanceOf(bob);
        assert.equal(balanceOfBobB, 0);

        let totalSupply = await instance.totalSupply();
        assert.equal(totalSupply, 497500);
    });

    it("Check Transfer Events", async () => {
        assert.equal(countTransferEvents, 6);
    });

    it("Check Allocate Events", async () => {
        assert.equal(countAllocateEvents, 1);
    });

    it("Check Unallocate Events", async () => {
        assert.equal(countUnallocateEvents, 3);
    });

    it("Check Burn Events", async () => {
        assert.equal(countBurnEvents, 2);
    });

    it("Check Mint Events", async () => {
        assert.equal(countMintEvents, 1);
    });

    it("Check Block Events", async () => {
        assert.equal(countBlockEvents, 2);
    });

    it("Check Unblock Events", async () => {
        assert.equal(countUnblockEvents, 2);
    });

    it("Check Approval Events", async () => {
        assert.equal(countApprovalEvents, 6);
    });
});