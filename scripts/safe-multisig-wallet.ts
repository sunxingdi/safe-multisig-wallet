import { ethers } from "hardhat";
import { Contract, providers } from "ethers";

import Safe from '@safe-global/protocol-kit';
import { EthersAdapter } from '@safe-global/protocol-kit';
import { MetaTransactionData } from '@safe-global/safe-core-sdk-types'

import {
  SEPOLIA_RPC_URL,
  SAFE_MULTISIG_WALLET_ADDR,
  PRIVATE_KEY_BOB,
  PRIVATE_KEY_ALICE
} from "../hardhat.config";

let provider: providers.JsonRpcProvider;

console.log("ethers version: ", ethers.version)

async function set_network() {

    // 设置网络
    const hre: HardhatRuntimeEnvironment = await import('hardhat');
    const networkName = hre.network.name; // 获取通过命令行传递的 --network 参数值
  
    if (networkName === 'sepolia') {
      provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
      console.log('网络设置：使用远端RPC网络', networkName);
  
    } else if (networkName === 'localhost') {
      provider = new ethers.JsonRpcProvider();
      console.log('网络设置：使用本地网络...');

    }  else {
      throw new Error("网络参数错误，请检查...");
    }
}

async function main() {

  console.log("\n", "设置网络...")
  set_network()

  console.log("\n", "获取账户...")
  const [signerOwner1, signerOwner2] = await ethers.getSigners();
  console.log("\n", "账户列表...")
  console.log("signerOwner1: ", signerOwner1.address) //多签所有者+创建者
  console.log("signerOwner2: ", signerOwner2.address) //多签所有者

  console.log("\n", "创建EthersAdapter实例...")
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signerOwner1
  })

  const safeAddress = SAFE_MULTISIG_WALLET_ADDR;

  console.log("\n", "创建safeSdk对象...")
  const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress })

  // 连接safeSdk对象
  // const safeSdk = await safeSdk.connect({ ethAdapter, safeAddress })

  console.log("\n", "Safe交互...")
  const getSafeAddress = await safeSdk.getAddress()
  console.log("safeAddress: ", getSafeAddress)
  
  const contractVersion = await safeSdk.getContractVersion()
  console.log("contractVersion: ", contractVersion)

  const ownerAddresses = await safeSdk.getOwners()
  console.log("ownerAddresses: ", ownerAddresses)

  const nonce = await safeSdk.getNonce()
  console.log("nonce: ", nonce)

  const threshold = await safeSdk.getThreshold()
  console.log("threshold: ", threshold)

  const chainId = await safeSdk.getChainId()
  console.log("chainId: ", chainId)

  const balance = await safeSdk.getBalance()
  console.log("balance: ", balance)

  const guardAddress = await safeSdk.getGuard()
  console.log("guardAddress: ", guardAddress)

  const moduleAddresses = await safeSdk.getModules()
  console.log("moduleAddresses: ", moduleAddresses)

  const isOwner1 = await safeSdk.isOwner(signerOwner1.address)
  console.log(signerOwner1.address, "is owner?", isOwner1)

  const isOwner2 = await safeSdk.isOwner(signerOwner2.address)
  console.log(signerOwner2.address, "is owner?", isOwner2)

  const TestAddress = "0xBcd4042DE499D14e55001CcbB24a551F3b954096";
  const isOwner3 = await safeSdk.isOwner(TestAddress)
  console.log(TestAddress, "is owner?", isOwner3)  

  console.log("\n", "创建Safe交易(2/2多签)...")
  const safeTransactionData: MetaTransactionData = {
    to: '0x49385401522D8BA7667352b4F84f9E0C1aB8591D',
    value: String(ethers.parseEther("0.01")),
    data: '0x'
  }
  const safeTransaction = await safeSdk.createTransaction({ transactions: [safeTransactionData] })

  // console.log("\n", "等待signerOwner1链下签名...")
  // 代码将等待客户端链下签名完成，await 关键字会使代码暂停，直到签名完成并返回签名后的 signedSafeTransaction 对象。
  // const signedSafeTransaction = await safeSdk.signTransaction(safeTransaction)

  console.log("\n", "等待signerOwner1链上签名...")
  // 创建EthersAdapter实例者与第一个签名者一致，上方已创建实例，无需再创建实例
  // const ethAdapterOwner1 = new EthersAdapter({ ethers, signerOrProvider: signerOwner1 }) 
  // const safeSdk = await safeSdk.connect({ ethAdapter: ethAdapterOwner1, safeAddress })
  const txHash = await safeSdk.getTransactionHash(safeTransaction)
  const approveTxResponse = await safeSdk.approveTransactionHash(txHash)
  let txReceive = await approveTxResponse.transactionResponse?.wait()
  console.log("\ntxReceive:\n", txReceive)
  console.log("\nsignatures:\n", safeTransaction.signatures)
  
  console.log("\n", "等待signerOwner2链上签名...")
  const ethAdapterOwner2 = new EthersAdapter({ ethers, signerOrProvider: signerOwner2 })
  const safeSdk2 = await safeSdk.connect({ ethAdapter: ethAdapterOwner2, safeAddress })
  const executeTxResponse = await safeSdk2.executeTransaction(safeTransaction)
  txReceive = await executeTxResponse.transactionResponse?.wait()
  console.log("\ntxReceive:\n", txReceive)
  console.log("\nsignatures:\n", safeTransaction.signatures)

  console.log("\n", "Safe交易完成...")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.           
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
