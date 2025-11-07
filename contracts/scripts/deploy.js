const hre = require("hardhat");

async function main() {
  console.log("🎨 Deploying ChogArtBadge contract...");

  // Contract parameters
  const name = "Chog Art Badge";
  const symbol = "CHOG";
  const baseTokenURI = "https://ipfs.io/ipfs/"; // Update with your IPFS gateway

  // Deploy contract
  const ChogArtBadge = await hre.ethers.getContractFactory("ChogArtBadge");
  const chogArtBadge = await ChogArtBadge.deploy(name, symbol, baseTokenURI);

  await chogArtBadge.waitForDeployment();

  const address = await chogArtBadge.getAddress();
  console.log("✅ ChogArtBadge deployed to:", address);
  console.log("📝 Contract name:", name);
  console.log("📝 Contract symbol:", symbol);
  console.log("🌐 Base URI:", baseTokenURI);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractAddress: address,
    deployer: (await hre.ethers.getSigners())[0].address,
    timestamp: new Date().toISOString(),
  };

  console.log("\n📋 Deployment Info:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Verify contract (if on testnet/mainnet)
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n⏳ Waiting for block confirmations...");
    await chogArtBadge.deploymentTransaction().wait(5);

    console.log("🔍 Verifying contract...");
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [name, symbol, baseTokenURI],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

