# Contracts.Crowdli
Crowdli Token


# Code References
* [1] Context.sol https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/GSN/Context.sol
* [2] Roles.sol https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Roles.sol
* [3] Ownable.sol https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/ownership/Ownable.sol
* [4] SafeMath.sol https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/math/SafeMath.sol
* [5] IERC20 https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol
* [6] IERC1404 https://github.com/simple-restricted-token/simple-restricted-token
* [7] https://openzeppelin.com/
* [8] https://erc1404.org/

## Development Process

Use [Truffle](http://truffleframework.com/docs/) for development and testing.

Install Truffle:

```npm install -g truffle```

Install testing dependencies:

```npm install --save-dev chai chai-bignumber```

Compile Contract:

```truffle compile```

Launch develop network:

```truffle develop```

Or you can use pre-configured *dev* network to connect to any Etherium client on *localhost:7545*: 

```truffle console --network dev```

Publish contract:

```migrate --reset```.

Test:

```test```

Or you can run tests on develop network without pre-launching:

```truffle test```

If you meet *out of gas* issues while testing with ```truffle develop``` or ```truffle test``` then it's recommended
to switch to external client (consider [Ganache](truffleframework.com/ganache/)) instead of built-in one.

See [documentation](http://truffleframework.com/docs/) for further scenarios.