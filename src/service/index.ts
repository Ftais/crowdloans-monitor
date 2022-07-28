import { logger } from '../utils/logger'
import { AuctionInfo, ChildStorageKind } from './types'
import { Keyring } from '@polkadot/api'
import { paraApi } from '../api/parallel'
import { relayApi } from '../api/relay'
import { ITuple } from '@polkadot/types/types'
import { Option, u32 } from '@polkadot/types'
import { getNumEnv, getStringEnv } from '../utils/getEnv'
const fs = require('fs');
const path = require('path')
const { u8aConcat, u8aToHex } = require('@polkadot/util');
const { blake2AsU8a, encodeAddress } = require('@polkadot/util-crypto');


export class CrowdloansService {
  checkNum: number=0
  auctionsNum: number=0
  lastAuctionInfo: AuctionInfo|null=null
  keyring: Keyring=new Keyring({ type: 'sr25519', ss58Format: 42 })
  RELAY_SOVEREIGN: string|undefined=getStringEnv('RELAY_SOVEREIGN')
  public async run (): Promise<void> {
    if (!this.RELAY_SOVEREIGN) logger.error(`please fill RELAY_SOVEREIGN`)
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

  public async checkRelayContributeInVrf(startBlock: number, endBlock: number) {
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
        const contributeEvent = await this.filterRelayContributeEvent(block)
        if (contributeEvent) {
          contribute_list.push(contributeEvent)
          logger.warn(`In block #${block}, it was found contributed ${contributeEvent.contributed} to our crowdloan ${contributeEvent.crowdloan}, signer: ${contributeEvent.signer}.`)
        }
        resolve(contributeEvent)
      }))
    }
    await Promise.all(filterEvent)
    logger.warn(`This vrf found that ${contribute_list.length} contributions.`)
  }

  public async checkParaContributeInVrf(startBlock: number, endBlock: number) {
    if (!startBlock || !endBlock) return false
    logger.info(`start to check block #${startBlock}-#${endBlock} contribute in vrf`)
    this.checkNum++;
    let nowBlock = (await paraApi.query.system.number()).toString()
    if (Number(nowBlock) <= endBlock) {
      logger.info(`End block is bigger then now Block, need wait ${endBlock - Number(nowBlock)}`)
      await new Promise(async (resolve, reject) => {
        const unsubscribe = await paraApi.rpc.chain.subscribeNewHeads((header) => {
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
        let blockHash = (await paraApi.rpc.chain.getBlockHash(block)).toString()
        let events = await paraApi.query.system.events.at(blockHash)
        // @ts-ignore
        for (let ev of events) {
          const { event: { method, section, data } } = ev
          const [crowdloan, vault, signer, contributed] = data
          // console.log(ev.toHuman());
          if (section == 'crowdloans' && method == 'VaultDoContributing') {
            logger.warn(`In block #${block} find contribute event, contributed ${contributed} to crowdloan ${crowdloan}, signer: ${signer}`)
            // @ts-ignore
            const relayBlock = (await paraApi.query.parachainSystem.validationData.at(blockHash)).toHuman().relayParentNumber.replace(/,/g, "")
            const contributeEvent = await this.filterRelayContributeEvent(relayBlock)
            if (contributeEvent){
              logger.warn(`In parallel block #${block} relay block #${relayBlock} find same contribute ${contributeEvent}`) 
            } else {
              logger.warn(`In parallel block #${block} relay block #${relayBlock} not find contribute`) 
            }
            contribute_list.push({signer, contributed, crowdloan})
          }
        }
        resolve('')
      }))
    }
    await Promise.all(filterEvent)
    logger.warn(`This vrf found that ${contribute_list.length} contributions.`)
  }

  public async filterRelayContributeEvent(block: number|string) {
    // console.log(`get block #${block}`)
    let blockHash = (await relayApi.rpc.chain.getBlockHash(block)).toString()
    let events = await relayApi.query.system.events.at(blockHash)
    // @ts-ignore
    for (let ev of events) {
      const { event: { method, section, data } } = ev
      const [signer, crowdloan, contributed] = data
      // console.log(ev.toHuman());
      if (section == 'crowdloan' && method == 'Contributed') {
        logger.info(`In block #${block} find contribute event, contributed ${contributed} to crowdloan ${crowdloan}, signer: ${signer}`)
        if (signer == getStringEnv('RELAY_SOVEREIGN')) {
          return { signer, contributed, crowdloan }
        }
      }
    }
    return 
  }

  public createChildKey(fundIndex: any) {
    return u8aToHex(
        u8aConcat(
            ':child_storage:default:',
            blake2AsU8a(
                u8aConcat('crowdloan', fundIndex.toU8a())
            )
        )
      );
  }

  public createVaultChildKey (trieIndex: u32, kind: ChildStorageKind) {
    const prefix = 'crowdloan:' + kind.valueOf()
    // logger.debug(`childstorage prefix: ${prefix}`)
  
    return u8aToHex(
      u8aConcat(':child_storage:default:', blake2AsU8a(u8aConcat(prefix, trieIndex.toU8a())))
    )
  }

  public async dumpRelayCrowdloan(paraId: string, blockNumber?: string|number|null) {
    if (!paraId || !getStringEnv('RELAY_SOVEREIGN')) return 
    logger.info(`start to dump crowdloan`)
    // const paraId = 30
    let blockHash = blockNumber ? (await relayApi.rpc.chain.getBlockHash(blockNumber)).toString() : null
    const fund = blockHash ? await relayApi.query.crowdloan.funds.at(blockHash, paraId) : await relayApi.query.crowdloan.funds(paraId);
    // @ts-ignore
    const fundIndex = fund.unwrap().fundIndex;
    const childKey = this.createChildKey(fundIndex);
    // @ts-ignore
    let keys = blockHash ? await relayApi.rpc.childstate.getKeys(childKey, '0x', blockHash) : await relayApi.rpc.childstate.getKeys(childKey, '0x')
    // @ts-ignore
    const ss58Keys = keys.map(k => encodeAddress(k))
    // @ts-ignore
    const values = await Promise.all(keys.map(k => blockHash ? relayApi.rpc.childstate.getStorage(childKey, k, blockHash) : relayApi.rpc.childstate.getStorage(childKey, k)));
    // @ts-ignore
    const relaySovereign = this.keyring.addFromAddress(this.RELAY_SOVEREIGN).address
    let contributions = values.map((v, idx) => {
      const data: any[2] = relayApi.createType('(Balance, Vec<u8>)', v.unwrap()).toJSON()
      return {
        account: ss58Keys[idx],
        amount: data[0],
        referralCode: data[1]
      }
    }).filter(contribute => contribute.account==relaySovereign);

    if (!contributions) {
      logger.warn(`dump crowdloan over, not find our contribute`)
      return 0
    }

    const jsonStr = JSON.stringify(contributions, undefined, 2);
    
    await fs.writeFileSync(path.join(path.resolve(".") + '/dump_relay_data.json'), jsonStr, {encoding: 'utf-8'});
    logger.warn(`dump crowdloan over, total amount is ${contributions[0].amount}`)
    return contributions[0].amount
  }

  public async dumpParaCrowdloan(paraId: string, leaseStart: string|number, leaseEnd: string|number, blockNumber?: string|number|null) {
    if (!paraId || !leaseStart || !leaseEnd) return 
    logger.info(`start to dump crowdloan`)
    // const paraId = 30
    let blockHash = blockNumber ? (await paraApi.rpc.chain.getBlockHash(blockNumber)).toString() : undefined
    const vault = blockHash ? await paraApi.query.crowdloans.vaults.at(blockHash, paraId, leaseStart, leaseEnd) : await paraApi.query.crowdloans.vaults(paraId, leaseStart, leaseEnd)
    if (!vault) {
      logger.error(`Failed to fetch crowdloan ${paraId}`)
      return 
    }
    logger.info(vault.toJSON())
    // @ts-ignore
    const trieIndex = paraApi.createType('u32', vault.toJSON().trieIndex)

    const pendingChildKeys = this.createVaultChildKey(
      trieIndex,
      ChildStorageKind.Pending
    )
    const flyingChildKeys = this.createVaultChildKey(
      trieIndex,
      ChildStorageKind.Flying
    )
    const contributedChildKeys = this.createVaultChildKey(
      trieIndex,
      ChildStorageKind.Contributed
    )
    logger.debug(`flyingKeys: ${flyingChildKeys}`)
    logger.debug(`pendingKeys: ${pendingChildKeys}`)
    logger.debug(`contributedKeys: ${contributedChildKeys}`)
    
    await this.processChildKey(flyingChildKeys, 'flying.json', blockHash)
    await this.processChildKey(pendingChildKeys, 'pending.json', blockHash)
    await this.processChildKey(contributedChildKeys, 'contributed.json', blockHash)
    logger.info(`dump crowdloan over`)
  }

  public async processChildKey (
    childKeys: string | Uint8Array,
    filename: string,
    blockHash?: string|undefined
  ) {
    const keys = blockHash ? await paraApi.rpc.childstate.getKeys(childKeys, '0x', blockHash) : await paraApi.rpc.childstate.getKeys(childKeys, '0x')
    const ss58Keys = keys.map((k) => encodeAddress(k))
    const values = await Promise.all(
      keys.map((k) =>
        blockHash ? paraApi.rpc.childstate.getStorage(childKeys, k, blockHash) : paraApi.rpc.childstate.getStorage(childKeys, k)
      )
    )
    const contributions = values.map((v, idx) => ({
      from: ss58Keys[idx],
      data: paraApi.createType('(Balance, Vec<u8>)', v.unwrap()).toJSON()
    }))
    logger.debug(`${filename.split('.')[0]}.len = ${contributions.length}`)
    let totalAmount = BigInt(0)
    contributions.forEach((item) => {
      const amount = Number((item.data as unknown as [number, string])[0])
      // logger.debug(`amount is ${amount}`)
      totalAmount = totalAmount + BigInt(amount)
    })
    logger.debug(`total amount is ${totalAmount}`)
    const jsonStr = JSON.stringify(contributions, undefined, 2)
    fs.writeFileSync(path.resolve(".") + `/${filename}`, jsonStr, {
      encoding: 'utf-8'
    })
  }
}
