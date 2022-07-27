import { getStringEnv } from "./getEnv"

export interface SubstrateConfig {
    agent: string,
    endpoint: string,
}

export interface Config {
    parallel: SubstrateConfig
    relay: SubstrateConfig
}

const getConfig = (): Config => ({
    parallel: {
      agent: getStringEnv('AGENT_PARALLEL') || '//Dave',
      endpoint: getStringEnv('PARALLEL_ENDPOINT') || 'wss://regnet-rpc.parallel.fi'
    },
    relay: {
      agent: getStringEnv('AGENT_RELAY') || '//Dave',
      endpoint: getStringEnv('RELAY_ENDPOINT') || 'wss://regnet-relay-rpc.parallel.fi'
    }
  })
  
export default getConfig