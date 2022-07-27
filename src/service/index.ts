import { logger } from '../utils/logger'
import { AuctionInfo, CrowdloansServiceConfig, ExpiredCrowdloan, ParallelCrowdloanStatus, PolkadotCrowdloanStatus } from './types'
// import { paraApi } from '../api/parallel'
import { relayApi } from '../api/relay'
import { ITuple } from '@polkadot/types/types'
import { Option, u32 } from '@polkadot/types'
import { getNumEnv, getStringEnv } from '../utils/getEnv'


export class CrowdloansService {
    checkNum: number=0
    auctionsNum: number=0
    lastAuctionInfo: AuctionInfo|null=null
    public async run (): Promise<void> {
      const relayHeight = ((await relayApi.query.system.number()) as u32).toNumber()
      logger.info(`relay BlockNumber #${relayHeight}`)
      try {
        await new Promise(async() => {
          let interval: any
          const loop = await relayApi.query.auctions.auctionInfo(async (info: any) => {
            if (info.toHuman()) {
              const auctionInfo: AuctionInfo = {
                leasePeriod: info.unwrap()[0].toNumber(),
                endBlock: info.unwrap()[1].toNumber()
              }
              
              if(this.auctionsNum==0 || this.auctionsNum==this.checkNum) { this.lastAuctionInfo = auctionInfo }
              this.auctionsNum++;
              logger.info(`Start new auctions since #${auctionInfo.leasePeriod} end in #${auctionInfo.endBlock} `)
              
              interval = setInterval(async () => {
                await this.process()
              }, getNumEnv('listeningInterval') || 10000)
            } else if(interval) {
              clearInterval(interval)
            }
          })
        })
      } catch (err) {
        logger.error(`CrowdloansService error: ${err}`)
      }
    }

    private async process (): Promise<void> {
      const auctionInfo = await this.getPolkadotAuctionInfo()
      if (!auctionInfo) {
        logger.info(`No auction`)
        return 
      }
      await this.checkVrf(auctionInfo)
    }

    private getEndingPeroid (): number {
      const endingPeriod = relayApi.consts.auctions.endingPeriod as u32
      return endingPeriod.toNumber()
    }

    private async getPolkadotAuctionInfo (): Promise<AuctionInfo | null> {
      const info = (await relayApi.query.auctions.auctionInfo()) as Option<ITuple<[u32, u32]>>
      if (info.isNone) return null

      const auctionInfo: AuctionInfo = {
        leasePeriod: info.unwrap()[0].toNumber(),
        endBlock: info.unwrap()[1].toNumber()
      }
      return auctionInfo
    }

    private calInVrf (auctionInfo: AuctionInfo, relayHeight: number): boolean {
      return relayHeight > (auctionInfo.endBlock + this.getEndingPeroid())
    }

    private async isInVrf (): Promise<boolean> {
      const auctionInfo = await this.getPolkadotAuctionInfo()
      const relayHeight = ((await relayApi.query.system.number()) as u32).toNumber()

      return auctionInfo ? this.calInVrf(auctionInfo, relayHeight) : false
    }

    private async checkVrf (auctionInfo: AuctionInfo) {
      // const networkName = (await relayApi.rpc.system.chain()).toString()
      const relayHeight = await relayApi.query.system.number()
      const endingPeriod = this.getEndingPeroid()
      const vrfStartBlock = Number(BigInt(auctionInfo.endBlock) + BigInt(endingPeriod))
      const isInVrf = await this.isInVrf()
      if (Number(relayHeight.toString()) >= vrfStartBlock) { 
        logger.info(`Network is in vrf. The vrf opened in block #${vrfStartBlock.toString()}, now block#${relayHeight.toString()}`); 
        return
      }

      // 如果已经不处于vrf状态，开始检查vrf区块内有没有发生contribute
      if(!isInVrf && this.auctionsNum-1 != this.checkNum) {
        // @ts-ignore
        await this.checkContributeInVrf(BigInt(this.lastAuctionInfo.endBlock) + BigInt(endingPeriod), Number(relayHeight.toString()))
      }
      const offset = Number(BigInt(vrfStartBlock) - BigInt(relayHeight.toString()))
      logger.info(`The vrf will open in block #${vrfStartBlock.toString()}, #${offset.toString()} from now`)
      return 
    }

    public async checkContributeInVrf(startBlock: number, endBlock: number) {
      if (!startBlock || !endBlock) return false
      logger.info(`start to check block #${startBlock}-#${endBlock} contribute in vrf`)
      this.checkNum++;
      let nowBlock = (await relayApi.query.system.number()).toString()
      if (Number(nowBlock) <= endBlock) {
        logger.info(`End block is bigger then now Block, need wait ${endBlock - Number(nowBlock)}`)
        await new Promise(async (resolve, reject) => {
          const unsubscribe = await relayApi.rpc.chain.subscribeNewHeads((header) => {
            let nowBlock = header.number.toNumber()
            if (nowBlock > endBlock) {
              unsubscribe();
              resolve(null)
            }
          });
        })
        
      }
      let contribute_list: any = []
      let filterEvent: any[] = []
      for(let block=startBlock; block<=endBlock; block++) {
        filterEvent.push(new Promise(async (resolve, reject) => {
          // console.log(`get block #${block}`)
          let blockHash = (await relayApi.rpc.chain.getBlockHash(block)).toString()
          let events = await relayApi.query.system.events.at(blockHash)
          // @ts-ignore
          events.forEach((ev) => {
            const { event: { method, section, data } } = ev
            const [signer, crowdloan, contributed] = data
            // console.log(ev.toHuman());
            if (section == 'crowdloan' && method == 'Contributed') {
              logger.info(`In block #${block} find contribute event, contributed ${contributed} to crowdloan ${crowdloan}, signer: ${signer}`)
              if(signer == getStringEnv('RELAY_SOVEREIGN')) {
                contribute_list.push({signer, contributed, crowdloan})
                logger.warn(`In block #${block}, it was found contributed ${contributed} to our crowdloan ${crowdloan}, signer: ${signer}.`)
              }
            }
          })
          resolve('')
        }))
      }
      await Promise.all(filterEvent)
      logger.warn(`This vrf found that ${contribute_list.length} contributions.`)
    }
}
