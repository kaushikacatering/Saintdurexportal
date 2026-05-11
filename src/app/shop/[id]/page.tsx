"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Star,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Home,
  ChevronRight as ChevronRightIcon,
} from "lucide-react";
import Image from "next/image";
import { api } from "@/lib/api";
import { useCartStore } from "@/store/cart";
import { useAuthStore } from "@/store/auth";
import { toast } from "sonner";
import { getProductImageUrl, getProductImageUrls } from "@/lib/product-utils";

interface Product {
  product_id: number;
  product_name: string;
  product_description: string;
  short_description?: string;
  product_price: string;
  user_price?: string;
  retail_price?: string;
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
  categories?: Array<{
    category_id: number;
    category_name: string;
    parent_category_id?: number;
  }>;
  options?: Array<{
    option_id: number;
    option_name: string;
    option_type: string;
    required: boolean;
    values: Array<any>;
  }>;
  roast_level?: string | null;
  show_specifications?: boolean;
  show_other_info?: boolean;
  show_in_store?: boolean;
  add_to_subscription?: boolean;
  product_desc_1?: string | null;
  product_desc_2?: string | null;
  min_quantity?: number;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  const { addItem, getItemPrice } = useCartStore();
  const { isAuthenticated, token, customer, isWholesaleApproved } = useAuthStore();
  // Pending wholesale = registered wholesale but not yet approved → show retail pricing
  const isPendingWholesale = !!(customer?.wholesale_type || customer?.service_type?.includes("Wholesaler")) && !isWholesaleApproved();
  const [productId, setProductId] = useState<string>("");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<"whole" | "ground">(
    "ground"
  );
  const [quantity, setQuantity] = useState(1);
  const [purchaseType, setPurchaseType] = useState<"onetime" | "subscription">(
    "onetime"
  );
  const [selectedOptions, setSelectedOptions] = useState<
    Record<number, number | number[] | string>
  >({}); // option_id -> option_value_id | option_value_ids[] | text_value
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [subscriptionFrequency, setSubscriptionFrequency] = useState("2 Weeks");
  const [deliveryStartDate, setDeliveryStartDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");

  // Handle params (can be Promise in Next.js 15+ or object in Next.js 14)
  useEffect(() => {
    const resolveParams = async () => {
      if (params && typeof params === "object" && "then" in params) {
        const resolved = await params;
        setProductId(resolved.id);
      } else {
        setProductId((params as { id: string }).id);
      }
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    if (productId) {
      window.scrollTo(0, 0);
      fetchProduct();
      fetchReviews();
    }
  }, [productId]);

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await api.get(`/store/products/${productId}/reviews`);
      setReviews(response.data.reviews || []);
    } catch (error) {
      console.error("Failed to fetch reviews:", error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const headers: any = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await api.get(`/store/products/${productId}`, {
        headers,
      });
      console.log("Product detail API response:", response.data);
      const productData = response.data.product;

      // Check if product should be shown in store
      if (productData.show_in_store === false) {
        toast.error("Product not available");
        router.push("/shop");
        return;
      }

      setProduct(productData);
      // Reset to first image when product changes
      setSelectedImageIndex(0);

      // Set initial quantity based on min_quantity from DB, fallback to 1
      if (productData.min_quantity && productData.min_quantity > 0) {
        setQuantity(productData.min_quantity);
      } else {
        setQuantity(1);
      }

      // If product price or user price is 0, select first option by default
      const basePrice = Number(productData.product_price || 0);
      const userPrice = Number(productData.user_price || 0);

      // Always select default options if price is 0 OR if no options are selected yet
      if ((basePrice === 0 || userPrice === 0) && productData.options && productData.options.length > 0) {
        const defaults: Record<number, number> = {};
        productData.options.forEach((option: any) => {
          if (option.values && option.values.length > 0) {
            // Select the first value as default
            defaults[option.option_id] = option.values[0].option_value_id;
          }
        });
        setSelectedOptions(defaults);
      }
    } catch (error: any) {
      console.error("Failed to fetch product:", error);
      // Don't show error for 401 - product should be viewable without auth
      if (error.response?.status === 404) {
        toast.error("Product not found");
        router.push("/shop");
      } else if (error.response?.status !== 401) {
        toast.error(
          error.response?.data?.message ||
          "Failed to load product. Please try again."
        );
      }
      // Don't redirect on auth errors - product should still be viewable
      if (error.response?.status === 404) {
        router.push("/shop");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Validate that at least one option is selected if options exist
    if (product.options && product.options.length > 0) {
      const hasSelection = product.options.some(
        (option) => {
          const val = selectedOptions[option.option_id];
          if (option.required) {
            if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) return false;
            return true;
          }
          return true; // if not required, it's fine
        }
      );

      // Check if ALL required options are met
      const missingRequired = product.options.some(option => {
        if (option.required) {
          const val = selectedOptions[option.option_id];
          return val === undefined || val === "" || (Array.isArray(val) && val.length === 0);
        }
        return false;
      });

      if (missingRequired) {
        toast.error("Please select all required options");
        return;
      }

      if (!hasSelection) {
        toast.error("Please select required options");
        return;
      }
    }

    if (purchaseType === "subscription") {
      if (!deliveryStartDate) {
        toast.error("Please select a delivery start date");
        return;
      }
    }

    // Build options array
    const options: any[] = [];
    if (product.options && product.options.length > 0) {
      for (const option of product.options) {
        const selectedValueData = selectedOptions[option.option_id];

        if (selectedValueData !== undefined && selectedValueData !== "" && (Array.isArray(selectedValueData) ? selectedValueData.length > 0 : true)) {
          // Handle Array (Checkbox)
          if (Array.isArray(selectedValueData)) {
            for (const valId of selectedValueData) {
              const selectedValue = option.values.find((v: any) => v.option_value_id === valId);
              if (selectedValue) {
                addToOptions(option, selectedValue, options);
              }
            }
          }
          // Handle String (Text)
          else if (typeof selectedValueData === 'string') {
            options.push({
              option_id: option.option_id,
              option_name: option.option_name,
              option_value_id: 0,
              option_value: selectedValueData,
              product_option_id: 0,
              option_price: 0,
              option_price_prefix: '+',
            });
          }
          // Handle Number (Select/Radio)
          else {
            const selectedValue = option.values.find((v: any) => v.option_value_id === selectedValueData);
            if (selectedValue) {
              addToOptions(option, selectedValue, options);
            }
          }
        }
      }
    }

    function addToOptions(option: any, selectedValue: any, list: any[]) {
      list.push({
        option_id: option.option_id,
        option_name: option.option_name,
        option_value_id: selectedValue.option_value_id,
        option_value: selectedValue.option_value,
        product_option_id: selectedValue.product_option_id,
        option_price: selectedValue.product_option_price,
        option_price_prefix: selectedValue.product_option_price_prefix,
      });
    }

    // Determine price based on user authentication and customer type
    let finalBasePrice: number;
    let isWholesale = false;
    let isPremium = false;

    // Pending wholesale users are treated as retail for pricing
    if (!isPendingWholesale && customer && customer.wholesale_type !== null) {
      isWholesale = true;
      // Check if user is Premium/Full Service Wholesale
      isPremium =
        customer.wholesale_type === "premium" ||
        customer.service_type === "Full Service Wholesaler" ||
        customer.service_type === "Full Service";

      if (isPremium) {
        const p1 = parseFloat(product.premium_price_discounted || "0");
        const p2 = parseFloat(product.product_price_premium || "0");
        finalBasePrice = p1 > 0 ? p1 : p2;
      } else {
        // Wholesale (Essential)
        const wp = parseFloat((product as any).wholesale_price || "0");
        finalBasePrice = wp > 0 ? wp : parseFloat(product.retail_price || product.product_price || "0");
      }
    } else {
      // Retail/Guest start with user_price
      finalBasePrice = Number.parseFloat(product.user_price || product.product_price || "0");
    }

    // Check options for price overrides
    const processedOptions: any[] = [];

    if (product.options && product.options.length > 0) {
      for (const option of product.options) {
        const selectedValueData = selectedOptions[option.option_id];

        if (selectedValueData !== undefined && selectedValueData !== "" && (Array.isArray(selectedValueData) ? selectedValueData.length > 0 : true)) {
          // Handle Array (Checkbox)
          if (Array.isArray(selectedValueData)) {
            for (const valId of selectedValueData) {
              const selectedValue = option.values.find((v: any) => v.option_value_id === valId);
              if (selectedValue) {
                addToProcessedOptions(option, selectedValue, finalBasePrice, isWholesale, isPremium, processedOptions);
              }
            }
          }
          // Handle String (Text - simplified, assuming no price impact or fixed logic needed later)
          else if (typeof selectedValueData === 'string') {
            // For text options, we might need a different structure or just pass the value.
            // Currently cart expects option_value_id. 
            // If text options don't have IDs, this part might need adjustment based on backend requirement.
            // Assuming standard Opencart-like text option:
            processedOptions.push({
              option_id: option.option_id,
              option_name: option.option_name,
              option_value_id: 0, // Placeholder
              option_value: selectedValueData,
              product_option_id: 0, // Placeholder
              option_price: 0,
              option_price_prefix: '+',
            });
          }
          // Handle Number (Select/Radio)
          else {
            const selectedValue = option.values.find((v: any) => v.option_value_id === selectedValueData);
            if (selectedValue) {
              addToProcessedOptions(option, selectedValue, finalBasePrice, isWholesale, isPremium, processedOptions);
            }
          }
        }
      }
    }

    // Helper to process option price logic (extracted)
    function addToProcessedOptions(option: any, selectedValue: any, basePrice: number, isWholesale: boolean, isPremium: boolean, list: any[]) {
      // Determine if this option has an override price
      let overridePrice = 0;

      if (isPremium) {
        overridePrice = Number.parseFloat(selectedValue.wholesale_price_premium || "0");
      } else if (isWholesale) {
        overridePrice = Number.parseFloat(selectedValue.wholesale_price || "0");
      } else {
        overridePrice = Number.parseFloat(selectedValue.standard_price || "0");
      }

      // If override exists and is > 0, it replaces the base price
      // The delta for THIS option becomes 0 (evaluated as included in override)
      let deltaPrice = Number.parseFloat(selectedValue.product_option_price || "0");

      // If override exists and is > 0
      if (overridePrice > 0) {
        if (basePrice === 0) {
          // If base is 0, override implies full price
          deltaPrice = 0;
          // NOTE: We don't mutate basePrice here as it affects other options.
          // But usually overrides are mutually exclusive or additive in a specific way.
          // Logic handled in backend/cart total usually sums deltas/overrides.
          // If we have multiple overrides, it's tricky.
          // Assuming simplified logic: use override as "price of this option" if base is 0.
          deltaPrice = overridePrice;
        } else {
          // If base > 0, override implies replacement? create delta?
          // Usually product_option_price IS the delta.
          // If we have a specific override price (e.g. standard_price for option),
          // maybe we should use that instead of product_option_price?
          // Yes, implied by prompt logic.
          deltaPrice = overridePrice;
        }
      }

      list.push({
        option_id: option.option_id,
        option_name: option.option_name,
        option_value_id: selectedValue.option_value_id,
        option_value: selectedValue.option_value,
        product_option_id: selectedValue.product_option_id,
        option_price: deltaPrice,
        option_price_prefix: selectedValue.product_option_price_prefix,
      });
    }

    // Use discounted price if available AND no option overrides were applied (simplistic check)
    // Actually, discount logic is tricky with overrides. 
    // Assuming if override is used, base product discount is ignored or already factored in option price.
    // For now, let's assume if discount exists on BASE, and we heavily modified base, apply discount? 
    // Usually options don't inherit % discount of base unless explicitly set.
    // Let's stick to base logic: 
    // If has_discount is TRUE, usually means product.discounted_price is the price to use.
    // But if we overrode base with option price, we should probably stick to option price.
    // Let's rely on finalBasePrice calculated above.

    const priceToUse = finalBasePrice.toString();

    addItem({
      product_id: product.product_id,
      product_name: product.product_name,
      product_price: priceToUse,
      product_image: getProductImageUrl(product),
      quantity,
      options: processedOptions.length > 0 ? processedOptions : undefined,
      subscription: purchaseType === "subscription" ? {
        frequency: subscriptionFrequency,
        startDate: deliveryStartDate,
      } : undefined,
      category: product.categories && product.categories.length > 0 ? product.categories[0].category_name : undefined,
    });
    toast.success(`${product.product_name} added to cart`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
          ? "nd"
          : day === 3 || day === 23
            ? "rd"
            : "th";
    return `${day}${suffix} ${month}, ${year}`;
  };

  const updateQuantity = (change: number) => {
    const minQty = product?.min_quantity && product.min_quantity > 0 ? product.min_quantity : 1;
    setQuantity((prev) => Math.max(minQty, prev + change));
  };

  const calculateSubtotal = () => {
    if (!product) return 0;

    // Build options array for price calculation
    const options: any[] = [];
    if (product.options && product.options.length > 0) {
      for (const option of product.options) {
        const selectedValueData = selectedOptions[option.option_id];

        if (selectedValueData !== undefined && selectedValueData !== "" && (Array.isArray(selectedValueData) ? selectedValueData.length > 0 : true)) {
          // Handle Array (Checkbox)
          if (Array.isArray(selectedValueData)) {
            for (const valId of selectedValueData) {
              const selectedValue = option.values.find((v: any) => v.option_value_id === valId);
              if (selectedValue) {
                addToSubtotalOptions(option, selectedValue, options);
              }
            }
          }
          // Handle String (Text)
          else if (typeof selectedValueData === 'string') {
            // Text usually 0 price unless simplified logic
          }
          // Handle Number (Select/Radio)
          else {
            const selectedValue = option.values.find((v: any) => v.option_value_id === selectedValueData);
            if (selectedValue) {
              addToSubtotalOptions(option, selectedValue, options);
            }
          }
        }
      }
    }

    function addToSubtotalOptions(option: any, selectedValue: any, list: any[]) {
      list.push({
        option_id: option.option_id,
        option_name: option.option_name,
        option_value_id: selectedValue.option_value_id,
        option_value: selectedValue.option_value,
        product_option_id: selectedValue.product_option_id,
        option_price: selectedValue.product_option_price,
        option_price_prefix: selectedValue.product_option_price_prefix,
      });
    }

    // Determine price based on user authentication and customer type
    let currentBasePrice: number;
    let isWholesale = false;
    let isPremium = false;

    // Pending wholesale users are treated as retail for pricing
    if (!isPendingWholesale && customer && customer.wholesale_type !== null) {
      isWholesale = true;

      // Check if user is Premium/Full Service Wholesale
      isPremium =
        customer.wholesale_type === "premium" ||
        customer.service_type === "Full Service Wholesaler" ||
        customer.service_type === "Full Service";

      if (isPremium) {
        const p1 = parseFloat(product.premium_price_discounted || "0");
        const p2 = parseFloat(product.product_price_premium || "0");
        currentBasePrice = p1 > 0 ? p1 : p2;
      } else {
        // Wholesale (Essential)
        const wp = parseFloat((product as any).wholesale_price || "0");
        currentBasePrice = wp > 0 ? wp : parseFloat(product.retail_price || product.product_price || "0");
      }
    } else {
      currentBasePrice = Number.parseFloat(product.user_price || product.product_price || "0");
    }

    // Process options to determine final price and active deltas
    const activeOptions: any[] = [];

    if (product.options && product.options.length > 0) {
      for (const option of product.options) {
        const selectedValueData = selectedOptions[option.option_id];

        if (selectedValueData !== undefined && selectedValueData !== "" && (Array.isArray(selectedValueData) ? selectedValueData.length > 0 : true)) {
          // Handle Array (Checkbox)
          if (Array.isArray(selectedValueData)) {
            for (const valId of selectedValueData) {
              const selectedValue = option.values.find((v: any) => v.option_value_id === valId);
              if (selectedValue) {
                addToActiveOptions(option, selectedValue, currentBasePrice, isWholesale, isPremium, activeOptions);
              }
            }
          }
          // Handle String (Text)
          else if (typeof selectedValueData === 'string') {
            // Text
          }
          // Handle Number (Select/Radio)
          else {
            const selectedValue = option.values.find((v: any) => v.option_value_id === selectedValueData);
            if (selectedValue) {
              addToActiveOptions(option, selectedValue, currentBasePrice, isWholesale, isPremium, activeOptions);
            }
          }
        }
      }
    }

    function addToActiveOptions(option: any, selectedValue: any, basePrice: number, isWholesale: boolean, isPremium: boolean, list: any[]) {
      // Check for override
      let overridePrice = 0;
      if (isPremium) {
        overridePrice = Number.parseFloat(selectedValue.wholesale_price_premium || "0");
      } else if (isWholesale) {
        overridePrice = Number.parseFloat(selectedValue.wholesale_price || "0");
      } else {
        overridePrice = Number.parseFloat(selectedValue.standard_price || "0");
      }

      let deltaPrice = Number.parseFloat(selectedValue.product_option_price || "0");

      if (overridePrice > 0) {
        if (basePrice === 0) {
          // If base is 0, this is the price.
          deltaPrice = overridePrice;
        } else {
          deltaPrice = overridePrice;
        }
      }

      list.push({
        option_id: option.option_id,
        option_name: option.option_name,
        option_value_id: selectedValue.option_value_id,
        option_value: selectedValue.option_value,
        // product_option_id: selectedValue.product_option_id, // Error in original selection potentially
        option_price: deltaPrice,
      });
    }

    // Logic for discount: 
    // If we used an override, we likely shouldn't apply the BASE product discount on top 
    // unless the option specifically says so.
    // For now, if currentBasePrice changed from original, we assume it's the final intended price.
    // If it didn't change (no overrides), check for discount on base.

    let finalPrice = currentBasePrice;

    // Only apply base discount if we haven't overridden the price 
    // (Simplistic heuristic: if currentBase matches original base)
    // Actually, safer to just use currentBasePrice we calculated, assuming overrides include discounts if applicable.

    // However, if we didn't override, we should respect has_discount on the product.
    // Let's re-verify base logic.
    const originalBase = isWholesale
      ? Number.parseFloat(product.retail_price || product.product_price || "0")
      : Number.parseFloat(product.user_price || product.product_price || "0");

    if (currentBasePrice === originalBase && product.has_discount && product.discounted_price) {
      finalPrice = product.discounted_price;
    }

    // Use cart store's getItemPrice function
    const itemPrice = getItemPrice({
      product_id: product.product_id,
      product_name: product.product_name,
      product_price: finalPrice.toString(),
      quantity: 1,
      options: activeOptions.length > 0 ? activeOptions : undefined,
    });

    return itemPrice * quantity;
  };

  // Helper function to get option price display based on customer type
  const getOptionPriceDisplay = (value: any, product: Product, customer: any) => {
    let optionPrice = 0;
    let isPremium = false;
    let isWholesale = false;

    // Pending wholesale users are treated as retail for pricing
    if (!isPendingWholesale && customer && customer.wholesale_type !== null) {
      isWholesale = true;
      isPremium =
        customer.wholesale_type === "premium" ||
        customer.service_type === "Full Service Wholesaler" ||
        customer.service_type === "Full Service";

      if (isPremium) {
        optionPrice = Number.parseFloat(value.wholesale_price_premium || "0");
      } else {
        optionPrice = Number.parseFloat(value.wholesale_price || "0");
      }
    } else {
      // Retail logic
      optionPrice = Number.parseFloat(value.standard_price || "0");
    }

    // Fallback to product_option_price if specific price is 0
    if (optionPrice === 0) {
      optionPrice =
        value.has_discount && value.discounted_option_price
          ? value.discounted_option_price
          : Number.parseFloat(value.product_option_price || "0");
    }

    // Return empty string if price is 0, otherwise format as (+$X.XX)
    return optionPrice > 0 ? ` (+$${optionPrice.toFixed(2)})` : "";
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-6 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <Link href="/shop">
            <Button>Back to Shop</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmitReview = async () => {
    if (!rating || rating < 1 || rating > 5) {
      toast.error("Please select a rating");
      return;
    }

    if (!reviewText.trim() || reviewText.trim().length < 10) {
      toast.error("Please write a review (at least 10 characters)");
      return;
    }

    try {
      setSubmittingReview(true);
      const headers: any = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await api.post(
        `/store/products/${productId}/reviews`,
        {
          rating,
          review_text: reviewText.trim(),
          reviewer_name: reviewerName.trim() || undefined,
          reviewer_email: reviewerEmail.trim() || undefined,
        },
        { headers }
      );

      toast.success(
        "Review submitted successfully! It will be reviewed before being published."
      );
      setRating(0);
      setReviewText("");
      setReviewerName("");
      setReviewerEmail("");

      // Refresh reviews
      await fetchReviews();
    } catch (error: any) {
      console.error("Failed to submit review:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to submit review. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Get main category for breadcrumb
  const mainCategory =
    product?.categories?.find((cat) => !cat.parent_category_id) ||
    product?.categories?.[0];
  const subCategory = product?.categories?.find(
    (cat) => cat.parent_category_id
  );

  return (
    <div className="flex flex-col bg-white">
      {/* Breadcrumb */}
      <section className="bg-gray-50 border-b">
        <div className="container mx-auto px-6 py-4">
          <nav className="flex items-center gap-2 text-sm flex-wrap">
            <Link
              href="/"
              className="text-gray-600 hover:text-[#031881] flex items-center gap-1"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            <Link href="/shop" className="text-gray-600 hover:text-[#031881]">
              Product Catalogue
            </Link>
            {mainCategory && (
              <>
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                <Link
                  href={`/shop?category=${mainCategory.category_id}`}
                  className="text-gray-600 hover:text-[#031881]"
                >
                  {mainCategory.category_name}
                </Link>
              </>
            )}
            {subCategory && (
              <>
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                <Link
                  href={`/shop?category=${subCategory.category_id}`}
                  className="text-gray-600 hover:text-[#031881]"
                >
                  {subCategory.category_name}
                </Link>
              </>
            )}
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">
              {product?.product_name}
            </span>
          </nav>
        </div>
      </section>

      {/* Product Section */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-4 mb-16">
            {/* Product Image Gallery */}
            <div className="flex flex-col md:flex-row gap-4 max-w-2xl mx-auto h-auto md:h-[450px] items-start w-full">
              {/* Main Image */}
              <div className="relative w-full md:w-auto aspect-square md:h-full rounded-lg overflow-hidden bg-gray-100 shrink-0">
                {(() => {
                  const imageUrls = getProductImageUrls(product);
                  const mainImage =
                    imageUrls[selectedImageIndex] ||
                    getProductImageUrl(product);

                  return mainImage ? (
                    <Image
                      src={mainImage}
                      alt={`${product.product_name} - Image ${selectedImageIndex + 1
                        }`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 450px"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
                      <span className="text-white/40 text-lg">
                        {product.product_name}
                      </span>
                    </div>
                  );
                })()}

                {/* Navigation arrows for multiple images */}
                {(() => {
                  const imageUrls = getProductImageUrls(product);
                  if (imageUrls.length > 1) {
                    return (
                      <>
                        <button
                          onClick={() =>
                            setSelectedImageIndex((prev) =>
                              prev > 0 ? prev - 1 : imageUrls.length - 1
                            )
                          }
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() =>
                            setSelectedImageIndex((prev) =>
                              prev < imageUrls.length - 1 ? prev + 1 : 0
                            )
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                          aria-label="Next image"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Thumbnail Images */}
              {(() => {
                const imageUrls = getProductImageUrls(product);
                if (imageUrls.length > 1) {
                  return (
                    <div className="flex flex-row md:flex-col gap-3 w-full md:w-24 h-auto md:h-full overflow-x-auto md:overflow-y-auto px-1 py-1 shrink-0 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                      {imageUrls.map((url, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === index
                            ? "border-[#031881] ring-2 ring-[#031881] ring-offset-2"
                            : "border-gray-200 hover:border-gray-300"
                            }`}
                          aria-label={`View image ${index + 1}`}
                        >
                          <Image
                            src={url}
                            alt={`${product.product_name} thumbnail ${index + 1
                              }`}
                            fill
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Product Info */}
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                {product.product_name}
              </h1>

              <div className="flex items-center gap-3 mb-6">
                {(() => {
                  // Determine the base price based on user authentication and customer type
                  // Pending wholesale users are treated as retail for pricing
                  let basePrice: number;
                  let isWholesale = false;
                  let isPremium = false;

                  if (!isPendingWholesale && customer && customer.wholesale_type !== null) {
                    isWholesale = true;
                    isPremium =
                      customer.wholesale_type === "premium" ||
                      customer.service_type === "Full Service Wholesaler" ||
                      customer.service_type === "Full Service";

                    if (isPremium) {
                      const p1 = parseFloat(product.premium_price_discounted || "0");
                      const p2 = parseFloat(product.product_price_premium || "0");
                      basePrice = p1 > 0 ? p1 : p2;
                    } else {
                      const wp = parseFloat((product as any).wholesale_price || "0");
                      basePrice = wp > 0
                        ? wp
                        : (product.retail_price
                          ? Number.parseFloat(product.retail_price)
                          : Number.parseFloat(product.product_price));
                    }
                  } else {
                    // Retail customers and pending wholesale users
                    basePrice = product.user_price
                      ? Number.parseFloat(product.user_price)
                      : Number.parseFloat(product.product_price);
                  }

                  // Calculate extra cost from selected options AND check for overrides
                  let optionsPrice = 0;

                  if (product.options && product.options.length > 0) {
                    product.options.forEach(option => {
                      const selectedValueData = selectedOptions[option.option_id];

                      if (selectedValueData !== undefined && selectedValueData !== "" && (Array.isArray(selectedValueData) ? selectedValueData.length > 0 : true)) {
                        // Handle Array (Checkbox) - multiple selections
                        if (Array.isArray(selectedValueData)) {
                          selectedValueData.forEach(valId => {
                            const value = option.values.find((v: any) => v.option_value_id === valId);
                            if (value) {
                              optionsPrice += calculateOptionPrice(value, basePrice, isPremium, isWholesale);
                            }
                          });
                        }
                        // Handle String (Text) - text input
                        else if (typeof selectedValueData === 'string') {
                          // Text options typically have no price
                        }
                        // Handle Number (Select/Radio) - single selection
                        else {
                          const value = option.values.find((v: any) => v.option_value_id === selectedValueData);
                          if (value) {
                            optionsPrice += calculateOptionPrice(value, basePrice, isPremium, isWholesale);
                          }
                        }
                      }
                    });
                  }

                  // Helper function to calculate option price
                  function calculateOptionPrice(value: any, currentBasePrice: number, isPremium: boolean, isWholesale: boolean): number {
                    // Check for override price based on user type
                    let overridePrice = 0;

                    if (isPremium) {
                      overridePrice = Number.parseFloat(value.wholesale_price_premium || "0");
                    } else if (isWholesale) {
                      overridePrice = Number.parseFloat(value.wholesale_price || "0");
                    } else {
                      // Retail (and pending wholesale) use standard_price
                      overridePrice = Number.parseFloat(value.standard_price || "0");
                    }

                    let deltaPrice = value.has_discount && value.discounted_option_price
                      ? value.discounted_option_price
                      : Number.parseFloat(value.product_option_price || "0");

                    if (overridePrice > 0) {
                      if (currentBasePrice === 0) {
                        return overridePrice;
                      } else {
                        return overridePrice;
                      }
                    }

                    return deltaPrice;
                  }

                  const totalPrice = basePrice + optionsPrice;

                  // Check if discount should be shown (only applies to base product discount, not options usually, but let's keep logic consistent)
                  // If the base product has a specific discount 
                  const shouldShowDiscount =
                    product.has_discount &&
                    typeof product.original_price === "number" &&
                    typeof product.discounted_price === "number" &&
                    product.original_price > 0 &&
                    product.discounted_price > 0;

                  if (
                    shouldShowDiscount &&
                    product.original_price &&
                    product.discounted_price
                  ) {
                    // If base has discount, we start with discounted base + options
                    const discountedTotal = product.discounted_price + optionsPrice;
                    const originalTotal = product.original_price + optionsPrice;

                    return (
                      <div className="flex items-center gap-3">
                        <span className="text-xl text-gray-500 line-through">
                          ${originalTotal.toFixed(2)}
                        </span>
                        <div className="text-2xl font-bold text-[#031881]">
                          ${discountedTotal.toFixed(2)}
                        </div>
                        {product.discount_percentage && (
                          <Badge variant="destructive" className="text-sm">
                            {product.discount_percentage}% OFF
                          </Badge>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="text-2xl font-bold text-[#031881]">
                      ${totalPrice.toFixed(2)}
                    </div>
                  );
                })()}
              </div>

              {/* Short Description */}
              {product.short_description && (
                <p className="text-gray-700 leading-relaxed mb-6 text-lg font-medium whitespace-pre-wrap">
                  {product.short_description}
                </p>
              )}

              {/* Roast Level - Only show if defined in backend */}
              {product.roast_level && (
                <div className="flex items-center gap-2 mb-8">
                  <span className="text-sm font-medium text-gray-700">
                    {product.roast_level} Roasts
                  </span>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => {
                      // Determine roast intensity based on roast level
                      let filledBars = 0;
                      const roastLower =
                        product.roast_level?.toLowerCase() || "";
                      if (roastLower.includes("light")) {
                        filledBars = 1;
                      } else if (roastLower.includes("medium")) {
                        filledBars = 3;
                      } else if (roastLower.includes("dark")) {
                        filledBars = 5;
                      } else {
                        filledBars = 3; // Default to medium
                      }
                      return (
                        <div
                          key={i}
                          className={`w-8 h-3 rounded ${i < filledBars ? "bg-amber-700" : "bg-gray-200"
                            }`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product Options */}
              {product.options && product.options.length > 0 && (
                <div className="space-y-4 mb-6">
                  {product.options.map((option) => (
                    <div key={option.option_id}>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        {option.option_name}
                        {option.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {(() => {
                        const type = (option.option_type || "select").toLowerCase();

                        // Function to handle changes for Checkbox/Radio/Select
                        const handleOptionChange = (newValue: any) => {
                          setSelectedOptions(prev => ({
                            ...prev,
                            [option.option_id]: newValue
                          }));
                        };

                        if (type === "radio") {
                          return (
                            <div className="space-y-2 mt-2">
                              {option.values.map((value: any) => {
                                const displayPrice = getOptionPriceDisplay(value, product, customer);
                                const isSelected = selectedOptions[option.option_id] === value.option_value_id;

                                return (
                                  <div key={value.option_value_id} className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      id={`option-value-${value.option_value_id}`}
                                      name={`option_${option.option_id}`}
                                      value={value.option_value_id}
                                      checked={isSelected}
                                      onChange={() => handleOptionChange(value.option_value_id)}
                                      className="h-4 w-4 border-gray-300 text-[#031881] focus:ring-[#031881]"
                                    />
                                    <label htmlFor={`option-value-${value.option_value_id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                      {value.option_value} {displayPrice}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        } else if (type === "checkbox") {
                          return (
                            <div className="space-y-2 mt-2">
                              {option.values.map((value: any) => {
                                const displayPrice = getOptionPriceDisplay(value, product, customer);
                                const currentVal = selectedOptions[option.option_id];
                                const isSelected = Array.isArray(currentVal) && currentVal.includes(value.option_value_id);

                                return (
                                  <div key={value.option_value_id} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      id={`option-value-${value.option_value_id}`}
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const valId = value.option_value_id;
                                        let newArr: number[] = Array.isArray(currentVal) ? [...currentVal] : [];
                                        if (e.target.checked) {
                                          if (!newArr.includes(valId)) newArr.push(valId);
                                        } else {
                                          newArr = newArr.filter(id => id !== valId);
                                        }
                                        handleOptionChange(newArr);
                                      }}
                                      className="h-4 w-4 rounded border-gray-300 text-[#031881] focus:ring-[#031881]"
                                    />
                                    <label htmlFor={`option-value-${value.option_value_id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                                      {value.option_value} {displayPrice}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        } else if (type === "text") {
                          return (
                            <Input
                              type="text"
                              placeholder={option.option_name}
                              value={(selectedOptions[option.option_id] as string) || ""}
                              onChange={(e) => handleOptionChange(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#031881] focus:border-[#031881]"
                            />
                          );
                        } else {
                          // Default to Select/Dropdown
                          return (
                            <select
                              value={(selectedOptions[option.option_id] as number) || ""}
                              onChange={(e) => handleOptionChange(Number.parseInt(e.target.value))}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#031881] focus:border-[#031881]"
                              required={option.required}
                            >
                              <option value="">Select {option.option_name}</option>
                              {option.values.map((value: any) => {
                                const priceDisplay = getOptionPriceDisplay(value, product, customer);
                                return (
                                  <option
                                    key={value.option_value_id}
                                    value={value.option_value_id}
                                  >
                                    {value.option_value}
                                    {priceDisplay}
                                  </option>
                                );
                              })}
                            </select>
                          );
                        }
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {/* Quantity Selector */}
              <div className="border rounded-lg overflow-hidden mb-6">
                <div className="grid grid-cols-2 bg-gray-50 p-4 font-medium text-sm">
                  <div>Quantity</div>
                  {/* <div className="text-right">Price</div> */}
                </div>
                <div className="grid grid-cols-2 p-4 ">
                  <div className="flex">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(-1)}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center">{quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* <div className="text-right font-bold">
                    {(() => {
                      // Determine the base price based on user authentication and customer type
                      let basePrice: number;

                      if (!customer) {
                        // Not logged in or no customer data, use user_price
                        basePrice = product.user_price
                          ? Number.parseFloat(product.user_price)
                          : Number.parseFloat(product.product_price);
                      } else if (customer.wholesale_type === null) {
                        // Customer (not wholesale), use user_price
                        basePrice = product.user_price
                          ? Number.parseFloat(product.user_price)
                          : Number.parseFloat(product.product_price);
                      } else {
                        // Wholesale customer, use retail_price
                        basePrice = product.retail_price
                          ? Number.parseFloat(product.retail_price)
                          : Number.parseFloat(product.product_price);
                      }

                      // Calculate extra cost from selected options
                      let optionsPrice = 0;
                      if (product.options && product.options.length > 0) {
                        product.options.forEach(option => {
                          const selectedValueId = selectedOptions[option.option_id];
                          if (selectedValueId) {
                            const value = option.values.find((v: any) => v.option_value_id === selectedValueId);
                            if (value) {
                              const opPrice = value.has_discount && value.discounted_option_price
                                ? value.discounted_option_price
                                : Number.parseFloat(value.product_option_price || "0");
                              optionsPrice += opPrice;
                            }
                          }
                        });
                      }

                      const unitPrice =
                        product.has_discount && product.discounted_price
                          ? product.discounted_price + optionsPrice
                          : basePrice + optionsPrice;

                      return `$${(unitPrice * quantity).toFixed(2)}`;
                    })()}
                  </div> */}
                </div>
              </div>

              <div className="flex items-center justify-between mb-6 text-lg font-bold">
                <span>Subtotal</span>
                <span>
                  {(() => {
                    const itemTotal = calculateSubtotal() / quantity;
                    // calculateSubtotal() already returns itemPrice * quantity
                    // But wait, calculateSubtotal uses getItemPrice from store/cart which handles options.
                    // Let's rely on calculateSubtotal() as it should be correct if it uses the same logic.
                    // However, if calculateSubtotal relies on cart store logic, verify it works for 0 price base.

                    // Let's use calculateSubtotal() directly.
                    return `$${calculateSubtotal().toFixed(2)}`;
                  })()}
                </span>
              </div>

              {/* Purchase Type */}
              <div className="mb-6">
                <div className="flex gap-4 mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={purchaseType === "onetime"}
                      onChange={() => setPurchaseType("onetime")}
                      className="w-4 h-4 text-[#031881]"
                    />
                    <span className="text-black">One-time Purchase</span>
                  </label>
                </div>

                {product.add_to_subscription && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input
                        type="radio"
                        checked={purchaseType === "subscription"}
                        onChange={() => setPurchaseType("subscription")}
                        className="w-4 h-4 text-[#031881]"
                      />
                      <span className="font-medium text-black">
                        Subscribe & Deliver every
                      </span>
                    </label>
                    {purchaseType === "subscription" && (
                      <div className="space-y-3 mt-3">
                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                            Frequency
                          </label>
                          <div className="relative">
                            <select
                              value={subscriptionFrequency}
                              onChange={(e) => setSubscriptionFrequency(e.target.value)}
                              className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-[#031881] focus:border-transparent transition-all appearance-none cursor-pointer"
                            >
                              <option value="2 Weeks">Every 2 Weeks</option>
                              <option value="4 Weeks">Every 4 Weeks</option>
                              <option value="8 Weeks">Every 8 Weeks</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">
                            Start Date
                          </label>
                          <div className="relative">
                            <input
                              type="date"
                              min={new Date().toISOString().split('T')[0]}
                              value={deliveryStartDate}
                              onChange={(e) => setDeliveryStartDate(e.target.value)}
                              className="w-full pl-4 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-[#031881] focus:border-transparent transition-all placeholder:text-gray-400"
                              placeholder="Select start date"
                            />
                          </div>
                        </div>


                      </div>
                    )}
                  </div>
                )}
              </div>

              {isPendingWholesale ? (
                <div className="w-full rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-center">
                  <p className="font-semibold text-yellow-800 mb-1">Account Pending Approval</p>
                  <p className="text-sm text-yellow-700 mb-3">
                    You can browse our products, but ordering is available once your wholesale account is approved.
                  </p>
                  <a
                    href="/pending"
                    className="text-sm font-medium text-[#031881] underline underline-offset-2"
                  >
                    View approval status →
                  </a>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full py-6 bg-[#031881] hover:bg-[#021466] text-white font-semibold text-lg"
                  onClick={handleAddToCart}
                >
                  Add to Cart
                </Button>
              )}
            </div>
          </div>

          {/* Tabs Section */}
          <Tabs defaultValue="description" className="mb-16">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger
                value="description"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#031881] data-[state=active]:text-[#031881] text-lg"
              >
                Description
              </TabsTrigger>
              {product.show_specifications && (
                <TabsTrigger
                  value="specifications"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#031881] data-[state=active]:text-[#031881] text-lg"
                >
                  Specifications
                </TabsTrigger>
              )}
              {product.show_other_info && (
                <TabsTrigger
                  value="other"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-[#031881] data-[state=active]:text-[#031881]  text-lg"
                >
                  Other Info
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="description" className="mt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Product Description
              </h3>
              <div className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
                {product.product_description}
              </div>
            </TabsContent>

            {product.show_specifications && (
              <TabsContent value="specifications" className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Specifications
                </h3>
                <div className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
                  {product.product_desc_1 || "No specifications available."}
                </div>
              </TabsContent>
            )}

            {product.show_other_info && (
              <TabsContent value="other" className="mt-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Other Information
                </h3>
                <div className="text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">
                  {product.product_desc_2 || "No additional information available."}
                </div>
              </TabsContent>
            )}
          </Tabs>

          {/* Reviews Section */}
          <div className="mb-16">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              {/* <div>

                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Customer Reviews
                </h2>
              </div> */}
              {/* <select className="px-4 py-2 border border-gray-300 rounded-lg w-full md:w-auto">
                <option>4-star reviews</option>
                <option>5-star reviews</option>
                <option>All reviews</option>
              </select> */}
            </div>

            {/* {reviewsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-gray-500">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No reviews yet. Be the first to review this product!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                {reviews.map((review) => (
                  <Card key={review.review_id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {review.reviewer_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(review.created_at)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${star <= review.rating
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                                }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">
                        {review.review_text}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )} */}

            {/* <div className="flex justify-center gap-2 mb-12">
              <Button variant="outline" size="icon" className="rounded-full">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div> */}

            {/* Write Review */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Review this product
                </h3>

                <div className="mb-6">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Click to rate
                  </p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 ${star <= rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                            }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <Textarea
                    placeholder="Write your review here, what did you like the most?"
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    className="min-h-32 resize-none"
                    disabled={submittingReview}
                  />
                  {reviewText.length > 0 && reviewText.length < 10 && (
                    <p className="text-sm text-red-500 mt-1">
                      Review must be at least 10 characters ({reviewText.length}
                      /10)
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Your Name (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    disabled={submittingReview}
                    className="mb-2"
                  />
                </div>

                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Your Email (Optional)
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={reviewerEmail}
                    onChange={(e) => setReviewerEmail(e.target.value)}
                    disabled={submittingReview}
                  />
                </div>

                <Button
                  onClick={handleSubmitReview}
                  className="bg-[#031881] hover:bg-[#021466]"
                  disabled={
                    submittingReview || !rating || reviewText.trim().length < 10
                  }
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* You May Also Like */}
          {/* <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                You may also Like
              </h2>
              <Link href="/shop" className="w-full md:w-auto">
                <Button className="bg-[#031881] hover:bg-[#021466] w-full md:w-auto">
                  View All
                </Button>
              </Link>
            </div>

            <div className="text-center py-8 text-gray-500">
              <p>Related products will be displayed here</p>
              <Link href="/shop">
                <Button variant="outline" className="mt-4">
                  Browse All Products
                </Button>
              </Link>
            </div>
          </div> */}
        </div>
      </section>
    </div>
  );
}

// Helper to determine display price for option value
function getOptionPriceDisplay(value: any, product: any, customer: any) {
  let optionPrice = 0;
  let isWholesale = false;
  let isPremium = false;

  if (customer && customer.wholesale_type !== null) {
    isWholesale = true;
    isPremium =
      customer.wholesale_type === "premium" ||
      customer.service_type === "Full Service Wholesaler" ||
      customer.service_type === "Full Service";

    if (isPremium) {
      optionPrice = Number.parseFloat(value.wholesale_price_premium || "0");
    } else {
      optionPrice = Number.parseFloat(value.wholesale_price || "0");
    }
  } else {
    // Retail logic
    optionPrice = Number.parseFloat(value.standard_price || "0");
  }

  let displayPrice = 0;

  if (optionPrice > 0) {
    displayPrice = optionPrice;
  } else {
    displayPrice =
      value.has_discount && value.discounted_option_price
        ? value.discounted_option_price
        : Number.parseFloat(
          value.product_option_price || "0"
        );
  }

  return displayPrice > 0 ? ` (+$${displayPrice.toFixed(2)})` : "";
}
