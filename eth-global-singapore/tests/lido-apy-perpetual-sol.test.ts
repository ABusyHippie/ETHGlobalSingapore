import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Address } from "@graphprotocol/graph-ts"
import { APYUpdated } from "../generated/schema"
import { APYUpdated as APYUpdatedEvent } from "../generated/LidoAPYPerpetual.sol/LidoAPYPerpetual.sol"
import { handleAPYUpdated } from "../src/lido-apy-perpetual-sol"
import { createAPYUpdatedEvent } from "./lido-apy-perpetual-sol-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/developer/matchstick/#tests-structure-0-5-0

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let newAPY = BigInt.fromI32(234)
    let newAPYUpdatedEvent = createAPYUpdatedEvent(newAPY)
    handleAPYUpdated(newAPYUpdatedEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/developer/matchstick/#write-a-unit-test

  test("APYUpdated created and stored", () => {
    assert.entityCount("APYUpdated", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "APYUpdated",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "newAPY",
      "234"
    )

    // More assert options:
    // https://thegraph.com/docs/en/developer/matchstick/#asserts
  })
})
