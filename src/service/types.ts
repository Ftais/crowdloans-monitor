interface AuctionInfo {
    leasePeriod: number
    endBlock: number
}

enum ChildStorageKind {
    // eslint-disable-next-line
    Pending = 'pending',
    // eslint-disable-next-line
    Flying = 'flying',
    // eslint-disable-next-line
    Contributed = 'contributed'
}

export {
  AuctionInfo,
  ChildStorageKind
}