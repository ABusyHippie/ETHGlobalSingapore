import {
  APYUpdated as APYUpdatedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PositionClosed as PositionClosedEvent,
  PositionLiquidated as PositionLiquidatedEvent,
  PositionOpened as PositionOpenedEvent,
  TokenAdded as TokenAddedEvent,
  TokenRemoved as TokenRemovedEvent
} from "../generated/LidoAPYPerpetual.sol/LidoAPYPerpetual.sol"
import {
  APYUpdated,
  OwnershipTransferred,
  PositionClosed,
  PositionLiquidated,
  PositionOpened,
  TokenAdded,
  TokenRemoved
} from "../generated/schema"

export function handleAPYUpdated(event: APYUpdatedEvent): void {
  let entity = new APYUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.newAPY = event.params.newAPY

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePositionClosed(event: PositionClosedEvent): void {
  let entity = new PositionClosed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.trader = event.params.trader
  entity.token = event.params.token
  entity.isLong = event.params.isLong
  entity.profit = event.params.profit

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePositionLiquidated(event: PositionLiquidatedEvent): void {
  let entity = new PositionLiquidated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.trader = event.params.trader
  entity.token = event.params.token
  entity.isLong = event.params.isLong
  entity.collateral = event.params.collateral

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePositionOpened(event: PositionOpenedEvent): void {
  let entity = new PositionOpened(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.trader = event.params.trader
  entity.token = event.params.token
  entity.isLong = event.params.isLong
  entity.size = event.params.size
  entity.collateral = event.params.collateral
  entity.leverage = event.params.leverage
  entity.entryAPY = event.params.entryAPY

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTokenAdded(event: TokenAddedEvent): void {
  let entity = new TokenAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.token = event.params.token

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTokenRemoved(event: TokenRemovedEvent): void {
  let entity = new TokenRemoved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.token = event.params.token

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
