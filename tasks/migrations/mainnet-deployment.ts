import { task } from "@nomiclabs/buidler/config";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";

import { eContractid, eEthereumNetwork } from "../../helpers/types";
import { checkVerification } from "../../helpers/etherscan-verification";
import {
  getAaveAdminPerNetwork,
  getLendTokenPerNetwork,
} from "../../helpers/constants";

// Define the arguments and flag types for clarity in the action function
interface MainDeploymentArgs {
  verify?: boolean; // Corresponds to the flag
}

/**
 * Task for deploying and configuring Aave migration contracts on a mainnet environment.
 * This sets up AaveToken, LendToAaveMigrator, and their upgradeability proxies.
 */
task("main-deployment", "Deployment and setup for Aave Token mainnet migration.")
  .addFlag(
    "verify",
    "If set, contracts (AaveToken, Migrator, Proxy) will be verified on Etherscan."
  )
  .setAction(async (
    { verify }: MainDeploymentArgs, 
    localBRE: BuidlerRuntimeEnvironment
  ) => {
    // Ensure BRE is correctly set up for the environment
    const BRE: BuidlerRuntimeEnvironment = await localBRE.run("set-bre");
    const network = BRE.network.name as eEthereumNetwork;

    // --- 1. Get Core Configuration ---
    const aaveAdmin = getAaveAdminPerNetwork(network);
    const lendTokenAddress = getLendTokenPerNetwork(network);

    // --- 2. Admin Validation (Security Check) ---
    if (!aaveAdmin) {
      throw new Error(
        `Aave Admin address is mandatory for deploying on network '${network}'. ` +
        `Check your configuration file (${network} entry) for the required admin address.`
      );
    }
    console.log(`\nDeployment Admin Address: ${aaveAdmin}`);
    console.log(`LEND Token Address: ${lendTokenAddress}`);


    // --- 3. Etherscan Verification Check ---
    if (verify) {
      console.log("Etherscan verification is ENABLED. Checking prerequisites...");
      // Check needed environments (e.g., API Key) to prevent failed deployments.
      checkVerification();
    } else {
      console.log("Etherscan verification is DISABLED.");
    }
    
    // --- 4. Deployment Steps (Implementation Contracts) ---

    // Deploy AaveToken Implementation
    console.log(`\n--- Deploying ${eContractid.AaveToken} ---`);
    await BRE.run(`deploy-${eContractid.AaveToken}`, { verify });

    // Deploy LendToAaveMigrator Implementation
    console.log(`\n--- Deploying ${eContractid.LendToAaveMigrator} ---`);
    await BRE.run(`deploy-${eContractid.LendToAaveMigrator}`, {
      lendTokenAddress,
      verify,
    });

    // --- 5. Initialization Steps (Proxy Contracts) ---
    // Note: The deployment task should handle the Proxy contract deployment implicitly.

    // Initialize the AaveToken Proxy
    console.log(`\n--- Initializing ${eContractid.AaveToken} Proxy ---`);
    await BRE.run(`initialize-${eContractid.AaveToken}`, {
      admin: aaveAdmin,
      // CRITICAL: Ensure only the proxy is initialized, not the implementation.
      onlyProxy: true,
    });

    // Initialize the LendToAaveMigrator Proxy
    console.log(`\n--- Initializing ${eContractid.LendToAaveMigrator} Proxy ---`);
    await BRE.run(`initialize-${eContractid.LendToAaveMigrator}`, {
      admin: aaveAdmin,
      // CRITICAL: Ensure only the proxy is initialized, not the implementation.
      onlyProxy: true,
    });

    // --- 6. Finalization ---
    console.log(
      "\n✨ Finished the deployment and proxy initialization of the Aave Token Mainnet Environment. ✨"
    );
  });
