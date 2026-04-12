/**
 * Get the primary image URL for a product
 * Prioritizes product_images array, falls back to product_image
 */
export function getProductImageUrl(product: {
  product_image?: string
  product_images?: Array<{ image_url: string; image_order?: number } | string> | null
}): string | undefined {
  // Check if product_images array exists and has items
  if (product.product_images && Array.isArray(product.product_images) && product.product_images.length > 0) {
    // Get first image (already sorted by image_order in backend)
    const firstImage = product.product_images[0]
    // Handle both object format { image_url: string } and string format
    if (typeof firstImage === 'string') {
      return firstImage
    } else if (firstImage && typeof firstImage === 'object' && 'image_url' in firstImage) {
      return firstImage.image_url
    }
  }
  
  // Fallback to product_image
  return product.product_image
}

/**
 * Get all product image URLs
 */
export function getProductImageUrls(product: {
  product_image?: string
  product_images?: Array<{ image_url: string; image_order?: number } | string> | null
}): string[] {
  const urls: string[] = []
  
  // Add images from product_images array
  if (product.product_images && Array.isArray(product.product_images) && product.product_images.length > 0) {
    product.product_images.forEach((img) => {
      if (typeof img === 'string') {
        urls.push(img)
      } else if (img && typeof img === 'object' && 'image_url' in img) {
        urls.push(img.image_url)
      }
    })
  }
  
  // Add product_image if not already in the list
  if (product.product_image && !urls.includes(product.product_image)) {
    urls.push(product.product_image)
  }
  
  return urls
}

