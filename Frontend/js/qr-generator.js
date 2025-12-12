// Simple QR Code Generator

function generateQRCode(text, canvas) {
  const ctx = canvas.getContext("2d")
  const size = 200
  const moduleCount = 25 // QR code grid size
  const moduleSize = size / moduleCount

  // Clear canvas
  ctx.fillStyle = "#ffffff"
  ctx.fillRect(0, 0, size, size)

  // Generate random pattern based on text (simplified QR)
  ctx.fillStyle = "#000000"

  // Create a pseudo-random but consistent pattern from the text
  let seed = 0
  for (let i = 0; i < text.length; i++) {
    seed += text.charCodeAt(i)
  }

  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280
    return seed / 233280
  }

  // Draw QR pattern
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      // Create finder patterns (corners)
      const isFinderPattern =
        (row < 7 && col < 7) || (row < 7 && col > moduleCount - 8) || (row > moduleCount - 8 && col < 7)

      if (isFinderPattern) {
        const inFinder =
          (row >= 1 && row <= 5 && col >= 1 && col <= 5) ||
          (row >= 1 && row <= 5 && col >= moduleCount - 6 && col <= moduleCount - 2) ||
          (row >= moduleCount - 6 && row <= moduleCount - 2 && col >= 1 && col <= 5)

        const inInnerFinder =
          (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
          (row >= 2 && row <= 4 && col >= moduleCount - 5 && col <= moduleCount - 3) ||
          (row >= moduleCount - 5 && row <= moduleCount - 3 && col >= 2 && col <= 4)

        if (inFinder && !inInnerFinder) {
          ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize)
        } else if (inInnerFinder) {
          ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize)
        }
      } else {
        // Random data pattern
        if (pseudoRandom() > 0.5) {
          ctx.fillRect(col * moduleSize, row * moduleSize, moduleSize, moduleSize)
        }
      }
    }
  }
}
