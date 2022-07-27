import { logger } from './utils/logger'
import { Command } from 'commander'
import { initializeConnections } from './api'
import { CrowdloansService } from './service'
import getConfig from './utils/config'

async function main() {
    const program = new Command();
    program
        .option('-f, --fetch [number] [number]', 'To check contribute in vrf, send start Block Number and end Block Nunber')
        .option('-p, --process', 'Process')
        .parse(process.argv);
    const options = program.opts();
    const command = process.env.COMMAND

    if (command == 'process') options.process = true;
    if(command == 'fetch') options.fetch = true;

    const cfg = getConfig()
    await initializeConnections(cfg)
    const crowdloansService = new CrowdloansService()

    if (options.fetch) {
        let startBlockNumber = process.argv[3]
        let endBlockNumber = process.argv[4]
        if(!startBlockNumber || !endBlockNumber) return
        
        await crowdloansService.checkContributeInVrf(Number(startBlockNumber), Number(endBlockNumber))
    }

    // 后续需要优化监控，目前功能并不完善
    if (options.process) {
        await crowdloansService.run()
    }
    // await new Promise(() => {
    //     setInterval(async () => {
    //         await crowdloansService.run()
    //     }, 30000)
    // })
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    logger.error(e.message)
    // process.exit(1)
  })

process.on('unhandledRejection', err => logger.error(err))