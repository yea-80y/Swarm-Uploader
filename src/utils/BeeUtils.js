// === utils/BeeUtils.js ===

import { Bee } from '@ethersphere/bee-js'

// Uploads a file (like profile picture) to Swarm
export async function uploadFileToSwarm(beeApiUrl, batchId, file) {
  try {
    const bee = new Bee(beeApiUrl)
    const result = await bee.uploadFile(batchId, file)
    return result.reference
  } catch (error) {
    console.error('File upload failed:', error)
    throw error
  }
}

// Uploads plain text (like JSON or mood text) to Swarm
export async function uploadTextToSwarm(beeApiUrl, batchId, text, fileName = 'data.json') {
  try {
    const bee = new Bee(beeApiUrl)
    const file = new File([text], fileName, { type: 'text/plain' })
    const result = await bee.uploadFile(batchId, file)
    return result.reference
  } catch (error) {
    console.error('Text upload failed:', error)
    throw error
  }
}
