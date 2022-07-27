import { ApiOptions } from '@polkadot/api/types'
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { logger } from '../utils/logger'
import { SubstrateConfig } from '../utils/config'
import { KeyringPair } from '@polkadot/keyring/types'
import { u32 } from '@polkadot/types'

export let paraApi: ApiPromise
export let paraAgent: KeyringPair
export let ParallelChainId: number

export namespace ParaConnection {
  export async function init (parallel: SubstrateConfig) {
    paraApi = await ApiPromise.create({
      provider: new WsProvider(parallel.endpoint),
    } as ApiOptions)

    paraAgent = new Keyring({ type: 'sr25519' }).addFromMnemonic(parallel.agent)
    ParallelChainId = (paraApi.consts.bridge.chainId as u32).toNumber()
    logger.info(`Connected endpoint: ${parallel.endpoint}`)
  }
}