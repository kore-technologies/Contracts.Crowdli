pragma solidity ^0.6.0;

import "./IERC20.sol";
import "./IERC1404.sol";
import "./math/SafeMath.sol";
import "./access/Roles.sol";
import "./ownership/Ownable.sol";

/**
 * TODO: Comments
 */

contract CrowdliToken is IERC20, IERC1404, Ownable {
    using SafeMath for uint256;
    using Roles for Roles.Role;

    Roles.Role _blocklist;
    Roles.Role _whitelist;

    mapping (address => uint256) private _balances;
    mapping (address => uint256) private _allocated;
    mapping (uint8 => string) private _codes;
    mapping (address => mapping (address => uint256)) private _allowances;
    mapping (address => mapping (bytes32 => uint256)) private _propertyAmountLocks;

    uint256 private _totalSupply;
    bytes32 private _name;
    bytes32 private _symbol;
    uint8 private _decimals;

    uint8 private NO_RESTRICTIONS = 0;
    uint8 private FROM_NOT_IN_WHITELIST_ROLE = 1;
    uint8 private TO_NOT_IN_WHITELIST_ROLE = 2;
    uint8 private FROM_IN_BLACKLIST_ROLE = 3;
    uint8 private TO_IN_BLACKLIST_ROLE = 4;
    uint8 private NOT_ENOUGH_FUNDS = 5;
    uint8 private NOT_ENOUGH_UNALLOCATED_FUNDS = 6;

    constructor() public {
        _symbol = "CRT";
        _name = "CrowdliToken";
        _decimals = 18;
        _codes[0] = "NO_RESTRICTIONS";
        _codes[1] = "FROM_NOT_IN_WHITELIST_ROLE";
        _codes[2] = "TO_NOT_IN_WHITELIST_ROLE";
        _codes[3] = "FROM_IN_BLACKLIST_ROLE";
        _codes[4] = "TO_IN_BLACKLIST_ROLE";
        _codes[5] = "NOT_ENOUGH_FUNDS";
        _codes[6] = "NOT_ENOUGH_UNALLOCATED_FUNDS";
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        return true;
    }

    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].add(addedValue));
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender].sub(subtractedValue, "ERC20: decreased allowance below zero"));
        return true;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        require(detectTransferRestriction(sender,recipient,amount) != NO_RESTRICTIONS, "CROWDLITOKEN: Transferrestriction detected please call detectTransferRestriction(address from, address to, uint256 value) for detailed information");

        _balances[sender] = _balances[sender].sub(amount, "ERC20: transfer amount exceeds balance");
        _balances[recipient] = _balances[recipient].add(amount);
        emit Transfer(sender, recipient, amount);
    }

    function _mint(address account, uint256 amount) internal onlyOwner {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint256 amount) internal onlyOwner {
        require(account != address(0), "ERC20: burn from the zero address");

        _balances[account] = _balances[account].sub(amount, "ERC20: burn amount exceeds balance");
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function burnFrom(address account, uint256 amount, uint8 code) public onlyOwner {
        _burn(account, amount);
        _approve(account, _msgSender(), _allowances[account][_msgSender()].sub(amount, "ERC20: burn amount exceeds allowance"));
        emit Burn(account, amount, code);
    }

    function mintTo(address account, uint256 amount, uint8 code) public onlyOwner {
        _mint(account, amount);
        _approve(account, _msgSender(), _allowances[account][_msgSender()].add(amount));
        emit Mint(account, amount, code);
    }

    function messageForCode(uint8 eventCode) public view returns (string memory){
        return _codes[eventCode];
    }

    function messageForTransferRestriction(uint8 restrictionCode) public view override returns (string memory){
        return _codes[restrictionCode];
    }

    function detectTransferRestriction(address from, address to, uint256 value) public view override returns (uint8){
        if(!_whitelist.hasRole(from)){
           return FROM_NOT_IN_WHITELIST_ROLE;
        } else if(!_whitelist.hasRole(to)){
            return TO_NOT_IN_WHITELIST_ROLE;
        } else if(_blocklist.hasRole(from)){
            return FROM_IN_BLACKLIST_ROLE;
        }  else if(_blocklist.hasRole(to)){
           return TO_IN_BLACKLIST_ROLE;
        } else if(_balances[from] > value){
           return NOT_ENOUGH_FUNDS;
        }  else if(_balances[from].sub(_allocated[from]) < value){
           return NOT_ENOUGH_UNALLOCATED_FUNDS;
        } else {
           return NO_RESTRICTIONS;
        }
    }

    function addWhitelistRoles(address[] memory whitelistedAddresses) public onlyOwner {
        for(uint i=0; i< whitelistedAddresses.length; i++){
            _whitelist.addRole(whitelistedAddresses[i]);
        }
    }

    function removeWhitelistRole(address whitelistedAddress) public onlyOwner {
        require(_balances[whitelistedAddress] == 0, "CROWDLITOKEN: To remove someone from the whitelist the balance have to be 0");
        _whitelist.removeRole(whitelistedAddress);
    }

    function addBlockRole(address blockedAddress, uint8 code) public onlyOwner {
        _blocklist.addRole(blockedAddress);
        emit Block(blockedAddress, code);
    }

    function removeBlockRole(address blockedAddress) public onlyOwner {
        _blocklist.removeRole(blockedAddress);
    }

    function allocatedTokens(address owner) public view returns (uint256){
	    return _allocated[owner];
    }

    function propertyLock(address owner, bytes32 propertyAddress) public view onlyOwner returns (uint256) {
        return _propertyAmountLocks[owner][propertyAddress];
    }

    function setCode(uint8 code, string memory codeText) public onlyOwner {
        require(code > 100, "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        _codes[code] = codeText;
    }

    function removeCode(uint8 code) public onlyOwner {
        require(code > 100, "ERC1404: Codes till 100 are reserverd for the SmartContract internals");

        delete _codes[code];
    }

    function allocateAmountFromAddressForProperty(address owner, bytes32 propertyAddress, uint256 amount) internal onlyOwner {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(bytes32(propertyAddress).length == 32, "CROWDLITOKEN: propertyAddress needs a length of 32 bytes");

        _allocated[owner] = _allocated[owner].add(amount);
	    _propertyAmountLocks[owner][propertyAddress] = _propertyAmountLocks[owner][propertyAddress].add(amount);
    }

    function unallocatePropertyFromAddress(address owner, bytes32 propertyAddress) internal onlyOwner {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(bytes32(propertyAddress).length == 32, "CROWDLITOKEN: propertyAddress needs a length of 32 bytes");

        _allocated[owner] = _allocated[owner].sub(_propertyAmountLocks[owner][propertyAddress]);
	    delete _propertyAmountLocks[owner][propertyAddress];
    }

    event Burn(address indexed from, uint256 value, uint8 code);
    event Mint(address indexed to, uint256 value, uint8 code);
    event Block(address indexed blockAddress, uint8 code);
}
