export type Category = {
  id: string
  name: string
  slug: string
  description?: string | null
  is_active?: boolean
}
export type Product = {
  id: string
  name: string
  slug: string
  price_per_kg: number
  image_url?: string
  stock_kg: number
  is_dry: boolean
  description?: string | null
  category: Category
}
export type Token = {
  access_token: string
  user: { id: string; name: string; email: string; role: 'user' | 'admin'; created_at?: string }
}

export type CutCleanOption = 
  | 'no_cut_clean'
  | 'cut_clean'
  | 'thin_slice'
  | 'clean_only'
  | 'cut_clean_keep_head'
  | 'cut_clean_remove_head'
  | 'fillet_cut_skin'

export type CartItemOptions = {
  cut_clean_option: CutCleanOption
  instructions: string[]
  custom_note: string
}
export type OrderItemIn = { product_id: string; qty_kg: number }

export type OrderItem = {
  product_id: string
  qty_kg: number
  price_per_kg: number
  product: {
    id: string
    name: string
    slug: string
  }
}

export type Order = {
  id: string
  total_amount: number
  status: string
  delivery_slot: string | null
  address_line: string
  postcode: string
  city?: string | null
  created_at: string
  items: OrderItem[]
}

export type NextDeliveryInfo = {
  scheduled_for: string | null
  cutoff_at: string | null
  window_label: string | null
  updated_at: string | null
}
