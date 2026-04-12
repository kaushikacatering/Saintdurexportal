
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useCartStore } from "@/store/cart";
import { Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { getProductImageUrl } from "@/lib/product-utils";
import { useAuthStore } from "@/store/auth";

interface Product {
  product_id: number;
  product_name: string;
  product_description: string;
  product_price: string;
  user_price?: string;
  retail_price?: string;
  base_retail_price?: string; // Added for wholesale strike price
  original_price?: number;
  discounted_price?: number;
  discount_percentage?: number;
  has_discount?: boolean;
  product_image?: string;
  product_images?: Array<
    { image_url: string; image_order?: number } | string
  > | null;
  show_in_store?: boolean;
  premium_price_discounted?: string;
  product_price_premium?: string;
  wholesale_price?: string | number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { addItem } = useCartStore();
  const { customer } = useAuthStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (search) params.search = search;

      const response = await api.get("/store/products", { params });
      console.log("Products API Response:", response.data);

      // Debug: Log first product to see available fields
      if (response.data.products && response.data.products.length > 0) {
        console.log("First product data:", response.data.products[0]);
        console.log("Available fields:", Object.keys(response.data.products[0]));
        console.log("base_retail_price:", response.data.products[0].base_retail_price);
        console.log("retail_price:", response.data.products[0].retail_price);
        console.log("user_price:", response.data.products[0].user_price);
        console.log("product_price:", response.data.products[0].product_price);
      }

      // Filter products to only show those with show_in_store = true
      const filteredProducts = (response.data.products || []).filter(
        (product: Product) => product.show_in_store !== false
      );

      setProducts(filteredProducts);
    } catch (error: any) {
      console.error("Failed to fetch products:", error);
      // Don't show error for 401 (auth) - products should work without auth
      if (error.response?.status !== 401) {
        toast.error("Failed to load products. Please try again.");
      }
      setProducts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    // Determine price based on user authentication and customer type
    let priceToUse: string;

    // Check if user is wholesale customer
    const isUserWholesale = customer && customer.wholesale_type !== null;
    const isPremium =
      isUserWholesale &&
      (customer.wholesale_type === "premium" ||
        customer.service_type === "Full Service Wholesaler" ||
        customer.service_type === "Full Service");

    if (!customer) {
      // Not logged in, use user_price
      priceToUse = product.user_price || product.product_price;
    } else if (isPremium) {
      // Premium Customer
      const p1 = parseFloat(product.premium_price_discounted || "0");
      const p2 = parseFloat(product.product_price_premium || "0");
      priceToUse = (p1 > 0 ? p1 : p2).toString();
    } else if (!isUserWholesale) {
      // Regular customer, use user_price
      priceToUse = product.user_price || product.product_price;
    } else {
      // Wholesale customer (Essential)
      // Use wholesale_price if available, otherwise retail_price
      const wp = parseFloat((product as any).wholesale_price || "0");
      priceToUse = wp > 0 ? wp.toString() : (product.retail_price || product.product_price);
    }

    addItem({
      product_id: product.product_id,
      product_name: product.product_name,
      product_price: priceToUse,
      product_image: getProductImageUrl(product),
    });
    toast.success(`${product.product_name} added to cart`);
  };

  // Function to determine prices for display - WHOLESALE ONLY strike-through
  const getProductPrices = (product: Product) => {
    // Check if user is wholesale customer
    const isUserWholesale = customer && customer.wholesale_type !== null;
    const isPremium =
      isUserWholesale &&
      (customer.wholesale_type === "premium" ||
        customer.service_type === "Full Service Wholesaler" ||
        customer.service_type === "Full Service");

    if (isPremium) {
      // PREMIUM CUSTOMER
      const p1 = parseFloat(product.premium_price_discounted || "0");
      const p2 = parseFloat(product.product_price_premium || "0");
      const displayPrice = p1 > 0 ? p1 : p2;

      // Strike logic for premium
      // Use retail/user price as strike-through for premium customers
      let strikePrice: number | null = null;
      if (product.base_retail_price && !isNaN(Number.parseFloat(product.base_retail_price))) {
        strikePrice = Number.parseFloat(product.base_retail_price);
      } else if (product.user_price && !isNaN(Number.parseFloat(product.user_price))) {
        strikePrice = Number.parseFloat(product.user_price);
      } else if (product.product_price && !isNaN(Number.parseFloat(product.product_price))) {
        strikePrice = Number.parseFloat(product.product_price);
      }
      return {
        displayPrice,
        strikePrice,
        isWholesale: true
      };
    } else if (isUserWholesale) {
      // WHOLESALE CUSTOMER
      const wp = parseFloat((product as any).wholesale_price || "0");
      const displayPrice = wp > 0
        ? wp
        : (product.retail_price
          ? Number.parseFloat(product.retail_price)
          : Number.parseFloat(product.product_price));

      // For wholesale customers, show strike-through price using user_price (what regular customers pay)
      // If user_price is not available, use product_price as fallback
      let strikePrice: number | null = null;

      if (product.base_retail_price && !isNaN(Number.parseFloat(product.base_retail_price))) {
        strikePrice = Number.parseFloat(product.base_retail_price);
      } else if (product.user_price && !isNaN(Number.parseFloat(product.user_price))) {
        strikePrice = Number.parseFloat(product.user_price);
      } else if (product.product_price && !isNaN(Number.parseFloat(product.product_price))) {
        strikePrice = Number.parseFloat(product.product_price);
      } else if (product.original_price && product.original_price > 0) {
        strikePrice = product.original_price;
      }

      return {
        displayPrice,
        strikePrice,
        isWholesale: true
      };
    } else {
      // REGULAR CUSTOMER OR NOT LOGGED IN
      // Determine display price
      let displayPrice: number;

      if (product.has_discount && product.discounted_price) {
        // Show discounted price for regular customers
        displayPrice = product.discounted_price;
      } else {
        // Show user_price or product_price for regular customers
        displayPrice = product.user_price
          ? Number.parseFloat(product.user_price)
          : Number.parseFloat(product.product_price);
      }

      return {
        displayPrice,
        strikePrice: null, // No strike-through for regular customers
        isWholesale: false
      };
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Our Menu</h1>
        <p className="text-gray-600 text-lg">
          Browse our delicious selection of catering options
        </p>
      </div>

      {/* Search */}
      <div className="mb-8">
        <div className="flex gap-4 max-w-2xl">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
              className="pl-10"
            />
          </div>
          <Button onClick={fetchProducts}>Search</Button>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg mb-2">
            {search
              ? "No products found matching your search"
              : "No products available at the moment"}
          </p>
          {search && (
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                fetchProducts();
              }}
              className="mt-4"
            >
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const { displayPrice, strikePrice, isWholesale } = getProductPrices(product);

            return (
              <Card
                key={product.product_id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-square bg-gray-200 relative">
                  {getProductImageUrl(product) ? (
                    <img
                      src={getProductImageUrl(product)!}
                      alt={product.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                <CardContent className="pt-4">
                  <h3 className="font-bold text-lg mb-2">
                    {product.product_name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {product.product_description}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {isWholesale ? (
                        // WHOLESALE CUSTOMER
                        <>
                          {strikePrice && strikePrice > displayPrice ? (
                            // Show strike-through price
                            <>
                              <span className="text-sm text-gray-500 line-through">
                                ${strikePrice.toFixed(2)}
                              </span>
                              <span className="text-2xl font-bold text-primary">
                                ${displayPrice.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            // No valid strike price or strike price not greater
                            <span className="text-2xl font-bold text-primary">
                              ${displayPrice.toFixed(2)}
                            </span>
                          )}
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-50 text-green-700 border-green-200"
                          >
                            WHOLESALE
                          </Badge>
                        </>
                      ) : (
                        // REGULAR CUSTOMER
                        <>
                          {product.has_discount && product.discounted_price ? (
                            // Show discounted price
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 line-through">
                                ${product.user_price ? Number.parseFloat(product.user_price).toFixed(2) : Number.parseFloat(product.product_price).toFixed(2)}
                              </span>
                              <span className="text-2xl font-bold text-primary">
                                ${product.discounted_price.toFixed(2)}
                              </span>
                              {product.discount_percentage && product.discount_percentage > 0 && (
                                <Badge
                                  variant="destructive"
                                  className="text-xs"
                                >
                                  {product.discount_percentage}% OFF
                                </Badge>
                              )}
                            </div>
                          ) : (
                            // Regular price
                            <span className="text-2xl font-bold text-primary">
                              ${displayPrice.toFixed(2)}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Link href={`/shop/${product.product_id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Button onClick={() => handleAddToCart(product)}>
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}