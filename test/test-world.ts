
/**
 * converts amount in yoctos:string to NEAR:number
 * @param yoctos amount expressed in yoctos
 */
export function yton(yoctos: string): number {
  if (yoctos.indexOf(".") !== -1) throw new Error("a yocto string can't have a decimal point: " + yoctos)
  const padded = yoctos.padStart(25, "0") //at least 0.xxx
  const nearsText = padded.slice(0, -24) + "." + padded.slice(-24, -20) //add decimal point. Equivalent to near=yoctos/1e24 and truncate to 4 dec places
  return Number(nearsText)
}

/**
 * converts amount in yoctos:string to NEAR:string
 * keeps all decimals
 * @param yoctos amount expressed in yoctos:string
 */
export function ytonFull(yoctos: string): string {
  let result = (yoctos + "").padStart(25, "0")
  result = result.slice(0, -24) + "." + result.slice(-24)
  return result
}

/**
 * converts amount in NEAR:number to yoctos:string
 * @param near amount in NEAR:number
 */
export function ntoy(near: number): string {
  const asText = near.toFixed(24)
  // remove dec point
  const decPointPos=asText.length-25
  return asText.slice(0,decPointPos)+asText.slice(decPointPos+1)
}


export function getConfig(env:string):Record<string,any> {
  switch (env) {

    case 'production':
    case 'mainnet':
      return {
        networkId: 'mainnet',
        nodeUrl: 'https://rpc.mainnet.near.org',
        contractName: "meta-pool.near",
        walletUrl: 'https://wallet.near.org',
        helperUrl: 'https://helper.mainnet.near.org',
        explorerUrl: 'https://explorer.mainnet.near.org',
      }
    case 'development':
    case 'testnet':
      return {
        networkId: 'testnet',
        nodeUrl: 'https://rpc.testnet.near.org',
        contractName: "meta-v2.pool.testnet",
        walletUrl: 'https://wallet.testnet.near.org',
        helperUrl: 'https://helper.testnet.near.org',
        explorerUrl: 'https://explorer.testnet.near.org',
      }
    case 'local':
      return {
        networkId: 'local',
        nodeUrl: 'http://localhost:3030',
        keyPath: `${process.env.HOME}/.near/validator_key.json`,
        walletUrl: 'http://localhost:4000/wallet',
        contractName: "meta-pool.near",
      }
    case 'test':
    case 'ci':
      return {
        networkId: 'shared-test',
        nodeUrl: 'https://rpc.ci-testnet.near.org',
        contractName: "meta-v2.pool.testnet",
        masterAccount: 'test.near',
      }
    default:
      throw Error(`Unconfigured environment '${env}'`)
  }
}
