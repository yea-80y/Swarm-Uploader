// === utils/FeedManager.js ===

import { Bee, Topic } from '@ethersphere/bee-js'
import { Wallet } from 'ethers'

// Map friendly names to feed names
export const PROFILE_FEEDS = {
  'profile-picture': 'profile-picture',
  'profile-bio': 'profile-bio',
  'profile-mood': 'profile-mood'
}

// ✅ Build the static feed hash by concatenating public address and topic hex
export function getFeedHash(userAddress, elementKey) {
  const feedName = PROFILE_FEEDS[elementKey]
  const topic = Topic.fromString(feedName)

  const addressHex = userAddress.startsWith('0x') ? userAddress.slice(2) : userAddress
  const topicHex = topic.toHex().startsWith('0x') ? topic.toHex().slice(2) : topic.toHex()

  return addressHex + topicHex
}

// ✅ Fetch the latest reference (Swarm hash) for a feed
export async function fetchElementFeed(beeApiUrl, signer, elementKey) {
    try {
      const bee = new Bee(beeApiUrl)
      const feedName = PROFILE_FEEDS[elementKey]
      const topic = Topic.fromString(feedName)

      const wallet = new Wallet(signer)
      const signerAddress = await wallet.getAddress()

      const reader = bee.makeFeedReader(topic, signerAddress)
      const latest = await reader.download()
      const reference = latest.reference

      console.log(`✅ Fetched feed for ${elementKey}:`, reference)
      return reference
    } catch (error) {
      console.error(`❌ Fetching feed failed for ${elementKey}:`, error)
      return ''
    }
  }

// ✅ Update a feed to point to a new Swarm hash
export async function updateElementFeed(beeApiUrl, batchId, signer, elementKey, newReference) {
  try {
    const bee = new Bee(beeApiUrl)
    const feedName = PROFILE_FEEDS[elementKey]
    const topic = Topic.fromString(feedName)


    const writer = bee.makeFeedWriter(topic, signer)
    await writer.upload(batchId, newReference)

    console.log(`✅ Feed for ${elementKey} updated successfully.`)
  } catch (error) {
    console.error(`❌ Updating feed failed for ${elementKey}:`, error)
    throw error
  }
}
