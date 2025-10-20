import sharp from 'sharp';

/**
 * Preprocess captcha image to improve OCR accuracy by applying various image processing techniques.
 * Processing steps:
 * 1. Convert to grayscale to reduce noise
 * 2. Enhance contrast using linear transformation
 * 3. Remove horizontal noise using Gaussian blur
 * 4. Adjust brightness for better character visibility
 * 5. Sharpen image to improve edge detection
 * 6. Apply median filter to reduce noise
 * 7. Dilate characters to fix thin or broken strokes
 * 8. Convert to binary image using threshold
 * 9. Output as PNG for best quality
 *
 * @param imageBuffer - Raw image buffer from captcha
 * @returns Processed image buffer optimized for OCR
 */
export const preprocessCaptchaImage = async (imageBuffer: Buffer): Promise<Buffer> => {
  try {
    return await sharp(imageBuffer)
      // 1. Convert image to grayscale to reduce color noise
      .grayscale()
      // 2. Enhance contrast using linear transformation
      .linear(1.8, -(128 * 1.8) + 128) // Increase contrast more aggressively
      // 3. Remove horizontal noise using Gaussian blur
      .blur(0.5)
      // 4. Adjust brightness to compensate for thin characters
      .modulate({
        brightness: 1.3, // increase brightness more
      })
      // 5. Sharpen image to improve edge detection
      .sharpen({
        sigma: 1.2, // slightly more blur radius
        m1: 2, // increase sharpening on flat areas
        m2: 3, // increase sharpening on edges
        x1: 2, // threshold flat/edge
        y2: 15, // increase amount to sharpen edges
        y3: 25, // increase amount to sharpen flat areas
      })
      // 6. Reduce noise using median filter
      .median(2) // increase median filter size
      // 7. Dilate to make characters thicker
      .convolve({
        width: 3,
        height: 3,
        kernel: [0, 1, 0, 1, 1, 1, 0, 1, 0],
      })
      // 8. Convert to binary image using threshold
      .threshold(150) // lower threshold to catch more character pixels
      // 9. Ensure output format is PNG for best quality
      .png()
      .toBuffer();
  } catch (error) {
    console.error('[ERROR] Image preprocessing failed:', error);
    // If processing fails, return original image
    return imageBuffer;
  }
};
