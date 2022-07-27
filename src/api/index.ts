import { logger } from '../utils/logger'
import { ParaConnection, ParallelChainId } from './parallel'
import { RelayConnection } from './relay'
import { Config } from '../utils/config'

export async function initializeConnections (configs: Config) {
    logger.info('Starting parallel-monitor')
    await ParaConnection.init(configs.parallel)
    logger.debug(`Parachain connection initialized, Bridge chainId is ${ParallelChainId}`)
    await RelayConnection.init(configs.relay)
}