import { Bee, Utils } from "@ethersphere/bee-js"

// Example: create a GSOC chunk (comment) and upload it to Swarm
export async function uploadGSOComment(beeApiUrl, postageBatchId, commentData, signer) {
  try {
    // Step 1: Encode the comment as a JSON string
    const json = JSON.stringify(commentData)
    const payload = new TextEncoder().encode(json)

    // Step 2: Prepare GSOC signature
    const owner = await signer.getAddress()
    const signature = await signer.signMessage(payload)
    const socWriter = bee.makeSOCWriter(signer)
    
    // Step 3: Use a topic derived from timestamp or hash to create uniqueness
    const topic = Utils.keccak256Hash(payload)
    const reference = await socWriter.upload(postageBatchId, topic, payload)

    return {
      reference: reference.toString(),
      success: true,
    }

  } catch (err) {
    console.error("Failed to upload GSOC comment:", err)
    return {
      success: false,
      error: err.message,
    }
  }
}
