interface CrowdloansServiceConfig {
    mode: string
    blacklist: number[]
    thresholdForCrowdloansXcmRequests: number
    blocksBeforeVrfOpen: number
    blocksAfterVrfClose: number
    // 1 day = 14400 blocks
    thresholdForExpiredProjects: number
    // default = 1 day = 14400 blocks
    adjacentBlocksForExpiredProjects: number
}

interface PolkadotCrowdloanReturn {
    depositor: string;
    verifier: null | string;
    deposit: string;
    raised: string;
    end: number;
    cap: string;
    lastContribution: {
      preEnding?: number[];
      ending: number[];
      never?: null;
    };
    firstPeriod: number;
    lastPeriod: number;
    trieIndex: number;
    fundIndex?: number
    alertExpiringSoon: boolean;
}

// interface ParallelCrowdloansReturn {
//     id: number,
//     isValid: boolean,
//     relayEra: string,
//     paraEraStartBlock: number,
//     relayEraLastBlock: number,
//     paraHeight: number,
//     relayHeight: number,
//     checkEraNotMatching: number,
//     alertEraNotMatching: boolean,
//     alertInvalidStartBlock: boolean,
//     createAt: string | Date,
//     updateAt: string | Date,
// }

// enum CrowdloanType {
//     Parallel = 'parallel',
//     Polkadot = 'polkadot',
// }

// eslint-disable-next-line no-unused-vars
enum PolkadotCrowdloanStatus {
    // eslint-disable-next-line no-unused-vars
    Completed = 'Completed',
    // eslint-disable-next-line no-unused-vars
    Ongoing = 'Ongoing',
}

// eslint-disable-next-line no-unused-vars
enum ParallelCrowdloanStatus {
    // eslint-disable-next-line no-unused-vars
    Contributing = 'Contributing',
    // eslint-disable-next-line no-unused-vars
    Succeeded = 'Succeeded',
}

interface PolkadotCrowdloanInfoReturn {
    crowdloanId: number
    fund: PolkadotCrowdloanReturn
    relayHeight: number
    status: PolkadotCrowdloanStatus
}

interface ParallelCrowdloanReturn {
    // Vault ID
    id: number
    // Asset used to represent the shares of currency
    // to be claimed back later on
    ctoken: number
    // Which phase the vault is at
    phase: string
    // Tracks how many coins were contributed on the relay chain
    contributed: string
    /// Tracks how many coins were gathered but not contributed on the relay chain
    pending: string
    /// How we contribute coins to the crowdloan
    contributionStrategy: string
    /// parallel enforced limit
    cap: string
    /// block that vault ends
    endBlock: number
    /// child storage trie index where we store all contributions
    trieIndex: number
}

interface ParallelCrowdloanInfoReturn {
    paraId: number
    leaseStart: number
    leaseEnd: number
    vault: ParallelCrowdloanReturn
    paraHeight: number
}

type AuctionInfoReturn = [number, number]

interface AuctionInfo {
    leasePeriod: number
    endBlock: number
}

type ExpiredCrowdloan = {
    crowdloanId: number
    status: string
    expiredBlocks: number
    leftTime: string
}

export {
  CrowdloansServiceConfig,
  PolkadotCrowdloanReturn,
  PolkadotCrowdloanInfoReturn,
  ParallelCrowdloanReturn,
  ParallelCrowdloanInfoReturn,
  PolkadotCrowdloanStatus,
  ParallelCrowdloanStatus,
  AuctionInfo,
  AuctionInfoReturn,
  ExpiredCrowdloan
}
