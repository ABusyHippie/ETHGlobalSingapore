import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  APYUpdated,
  OwnershipTransferred,
  PositionClosed,
  PositionLiquidated,
  PositionOpened,
  TokenAdded,
  TokenRemoved
} from "../generated/LidoAPYPerpetual.sol/LidoAPYPerpetual.sol"

export function createAPYUpdatedEvent(newAPY: BigInt): APYUpdated {
  let apyUpdatedEvent = changetype<APYUpdated>(newMockEvent())

  apyUpdatedEvent.parameters = new Array()

  apyUpdatedEvent.parameters.push(
    new ethereum.EventParam("newAPY", ethereum.Value.fromUnsignedBigInt(newAPY))
  )

  return apyUpdatedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent = changetype<OwnershipTransferred>(
    newMockEvent()
  )

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPositionClosedEvent(
  trader: Address,
  token: Address,
  isLong: boolean,
  profit: BigInt
): PositionClosed {
  let positionClosedEvent = changetype<PositionClosed>(newMockEvent())

  positionClosedEvent.parameters = new Array()

  positionClosedEvent.parameters.push(
    new ethereum.EventParam("trader", ethereum.Value.fromAddress(trader))
  )
  positionClosedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  positionClosedEvent.parameters.push(
    new ethereum.EventParam("isLong", ethereum.Value.fromBoolean(isLong))
  )
  positionClosedEvent.parameters.push(
    new ethereum.EventParam("profit", ethereum.Value.fromUnsignedBigInt(profit))
  )

  return positionClosedEvent
}

export function createPositionLiquidatedEvent(
  trader: Address,
  token: Address,
  isLong: boolean,
  collateral: BigInt
): PositionLiquidated {
  let positionLiquidatedEvent = changetype<PositionLiquidated>(newMockEvent())

  positionLiquidatedEvent.parameters = new Array()

  positionLiquidatedEvent.parameters.push(
    new ethereum.EventParam("trader", ethereum.Value.fromAddress(trader))
  )
  positionLiquidatedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  positionLiquidatedEvent.parameters.push(
    new ethereum.EventParam("isLong", ethereum.Value.fromBoolean(isLong))
  )
  positionLiquidatedEvent.parameters.push(
    new ethereum.EventParam(
      "collateral",
      ethereum.Value.fromUnsignedBigInt(collateral)
    )
  )

  return positionLiquidatedEvent
}

export function createPositionOpenedEvent(
  trader: Address,
  token: Address,
  isLong: boolean,
  size: BigInt,
  collateral: BigInt,
  leverage: BigInt,
  entryAPY: BigInt
): PositionOpened {
  let positionOpenedEvent = changetype<PositionOpened>(newMockEvent())

  positionOpenedEvent.parameters = new Array()

  positionOpenedEvent.parameters.push(
    new ethereum.EventParam("trader", ethereum.Value.fromAddress(trader))
  )
  positionOpenedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )
  positionOpenedEvent.parameters.push(
    new ethereum.EventParam("isLong", ethereum.Value.fromBoolean(isLong))
  )
  positionOpenedEvent.parameters.push(
    new ethereum.EventParam("size", ethereum.Value.fromUnsignedBigInt(size))
  )
  positionOpenedEvent.parameters.push(
    new ethereum.EventParam(
      "collateral",
      ethereum.Value.fromUnsignedBigInt(collateral)
    )
  )
  positionOpenedEvent.parameters.push(
    new ethereum.EventParam(
      "leverage",
      ethereum.Value.fromUnsignedBigInt(leverage)
    )
  )
  positionOpenedEvent.parameters.push(
    new ethereum.EventParam(
      "entryAPY",
      ethereum.Value.fromUnsignedBigInt(entryAPY)
    )
  )

  return positionOpenedEvent
}

export function createTokenAddedEvent(token: Address): TokenAdded {
  let tokenAddedEvent = changetype<TokenAdded>(newMockEvent())

  tokenAddedEvent.parameters = new Array()

  tokenAddedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )

  return tokenAddedEvent
}

export function createTokenRemovedEvent(token: Address): TokenRemoved {
  let tokenRemovedEvent = changetype<TokenRemoved>(newMockEvent())

  tokenRemovedEvent.parameters = new Array()

  tokenRemovedEvent.parameters.push(
    new ethereum.EventParam("token", ethereum.Value.fromAddress(token))
  )

  return tokenRemovedEvent
}
