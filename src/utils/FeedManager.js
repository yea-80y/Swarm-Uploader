import { Bee, Topic } from '@ethersphere/bee-js'

// ✅ Default feed names
export const PROFILE_FEEDS = {
  'profile-picture': 'profilePictureFeed',
  'profile-bio': 'profileBioFeed',
  'profile-mood': 'profileMoodFeed'
}

// ✅ Updates the feed for a specific profile element
export async function updateElementFeed(beeApiUrl, batchId, signer, elementKey, newElementHash) {
  try {
    const bee = new Bee(beeApiUrl)

    const feedName = PROFILE_FEEDS[elementKey]
    const topic = Topic.fromString(feedName)
    const writer = bee.makeFeedWriter(topic, signer)

    console.log(`🔄 Preparing feed update for ${elementKey}:`)
    console.log('📦 Batch ID:', batchId)
    console.log('📂 Swarm Hash:', newElementHash)
    console.log('📝 Feed Name:', feedName)
    console.log('🧾 V3 Signer (Private Key):', signer)

    await writer.upload(batchId, newElementHash)

    console.log(`✅ Feed for ${elementKey} updated successfully.`)
  } catch (error) {
    console.error(`❌ Feed update failed for ${elementKey}:`, error)
    throw error
  }
}

// ✅ Fetches the latest hash from a specific profile element feed
export async function fetchElementFeed(beeApiUrl, userAddress, elementKey) {
  try {
    const bee = new Bee(beeApiUrl)

    const feedName = PROFILE_FEEDS[elementKey]
    const topic = Topic.fromString(feedName)
    const reader = bee.makeFeedReader(topic, userAddress)

    const { reference } = await reader.download()

    return reference
  } catch (error) {
    console.error(`❌ Fetching feed failed for ${elementKey}:`, error)
    return null
  }
}

// ✅ Returns the static feed URL for a profile element
export function getFeedUrl(beeApiUrl, userAddress, elementKey) {
  const feedName = PROFILE_FEEDS[elementKey]
  const topic = Topic.fromString(feedName)
  return `${beeApiUrl}/feeds/${topic.toHex()}/${userAddress}`
}
