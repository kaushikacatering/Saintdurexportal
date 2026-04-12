import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface ProductOption {
  option_id: number
  option_name: string
  option_value_id: number | number[] // Support multi-select if needed, though usually simplified in cart
  option_value: string // For text/display
  product_option_id: number
  option_price: string
  option_price_prefix: string
}

export interface SubscriptionOptions {
  frequency: string
  startDate: string
  deliveryTime?: string
}

interface CartItem {
  product_id: number
  product_name: string
  product_price: string
  quantity: number
  product_image?: string
  options?: ProductOption[]
  subscription?: SubscriptionOptions
  category?: string
  cart_item_id?: string // Unique ID for items with different options
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity" | "cart_item_id"> & { quantity?: number }) => void
  removeItem: (cartItemId: string) => void
  updateQuantity: (cartItemId: string, quantity: number) => void
  clearCart: () => void
  getTotalItems: () => number
  getTotalPrice: () => number
  getItemPrice: (item: CartItem) => number
  updateItemsPrices: (updates: { productId: number, price: string }[]) => void
  updateCartItem: (cartItemId: string, updates: Partial<CartItem>) => void
}

// Generate unique cart item ID based on product and options
export const generateCartItemId = (productId: number, options?: ProductOption[], subscription?: SubscriptionOptions): string => {
  let id = `product_${productId}`

  if (options && options.length > 0) {
    const sortedOptions = [...options].sort((a, b) => a.option_id - b.option_id)
    const optionsKey = sortedOptions
      .map(opt => {
        // Handle array values (though simpler here)
        return `${opt.option_id}_${opt.option_value_id}`
      })
      .join('_')
    id += `_${optionsKey}`
  }

  if (subscription) {
    id += `_sub_${subscription.frequency}_${subscription.startDate}`
    if (subscription.deliveryTime) {
      id += `_${subscription.deliveryTime}`
    }
  }

  return id
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = get().items
        const cartItemId = generateCartItemId(item.product_id, item.options, item.subscription)
        const quantity = item.quantity || 1

        const existing = items.find((i) => {
          const existingId = i.cart_item_id || generateCartItemId(i.product_id, i.options, i.subscription)
          return existingId === cartItemId
        })

        if (existing) {
          set({
            items: items.map((i) => {
              const existingId = i.cart_item_id || generateCartItemId(i.product_id, i.options, i.subscription)
              return existingId === cartItemId
                ? { ...i, quantity: i.quantity + quantity }
                : i
            }),
          })
        } else {
          set({
            items: [...items, {
              ...item,
              quantity,
              category: item.category,
              cart_item_id: cartItemId
            }]
          })
        }
      },

      removeItem: (cartItemId) => {
        set({
          items: get().items.filter((i) => {
            const itemId = i.cart_item_id || generateCartItemId(i.product_id, i.options, i.subscription)
            return itemId !== cartItemId
          })
        })
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId)
        } else {
          set({
            items: get().items.map((i) => {
              const itemId = i.cart_item_id || generateCartItemId(i.product_id, i.options, i.subscription)
              return itemId === cartItemId ? { ...i, quantity } : i
            }),
          })
        }
      },

      clearCart: () => {
        set({ items: [] })
      },

      getTotalItems: () => {
        return get().items.length
      },

      getItemPrice: (item) => {
        let basePrice = Number.parseFloat(item.product_price)

        // Add option prices
        if (item.options && item.options.length > 0) {
          for (const option of item.options) {
            const optionPrice = Number.parseFloat(option.option_price || "0")
            if (option.option_price_prefix === '+') {
              basePrice += optionPrice
            } else if (option.option_price_prefix === '-') {
              basePrice -= optionPrice
            } else {
              // Default to add
              basePrice += optionPrice
            }
          }
        }

        return basePrice
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => {
            const itemPrice = get().getItemPrice(item)
            return total + itemPrice * item.quantity
          },
          0
        )
      },

      updateCartItem: (cartItemId: string, updates: Partial<CartItem>) => {
        set({
          items: get().items.map((i) => {
            const itemId = i.cart_item_id || generateCartItemId(i.product_id, i.options, i.subscription)
            return itemId === cartItemId ? { ...i, ...updates } : i
          }),
        })
      },

      // Kept for backward compatibility if needed, but we should migrate
      updateItemsPrices: (updates: { productId: number, price: string }[]) => {
        set({
          items: get().items.map((item) => {
            const update = updates.find(u => u.productId === item.product_id)
            if (update) {
              return { ...item, product_price: update.price }
            }
            return item
          })
        })
      }
    }),
    {
      name: "cart-storage",
    }
  )
)


