
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/store/auth";
import { useCartStore } from "@/store/cart";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Search,
  RefreshCw,
  X,
} from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";

import { LoadingWithLogo } from "@/components/loading-with-logo";
import { getProductImageUrl } from "@/lib/product-utils";

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
  premium_price_discounted?: string;
  product_price_premium?: string;
  discount_percentage?: number;
  has_discount?: boolean;
  product_image?: string;
  product_images?: Array<
    { image_url: string; image_order?: number } | string
  > | null;
  subcategory_id: number | null;
  categories: number[];
  show_in_store?: boolean;
  subcategory?: {
    category_id: number;
    category_name: string;
    parent_category_id: number;
  };
  options?: {
    option_id: number;
    option_name: string;
    values: {
      option_value_id: number;
      option_value: string;
      product_option_price: string;
      product_option_price_prefix: string;
      wholesale_price?: string;
      wholesale_price_premium?: string;
      standard_price?: string;
      has_discount?: boolean;
      discounted_option_price?: number;
    }[];
  }[];
}

interface Category {
  category_id: number;
  category_name: string;
  parent_category_id?: number;
  subcategories?: Category[];
  sort_order?: number;
}

interface GroupedProducts {
  [key: string]: {
    category: Category;
    products: Product[];
  };
}

export function ShopPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [purchaseType, setPurchaseType] = useState<"one-time" | "subscription">(
    "one-time",
  );
  const [showFilters, setShowFilters] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [coffeeType, setCoffeeType] = useState<string>("");
  const [roastLevel, setRoastLevel] = useState<string>("");
  // { addItem } was removed as it is no longer used
  const { isAuthenticated, customer, isWholesaleApproved } = useAuthStore();
  // Pending wholesale = wholesale account registered but not yet approved → show retail pricing
  const isPendingWholesale = !!(customer?.wholesale_type || customer?.service_type?.includes("Wholesaler")) && !isWholesaleApproved();
  const { addItem, clearCart } = useCartStore();
  const [expandedCategories, setExpandedCategories] = useState<number[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<GroupedProducts>({});
  const [noCategoryProducts, setNoCategoryProducts] = useState<Product[]>([]);
  const [initializedFirstCategory, setInitializedFirstCategory] =
    useState(false);
  const [subscriptionToRenew, setSubscriptionToRenew] = useState<any>(null);
  const [subscriptionIdToCancel, setSubscriptionIdToCancel] = useState<number | null>(null);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);

  // Debounce search input
  useEffect(() => {
    if (search) {
      setSearchLoading(true);
    }
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [search]);

  // Helper function to determine if a product is visible for the current user
  const isProductVisibleForUser = (product: Product, customer: any) => {
    if (product.show_in_store === false) return false;

    // Pending wholesale users are treated as retail customers for pricing/visibility
    const isUserWholesale = !isPendingWholesale && customer && customer.wholesale_type !== null;
    const isPremium =
      isUserWholesale &&
      (customer.wholesale_type === "premium" ||
        customer.service_type === "Full Service Wholesaler" ||
        customer.service_type === "Full Service");

    let displayPrice = 0;

    if (isPremium) {
      const ppDiscounted = product.premium_price_discounted ? parseFloat(product.premium_price_discounted) : 0;
      const ppPremium = product.product_price_premium ? parseFloat(product.product_price_premium) : 0;
      const wp = (product as any).wholesale_price ? parseFloat((product as any).wholesale_price) : 0;
      const retail = product.retail_price ? parseFloat(product.retail_price) : 0;
      const base = product.product_price ? parseFloat(product.product_price) : 0;

      if (ppDiscounted > 0) displayPrice = ppDiscounted;
      else if (ppPremium > 0) displayPrice = ppPremium;
      // If none of the premium prices are > 0, we leave displayPrice as 0, 
      // preventing fallback to wholesale or retail price.
    } else if (isUserWholesale) {
      const wp = parseFloat((product as any).wholesale_price || "0");
      displayPrice = wp > 0
        ? wp
        : (product.retail_price
          ? parseFloat(product.retail_price)
          : parseFloat(product.product_price));
    } else {
      displayPrice = product.user_price
        ? parseFloat(product.user_price)
        : parseFloat(product.product_price);
    }

    // If price is 0, check if it has options (which might carry the price)
    if (displayPrice > 0) return true;

    // If base price is 0 but product has options, consider it visible
    // (The user likely selects specific options which have prices)
    if (product.options && product.options.length > 0) return true;

    // It's considered not available/visible for this role
    return false;
  };

  const fetchCategories = async () => {
    try {
      const [catResponse, prodResponse] = await Promise.all([
        api.get("/store/products/categories"),
        api.get("/store/products", { params: { limit: 1000 } })
      ]);

      const allCategories = catResponse.data.categories || [];
      const allProducts = prodResponse.data.products || [];

      // Filter categories:
      // 1. Always hide "Catering Packages"
      // 2. Hide if it's a leaf (no subcategories) AND has no visible products
      // 3. Keep if it has subcategories ("dont disturb subcategories" - keep structure as is)
      const filteredCategories = allCategories.filter((cat: Category) => {
        if (cat.category_name?.toLowerCase() === "catering packages") return false;

        // "but if it has subcategories dont change it is as per now"
        if (cat.subcategories && cat.subcategories.length > 0) return true;

        // If it's a leaf, check if it has products for the current user
        return allProducts.some((p: Product) =>
          (p.categories?.includes(cat.category_id) || p.subcategory_id === cat.category_id) &&
          isProductVisibleForUser(p, customer)
        );
      });

      // Recursive sort function
      const sortCategories = (cats: Category[]) => {
        cats.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        cats.forEach((cat) => {
          if (cat.subcategories && cat.subcategories.length > 0) {
            sortCategories(cat.subcategories);
          }
        });
      };

      // Sort the top-level categories and their subcategories
      sortCategories(filteredCategories);

      setCategories(filteredCategories);

      // Auto-expand categories that have subcategories
      const categoriesWithSub = filteredCategories.filter(
        (cat: Category) => cat.subcategories && cat.subcategories.length > 0,
      );
      setExpandedCategories(
        categoriesWithSub.map((cat: Category) => cat.category_id),
      );

      // Auto-select the first category only if NO category is in URL and not initialized
      const hasUrlCategory = searchParams.get("category");
      if (
        filteredCategories.length > 0 &&
        !initializedFirstCategory &&
        selectedCategory === null &&
        !hasUrlCategory
      ) {
        setSelectedCategory(filteredCategories[0].category_id);
        setInitializedFirstCategory(true);
      } else if (hasUrlCategory) {
        // If there is a URL category, mark as initialized to prevent overwriting
        setInitializedFirstCategory(true);
      }
    } catch (error) {
      // Silently fail - don't show error to user
      console.error("Failed to fetch categories:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 1000 }; // Increased limit to show all products

      // Only apply category filter if NOT searching
      // When searching, fetch from all products across all categories
      if (selectedCategory && !debouncedSearch) {
        // Check if selected category is a subcategory by looking at categories data
        const isSubcategory =
          categories.some((cat) =>
            cat.subcategories?.some(
              (sub) => sub.category_id === selectedCategory,
            ),
          ) || false;

        if (isSubcategory) {
          // Try using subcategory_id parameter
          params.subcategory_id = selectedCategory;
        } else {
          // Use category_id for parent categories
          params.category_id = selectedCategory;
        }
      }

      if (debouncedSearch) params.search = debouncedSearch;
      if (sortBy) params.order_by = sortBy;

      // Apply coffee type and roast level filters by enhancing search
      let enhancedSearch = debouncedSearch;
      if (coffeeType) {
        enhancedSearch = enhancedSearch
          ? `${enhancedSearch} ${coffeeType}`
          : coffeeType;
      }
      if (roastLevel) {
        enhancedSearch = enhancedSearch
          ? `${enhancedSearch} ${roastLevel}`
          : roastLevel;
      }
      if (enhancedSearch) params.search = enhancedSearch;

      console.log("Fetching products with params:", params);

      const response = await api.get("/store/products", { params });
      const productsData = response.data.products || [];
      console.log("Fetched products:", productsData);
      console.log("Sample product:", productsData[0]);

      // Filter products to only show those with show_in_store = true
      // and those that have valid prices for the current user type.
      const filteredProducts = productsData.filter(
        (product: Product) => isProductVisibleForUser(product, customer)
      );

      setProducts(filteredProducts);
      setGroupedProducts({});
      setNoCategoryProducts([]);
    } catch (error: any) {
      console.error("Failed to fetch products:", error);
      if (error.response?.status !== 401 && error.response?.status !== 403) {
        // Don't show toast for auth errors or network issues
      }
      setProducts([]); // Set empty array on error
      setGroupedProducts({});
      setNoCategoryProducts([]);
    } finally {
      setLoading(false);
      if (search) {
        setSearchLoading(false);
      }
    }
  };

  const groupProductsBySubcategory = (productsData: Product[]) => {
    const grouped: GroupedProducts = {};
    const noCategory: Product[] = [];

    // Find all subcategories from categories data
    const allSubcategories: Category[] = [];
    const findAllSubcategories = (cats: Category[]) => {
      cats.forEach((cat) => {
        if (cat.subcategories && cat.subcategories.length > 0) {
          allSubcategories.push(...cat.subcategories);
          findAllSubcategories(cat.subcategories);
        }
      });
    };
    findAllSubcategories(categories);

    productsData.forEach((product) => {
      // If product has a subcategory
      if (product.subcategory_id && product.subcategory) {
        const subcategoryId = product.subcategory_id.toString();
        if (!grouped[subcategoryId]) {
          // Find the full subcategory object from our categories data
          const subcategoryFromData = allSubcategories.find(
            (sub) => sub.category_id === product.subcategory_id,
          ) || {
            category_id: product.subcategory_id,
            category_name: product.subcategory.category_name,
            parent_category_id: product.subcategory.parent_category_id,
          };

          grouped[subcategoryId] = {
            category: subcategoryFromData,
            products: [product],
          };
        } else {
          grouped[subcategoryId].products.push(product);
        }
      }
      // If product has categories but no specific subcategory
      else if (product.categories && product.categories.length > 0) {
        // Group by first category
        const categoryId = product.categories[0].toString();
        const category = categories.find(
          (cat) => cat.category_id === product.categories[0],
        );

        if (category) {
          if (!grouped[categoryId]) {
            grouped[categoryId] = {
              category: category,
              products: [product],
            };
          } else {
            grouped[categoryId].products.push(product);
          }
        } else {
          noCategory.push(product);
        }
      }
      // Products with no category/subcategory
      else {
        noCategory.push(product);
      }
    });

    setGroupedProducts(grouped);
    setNoCategoryProducts(noCategory);
  };

  const fetchSubscriptions = async () => {
    if (!isAuthenticated) {
      setSubscriptions([]);
      setSubscriptionsLoading(false);
      return;
    }
    try {
      setSubscriptionsLoading(true);
      const response = await api.get("/store/subscriptions");
      setSubscriptions(response.data.subscriptions || []);
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
      setSubscriptions([]);
    } finally {
      setSubscriptionsLoading(false);
    }
  };



  const handleRenewClick = (subscription: any) => {
    setSubscriptionToRenew(subscription);
  };

  const performSubscriptionRenewal = async () => {
    if (!subscriptionToRenew) return;

    try {
      clearCart();

      // Calculate next start date based on frequency
      const today = new Date();
      const freqDays = subscriptionToRenew.standing_order || 14;
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + freqDays);
      // Use local date parts to avoid UTC timezone shift (e.g. IST midnight → previous UTC day)
      const pad = (n: number) => String(n).padStart(2, '0');
      const startDateStr = `${nextDate.getFullYear()}-${pad(nextDate.getMonth() + 1)}-${pad(nextDate.getDate())}`;

      // Map standing_order days to frequency string
      let freqString = "2 Weeks";
      if (subscriptionToRenew.standing_order === 14) freqString = "2 Weeks";
      else if (subscriptionToRenew.standing_order === 28) freqString = "4 Weeks";
      else if (subscriptionToRenew.standing_order === 56) freqString = "8 Weeks";

      const products = subscriptionToRenew.products || [];

      for (const product of products) {
        const productPrice = parseFloat(String(product.price || product.total || 0));

        // Fetch full product details to get option IDs (needed by the backend when placing order)
        let resolvedOptions: any[] = [];
        try {
          const { data } = await api.get(`/store/products/${product.product_id}`);
          const fullProduct = data.product;

          if (product.options && product.options.length > 0 && fullProduct?.options) {
            resolvedOptions = product.options.map((subOpt: any) => {
              // Find matching option group by name
              const matchedGroup = fullProduct.options.find((o: any) =>
                o.option_name?.toLowerCase() === subOpt.option_name?.toLowerCase()
              );
              if (!matchedGroup) return null;

              // Find matching value by option_value string
              const matchedValue = matchedGroup.values?.find((v: any) =>
                v.option_value?.toLowerCase() === subOpt.option_value?.toLowerCase()
              );
              if (!matchedValue) return null;

              // Determine price from the matched value
              const optionPrice = parseFloat(
                matchedValue.standard_price ||
                matchedValue.product_option_price ||
                "0"
              );

              return {
                option_id: matchedGroup.option_id,
                option_name: matchedGroup.option_name,
                option_value_id: matchedValue.option_value_id,
                option_value: matchedValue.option_value,
                product_option_id: matchedValue.product_option_value_id || matchedValue.product_option_id || matchedGroup.product_option_id,
                option_price: optionPrice > 0 ? optionPrice.toFixed(2) : "0",
                option_price_prefix: "+"
              };
            }).filter(Boolean);
          }
        } catch (err) {
          console.warn(`Could not fetch product details for ${product.product_id}:`, err);
        }

        // If options carry the price (base product price is 0), keep it in options
        // Otherwise put price in product_price and zero out options
        const optionsTotal = resolvedOptions.reduce((sum, o) => sum + parseFloat(o.option_price || "0"), 0);
        let finalProductPrice = productPrice.toFixed(2);
        let finalOptions = resolvedOptions;

        if (productPrice > 0 && optionsTotal > 0) {
          // Price is in product_price already — zero out option prices to avoid double-counting
          finalOptions = resolvedOptions.map(o => ({ ...o, option_price: "0" }));
        }

        addItem({
          product_id: product.product_id,
          product_name: product.product_name,
          product_price: finalProductPrice,
          quantity: product.quantity || 1,
          product_image: product.product_image || "",
          options: finalOptions,
          subscription: {
            frequency: freqString,
            startDate: startDateStr,
            deliveryTime: "00:00:00"
          }
        });
      }

      setSubscriptionToRenew(null);
      router.push('/checkout');

    } catch (e) {
      console.error("Failed to renew:", e);
      toast.error("Failed to renew subscription");
    }
  };

  const handleCancelSubscription = (subscriptionId: number) => {
    setSubscriptionIdToCancel(subscriptionId);
  };


  const isSubscriptionActive = (subscription: any) => {
    // Cancelled (0) or Rejected (8) are always inactive
    if (subscription.order_status === 0 || subscription.order_status === 8) {
      return false
    }

    // If we have both delivery date and frequency, use them to determine if it's still active
    if (subscription.delivery_date_time && subscription.standing_order) {
      const deliveryDate = new Date(subscription.delivery_date_time)
      const now = new Date()

      // Calculate when the subscription period ends (standing_order is in days)
      const expiryDate = new Date(deliveryDate.getTime() + (subscription.standing_order * 24 * 60 * 60 * 1000))

      return now < expiryDate
    }

    // Fallback: Default to status-based logic if date info is missing
    // Status 1 (Payment Pending), 2 (Paid), 5 (Completed), 7 (Approved)
    return [1, 2, 5, 7].includes(subscription.order_status)
  };

  const performCancellation = async () => {
    if (!subscriptionIdToCancel) return;

    try {
      await api.post(`/store/subscriptions/${subscriptionIdToCancel}/cancel`);
      fetchSubscriptions();
      setSubscriptionIdToCancel(null);
      setShowCancelSuccess(true);
    } catch (error: any) {
      console.error("Failed to cancel subscription:", error);
      toast.error(error.response?.data?.message || "Failed to cancel subscription");
    }
  };

  // Check URL parameter for purchaseType and category
  useEffect(() => {
    const urlPurchaseType = searchParams.get("purchaseType");
    if (urlPurchaseType === "subscription") {
      setPurchaseType("subscription");
    } else {
      setPurchaseType("one-time");
    }

    const urlCategory = searchParams.get("category");
    if (urlCategory) {
      const catId = Number(urlCategory);
      if (!isNaN(catId) && catId !== selectedCategory) {
        setSelectedCategory(catId);
        setInitializedFirstCategory(true);
      }
    }
  }, [searchParams]);

  // Handle category change with URL update
  const handleCategoryChange = (categoryId: number | null) => {
    setSelectedCategory(categoryId);

    // Create new URLSearchParams object
    const params = new URLSearchParams(searchParams.toString());

    // Update category param
    if (categoryId !== null) {
      params.set("category", categoryId.toString());
    } else {
      params.delete("category");
    }

    // Preserve purchase type if it exists
    if (purchaseType) {
      params.set("purchaseType", purchaseType);
    }

    router.push(`/shop?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (purchaseType === "one-time") {
      fetchProducts();
    } else {
      fetchSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    purchaseType,
    selectedCategory,
    debouncedSearch,
    sortBy,
    coffeeType,
    roastLevel,
    categories,
  ]);

  // Scroll to shop content when category or filters change
  useEffect(() => {
    const element = document.getElementById("shop-content");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [selectedCategory, debouncedSearch, sortBy, coffeeType, roastLevel, purchaseType]);

  const handleResetFilters = () => {
    setCoffeeType("");
    setRoastLevel("");
    setSearch("");
    setDebouncedSearch("");
    setSortBy("featured");
    handleCategoryChange(null);
  };

  const handleApplyFilters = () => {
    fetchProducts();
  };



  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const getCategoryName = (categoryId: number | null): string => {
    if (categoryId === null) return "Products";

    // Search through all categories and subcategories
    const findCategory = (cats: Category[], id: number): Category | null => {
      for (const cat of cats) {
        if (cat.category_id === id) return cat;
        if (cat.subcategories && cat.subcategories.length > 0) {
          const found = findCategory(cat.subcategories, id);
          if (found) return found;
        }
      }
      return null;
    };

    const category = findCategory(categories, categoryId);
    return category ? category.category_name : "Products";
  };

  const renderCategories = (categoryList: Category[], level = 0) => {
    return categoryList.map((category) => (
      <div key={category.category_id}>
        <div
          className={`w-full flex items-center justify-between rounded-lg hover:bg-gray-100 text-gray-700 group ${selectedCategory === category.category_id
            ? "bg-gray-100 font-medium"
            : ""
            }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          <div className="flex items-center gap-1 flex-1">
            {/* Toggle Button */}
            {category.subcategories && category.subcategories.length > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category.category_id);
                }}
                className="p-2 hover:bg-gray-200 rounded-md transition-colors"
                aria-label="Toggle category"
              >
                <ChevronRightIcon
                  className={`w-4 h-4 transition-transform ${expandedCategories.includes(category.category_id)
                    ? "rotate-90"
                    : ""
                    }`}
                />
              </button>
            ) : (
              <div className="w-8" /> // Spacer to align with items that have arrows
            )}

            {/* Category Name - Selection Trigger */}
            <button
              onClick={() => handleCategoryChange(category.category_id)}
              className="flex-1 text-left py-2 pr-4 text-[14px]"
            >
              {category.category_name}
            </button>
          </div>
        </div>

        {/* Render subcategories if expanded */}
        {category.subcategories &&
          category.subcategories.length > 0 &&
          expandedCategories.includes(category.category_id) && (
            <div className="mt-1">
              {renderCategories(category.subcategories, level + 1)}
            </div>
          )}
      </div>
    ));
  };

  const renderProductsByCategory = () => {
    // When searching, show search results from all products
    // Otherwise, show products from the selected category
    return (
      <>
        {debouncedSearch && (
          <div className="mb-4">
            <Badge variant="outline" className="text-lg px-4 py-2">
              Search Results for "{debouncedSearch}"
              <span className="ml-2 text-sm font-normal">
                ({products.length}{" "}
                {products.length === 1 ? "product" : "products"})
              </span>
            </Badge>
          </div>
        )}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {products.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                customer={customer}
                isAuthenticated={isAuthenticated}
                isPendingWholesale={isPendingWholesale}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg font-medium mb-2">
              {debouncedSearch
                ? "No products found matching your search"
                : "No products found in this category"}
            </p>
            <Button
              variant="outline"
              onClick={() => {
                if (debouncedSearch) {
                  setSearch("");
                  setDebouncedSearch("");
                } else {
                  handleCategoryChange(null);
                  setInitializedFirstCategory(false);
                }
              }}
              className="mt-4"
            >
              {debouncedSearch ? "Clear Search" : "View All Products"}
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col bg-white">
      {/* Hero Section */}
      <section className="relative h-64 sm:h-80 md:h-96 bg-gradient-to-r from-blue-900/90 to-blue-800/90">
        <div className="absolute inset-0">
          <Image
            src="/assets/sndurex/Frame 1000007200.png"
            alt="Product Catalog"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/40" />
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 h-full flex items-center">
          <div className="text-white text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">
              Product Catalog
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90">
              Crafted with passion, enjoyed in every sip. Taste the difference!
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section id="shop-content" className="py-6 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 lg:top-24">
                {/* Purchase Type Selector */}
                {/* <div className="mb-6 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPurchaseType("one-time");
                      setSelectedCategory(null);
                      router.push("/shop?purchaseType=one-time");
                    }}
                    className={`flex-1 ${purchaseType === "one-time"
                      ? "bg-[#E8DCC6] border-[#E8DCC6] text-gray-900 hover:bg-[#E8DCC6]/90"
                      : "border-gray-300"
                      }`}
                  >
                    One-time Purchase
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPurchaseType("subscription");
                      router.push("/shop?purchaseType=subscription");
                    }}
                    className={`flex-1 ${purchaseType === "subscription"
                      ? "bg-[#E8DCC6] border-[#E8DCC6] text-gray-900 hover:bg-[#E8DCC6]/90"
                      : "border-gray-300"
                      }`}
                  >
                    Subscriptions
                  </Button>
                </div> */}

                {/* Categories - Only show for one-time purchases */}
                {purchaseType === "one-time" && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Categories
                    </h3>
                    <div className="space-y-1">
                      {renderCategories(categories)}
                    </div>
                  </div>
                )}

                {/* Subscription Info - Only show for subscription tab */}
                {purchaseType === "subscription" && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      My Subscriptions
                    </h3>
                    <div className="p-4 bg-pink-50 rounded-lg border border-pink-200 mb-6">
                      <p className="text-sm text-pink-900 font-medium mb-2">
                        Active Subscriptions
                      </p>
                      <p className="text-xs text-pink-700">
                        Manage your recurring orders and deliveries
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Products Grid / Subscriptions */}
            <div className="lg:col-span-3">
              {/* Toolbar */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {purchaseType === "subscription"
                    ? "My Subscriptions"
                    : `${getCategoryName(selectedCategory)}`}
                </h2>

                {purchaseType === "one-time" && (
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search Products"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 text-sm sm:text-base"
                    />
                    {searchLoading && search && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#2952E6] border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Filter Panel - Only for one-time purchases */}
              {purchaseType === "one-time" && showFilters && (
                <Card className="mb-6">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      Filter
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label
                          htmlFor="coffee-type"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Coffee Type
                        </label>
                        <Select
                          value={coffeeType || "all"}
                          onValueChange={(value) =>
                            setCoffeeType(value === "all" ? "" : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="arabica">Arabica</SelectItem>
                            <SelectItem value="robusta">Robusta</SelectItem>
                            <SelectItem value="blend">Blend</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label
                          htmlFor="roast-level"
                          className="text-sm font-medium text-gray-700 mb-2 block"
                        >
                          Roast Level
                        </label>
                        <Select
                          value={roastLevel || "all"}
                          onValueChange={(value) =>
                            setRoastLevel(value === "all" ? "" : value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleResetFilters}
                      >
                        Reset
                      </Button>
                      <Button
                        className="flex-1 bg-[#2952E6] hover:bg-[#1e3fb3]"
                        onClick={handleApplyFilters}
                      >
                        Apply Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Products Grid / Subscriptions */}
              {(() => {
                // Show subscriptions if subscription tab is selected
                if (purchaseType === "subscription") {
                  if (subscriptionsLoading) {
                    return (
                      <LoadingWithLogo
                        message="Loading subscriptions..."
                        size="lg"
                      />
                    );
                  }
                  if (!isAuthenticated) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-lg font-medium mb-2">
                          Please login to view subscriptions
                        </p>
                        <Link href="/auth/login">
                          <Button className="mt-4">Login</Button>
                        </Link>
                      </div>
                    );
                  }
                  if (subscriptions.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <p className="text-lg font-medium mb-2">
                          No active subscriptions
                        </p>
                        <p className="text-sm text-gray-400">
                          Start a subscription by adding products to your cart
                        </p>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-4 mb-8">
                      {subscriptions.map((subscription: any) => (
                        <Card
                          key={subscription.order_id}
                          className="overflow-hidden"
                        >
                          <CardContent className="p-6">
                            <div className="flex flex-col gap-6">
                              {/* Header Row: Title/Badge (Left) + Buttons (Right - Desktop) */}
                              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                <div className="flex flex-col gap-2">
                                  <h3 className="text-xl font-bold">
                                    Subscription #{subscription.order_id}
                                  </h3>
                                  <Badge
                                    className={`w-fit px-4 py-1 text-sm ${isSubscriptionActive(subscription)
                                      ? "bg-[#F97316] hover:bg-[#EA580C] text-white border-none"
                                      : "bg-gray-100 text-gray-800"
                                      }`}
                                  >
                                    {isSubscriptionActive(subscription)
                                      ? "Active"
                                      : "Inactive"}
                                  </Badge>
                                </div>

                                {/* Desktop Buttons */}
                                <div className="hidden md:flex items-center gap-2">
                                  {(subscription.order_status === 2 || subscription.order_status === 5) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                      onClick={() => handleRenewClick(subscription)}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Re Order
                                    </Button>
                                  )}
                                  {(subscription.order_status === 1 || subscription.order_status === 7) && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => handleCancelSubscription(subscription.order_id)}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Cancel
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Subscription Details */}
                              <div className="flex-1">
                                {subscription.products &&
                                  subscription.products.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                      {subscription.products.map(
                                        (product: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="flex items-center gap-3 text-sm"
                                          >
                                            <span className="font-medium">
                                              {product.product_name}
                                            </span>
                                            <span className="text-gray-500">
                                              x{product.quantity}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}
                                {subscription.standing_order && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    <strong>Frequency:</strong> {Math.round(subscription.standing_order / 7)} Weeks
                                  </p>
                                )}
                                {subscription.delivery_address && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    <strong>Delivery Address:</strong>{" "}
                                    {subscription.delivery_address}
                                  </p>
                                )}
                                {subscription.delivery_date_time && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    <strong>Next Delivery:</strong>{" "}
                                    {new Date(
                                      subscription.delivery_date_time,
                                    ).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                      timeZone: "UTC",
                                    })}
                                  </p>
                                )}
                                {subscription.order_comments && (
                                  <p className="text-sm text-gray-600 mb-2">
                                    <strong>Notes:</strong>{" "}
                                    {subscription.order_comments}
                                  </p>
                                )}
                                <div className="mt-4 flex gap-2">
                                  <span className="text-lg font-bold">
                                    Total: $
                                    {(parseFloat(
                                      subscription.order_total || 0,
                                    ) - parseFloat(subscription.gst || 0)).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* Mobile Buttons (Bottom) */}
                              <div className="flex md:hidden items-center gap-2">
                                {(subscription.order_status === 2 || subscription.order_status === 5) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                    onClick={() => handleRenewClick(subscription)}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Re Order
                                  </Button>
                                )}
                                {(subscription.order_status === 1 || subscription.order_status === 7) && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleCancelSubscription(subscription.order_id)}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                }

                // Show products for one-time purchases
                if (loading) {
                  return (
                    <LoadingWithLogo message="Loading products..." size="lg" />
                  );
                }
                if (searchLoading && search) {
                  return (
                    <LoadingWithLogo
                      message="Searching products..."
                      size="md"
                    />
                  );
                }
                if (products.length === 0 && !selectedCategory) {
                  return (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-lg font-medium mb-2">
                        {debouncedSearch || coffeeType || roastLevel
                          ? "No products found matching your filters"
                          : "No products available at the moment"}
                      </p>
                      {(debouncedSearch || coffeeType || roastLevel) && (
                        <Button
                          variant="outline"
                          onClick={handleResetFilters}
                          className="mt-4"
                        >
                          Clear Filters
                        </Button>
                      )}
                      <p className="text-sm text-gray-400">
                        Try adjusting your filters or search terms
                      </p>
                    </div>
                  );
                }
                return renderProductsByCategory();
              })()}
            </div>
          </div>
        </div>
      </section >

      <Dialog open={!!subscriptionToRenew} onOpenChange={(open) => !open && setSubscriptionToRenew(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Subscription</DialogTitle>
            <DialogDescription>
              Re-ordering this subscription will add the items to your cart for checkout. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionToRenew(null)}>Cancel</Button>
            <Button onClick={performSubscriptionRenewal} className="bg-[#2952E6]">Proceed</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!subscriptionIdToCancel} onOpenChange={(open) => !open && setSubscriptionIdToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this subscription? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionIdToCancel(null)}>Keep Subscription</Button>
            <Button onClick={performCancellation} variant="destructive">Yes, Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelSuccess} onOpenChange={setShowCancelSuccess}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subscription Cancelled</DialogTitle>
            <DialogDescription>
              Your subscription has been successfully cancelled.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowCancelSuccess(false)} className="bg-[#2952E6]">OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}

// Separate Product Card Component
const ProductCard = ({
  product,
  customer,
  isAuthenticated,
  isPendingWholesale = false,
}: {
  product: Product;
  customer: any;
  isAuthenticated: boolean;
  isPendingWholesale?: boolean;
}) => {
  // Determine prices based on user authentication and customer type
  const getPrices = () => {
    let displayPrice: number;
    let strikePrice: number | null = null;
    let isWholesale = false;
    let isDiscount = false;

    // Check if user is wholesale customer (pending wholesale → retail prices until approved)
    const isUserWholesale = !isPendingWholesale && customer && customer.wholesale_type !== null;

    // Check if user is Premium/Full Service Wholesale
    const isPremium =
      isUserWholesale &&
      (customer.wholesale_type === "premium" ||
        customer.service_type === "Full Service Wholesaler" ||
        customer.service_type === "Full Service");

    if (isPremium) {
      // PREMIUM WHOLESALE CUSTOMER
      isWholesale = true;

      // Display price priority: Premium Discounted > Premium Base > Wholesale > Retail > Base Product Price
      const ppDiscounted = product.premium_price_discounted ? parseFloat(product.premium_price_discounted) : 0;
      const ppPremium = product.product_price_premium ? parseFloat(product.product_price_premium) : 0;
      const wp = (product as any).wholesale_price ? parseFloat((product as any).wholesale_price) : 0;
      const retail = product.retail_price ? parseFloat(product.retail_price) : 0;
      const base = product.product_price ? parseFloat(product.product_price) : 0;

      if (ppDiscounted > 0) {
        displayPrice = ppDiscounted;
      } else if (ppPremium > 0) {
        displayPrice = ppPremium;
      } else {
        // We purposely do not fallback to wp, retail, or base if they are a premium customer
        displayPrice = 0;
      }

      // Strike logic for premium - same as essential wholesale
      if (
        product.base_retail_price &&
        !isNaN(Number.parseFloat(product.base_retail_price)) &&
        Number.parseFloat(product.base_retail_price) > 0
      ) {
        strikePrice = Number.parseFloat(product.base_retail_price);
      } else if (
        product.user_price &&
        !isNaN(Number.parseFloat(product.user_price)) &&
        Number.parseFloat(product.user_price) > 0
      ) {
        strikePrice = Number.parseFloat(product.user_price);
      } else if (
        product.product_price &&
        !isNaN(Number.parseFloat(product.product_price)) &&
        Number.parseFloat(product.product_price) > 0
      ) {
        strikePrice = Number.parseFloat(product.product_price);
      } else if (product.original_price && product.original_price > 0) {
        strikePrice = product.original_price;
      }

      // If price is 0, don't show any price
      if (displayPrice === 0) {
        strikePrice = null;
      }
    } else if (isUserWholesale) {
      // WHOLESALE CUSTOMER
      isWholesale = true;

      const wp = parseFloat((product as any).wholesale_price || "0");
      // Display price for wholesale customers should be wholesale_price, then retail_price
      displayPrice = wp > 0
        ? wp
        : (product.retail_price
          ? Number.parseFloat(product.retail_price)
          : Number.parseFloat(product.product_price));

      // If price is 0, don't show any price
      if (displayPrice === 0) {
        strikePrice = null;
      } else {
        // Strike price for wholesale customers should be base_retail_price (regular retail/MSRP)
        if (
          product.base_retail_price &&
          Number.parseFloat(product.base_retail_price) > 0
        ) {
          strikePrice = Number.parseFloat(product.base_retail_price);
        } else if (product.user_price && !isNaN(Number.parseFloat(product.user_price))) {
          strikePrice = Number.parseFloat(product.user_price);
        } else if (product.product_price && !isNaN(Number.parseFloat(product.product_price))) {
          strikePrice = Number.parseFloat(product.product_price);
        } else if (product.original_price && product.original_price > 0) {
          // Fallback to original_price if base_retail_price not available
          strikePrice = product.original_price;
        }
      }
    } else {
      // REGULAR CUSTOMER OR NOT LOGGED IN
      isWholesale = false;

      // Start with user_price or product_price as base
      displayPrice = product.user_price
        ? Number.parseFloat(product.user_price)
        : Number.parseFloat(product.product_price);

      // If price is 0, don't show any price (don't fall back to option prices)
      if (displayPrice === 0) {
        strikePrice = null;
      } else {
        // Check for discount for regular customers
        if (product.has_discount && product.discounted_price) {
          isDiscount = true;
          strikePrice = displayPrice; // Original price becomes strike price
          displayPrice = product.discounted_price; // Discounted price becomes display price
        } else if (product.original_price && product.original_price > 0) {
          // If no discount but original_price exists, show it as reference
        } else if (
          product.base_retail_price &&
          Number.parseFloat(product.base_retail_price) > 0
        ) {
          // Show base_retail_price as reference for regular customers
          strikePrice = Number.parseFloat(product.base_retail_price);
        }
      }
    }

    return { displayPrice, strikePrice, isWholesale, isDiscount };
  };

  const { displayPrice, strikePrice, isWholesale, isDiscount } = getPrices();

  return (
    <Link href={`/shop/${product.product_id}`} className="block h-full">
      <Card className="overflow-hidden hover:shadow-xl transition-shadow group h-full flex flex-col">
        <div className="relative aspect-square bg-gray-900 w-full">
          {getProductImageUrl(product) ? (
            <img
              src={getProductImageUrl(product)!}
              alt={product.product_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-6xl font-light mb-2">25g</div>
                  <div className="text-sm">SAMPLE PACK</div>
                </div>
              </div>
            </>
          )}
        </div>

        <CardContent className="p-4 flex flex-col flex-1">
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-0 line-clamp-1">{product.product_name}</h3>
            {/* {product.subcategory && (
            <Badge variant="outline" className="mb-2 text-xs">
              {product.subcategory.category_name}
            </Badge>
          )} */}
            <div className="flex items-center gap-2 mb-1 min-h-[20px]">
              {displayPrice > 0 ? (
                isWholesale ? (
                  <div className="flex flex-col items-start gap-1">
                    <div className="flex items-center gap-2">
                      {strikePrice && strikePrice !== displayPrice && (
                        <span className="text-sm text-gray-500 line-through">
                          ${strikePrice.toFixed(2)}
                        </span>
                      )}
                      <span className="text-xl font-bold text-[#2952E6]">
                        ${displayPrice.toFixed(2)}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-50 text-green-700 border-green-200"
                    >
                      WHOLESALE
                    </Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    {strikePrice && strikePrice !== displayPrice && (
                      <span className="text-sm text-gray-500 line-through">
                        ${strikePrice.toFixed(2)}
                      </span>
                    )}
                    <span className="text-xl font-bold text-[#2952E6]">
                      ${displayPrice.toFixed(2)}
                    </span>
                    {isDiscount &&
                      product.discount_percentage &&
                      product.discount_percentage > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {product.discount_percentage}% OFF
                        </Badge>
                      )}
                  </div>
                )
              ) : null}
            </div>
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {product.product_description}
            </p>
          </div>
          <div className="flex gap-2 mt-auto">
            <Button asChild size="sm" variant="outline" className="w-full bg-[#2952E6] text-white hover:bg-white hover:border-[#2952E6]">
              <span>View Details</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
