var CrowdliToken = artifacts.require("CrowdliToken");

module.exports = function(deployer) {
  deployer.deploy(CrowdliToken);
};
