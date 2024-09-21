import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("Deploying LidoAPYPerpetual contract...");
  console.log("Deployer address:", deployer);

  const lidoAPYPerpetual = await deploy('LidoAPYPerpetual', {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });

  console.log("LidoAPYPerpetual deployed to:", lidoAPYPerpetual.address);
};

export default func;
func.tags = ['LidoAPYPerpetual'];