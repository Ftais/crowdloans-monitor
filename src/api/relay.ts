import { ApiOptions } from '@polkadot/api/types'
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { logger } from '../utils/logger'
import { SubstrateConfig } from '../utils/config'
import { KeyringPair } from '@polkadot/keyring/types'

export let relayApi: ApiPromise
export let relayAgent: KeyringPair

export namespace RelayConnection {
  export async function init (relay: SubstrateConfig) {
    relayApi = await ApiPromise.create({
      provider: new WsProvider(relay.endpoint)
    } as ApiOptions)

    relayAgent = new Keyring({ type: 'sr25519' }).addFromMnemonic(relay.agent)

    logger.info(`Connected endpoint: ${relay.endpoint}`)
  }
}
