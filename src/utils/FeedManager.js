// === utils/FeedManager.js ===

import { Bee } from '@ethersphere/bee-js'
import { keccak256 } from 'js-sha3'

// ✅ Generates deterministic topic hashes for each profile element
export function getDeterministicTopic(elementName) {
  return '0x' + keccak256(elementName)
}

// ✅ Replaces: updateProfileFeed
// Updates the feed for a specific profile element (picture, bio, or mood)
export async function updateElementFeed(beeApiUrl, batchId, signer, elementName, newElementHash) {
  try {
    const bee = new Bee(beeApiUrl)

    // Use deterministic topic for each element
    const topic = getDeterministicTopic(elementName)
    const feedType = 'sequence'

    await bee.feed.setWriter(batchId, signer, topic, feedType, newElementHash)

    console.log(`✅ Feed for ${elementName} updated successfully.`)
  } catch (error) {
    console.error(`❌ Feed update failed for ${elementName}:`, error)
    throw error
  }
}

// ✅ Replaces: fetchProfileHash
// Fetches the latest hash from a specific profile element feed
export async function fetchElementFeed(beeApiUrl, userAddress, elementName) {
  try {
    const bee = new Bee(beeApiUrl)

    const topic = getDeterministicTopic(elementName)
    const feedType = 'sequence'

    const { reference } = await bee.feed.fetchLatest(userAddress, topic, feedType)

    return reference
  } catch (error) {
    console.error(`❌ Fetching feed failed for ${elementName}:`, error)
    return null
  }
}
