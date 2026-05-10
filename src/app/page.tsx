
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { getProductImageUrl } from "@/lib/product-utils";
import { useAuthStore } from "@/store/auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface Product {
  product_id: number;
  product_name: string;
  product_description: string;
  product_price: string;
  user_price?: string;
  retail_price?: string;
  base_retail_price?: string;
  original_price?: number;
  discounted_price?: number;
  discount_percentage?: number;
  has_discount?: boolean;
  product_image?: string;
  product_images?: Array<
    { image_url: string; image_order?: number } | string
  > | null;
  header_name?: string;
  show_in_store?: boolean;
  premium_price_discounted?: string;
  product_price_premium?: string;
  wholesale_price?: string | number;
}

interface Review {
  review_id: number;
  rating: number;
  review_text: string;
  reviewer_name: string;
  reviewer_location?: string;
  created_at: string;
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [coffeeProducts, setCoffeeProducts] = useState<Product[]>([]);
  const [teaProducts, setTeaProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [coffeePage, setCoffeePage] = useState(1);
  const [teaPage, setTeaPage] = useState(1);
  const [brewingPage, setBrewingPage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { customer } = useAuthStore();
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    review_text: "",
    reviewer_name: "",
    reviewer_email: "",
    reviewer_location: "",
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newReview.rating || newReview.rating < 1 || newReview.rating > 5) {
      toast.error("Please select a rating between 1 and 5");
      return;
    }

    if (!newReview.review_text.trim() || newReview.review_text.trim().length < 10) {
      toast.error("Review text must be at least 10 characters");
      return;
    }

    if (!newReview.reviewer_name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      setIsSubmittingReview(true);
      const response = await api.post("/store/reviews/general", {
        rating: newReview.rating,
        review_text: newReview.review_text,
        reviewer_name: newReview.reviewer_name,
        reviewer_email: newReview.reviewer_email || undefined,
        reviewer_location: newReview.reviewer_location || undefined,
        source: "homepage",
      });

      toast.success("Review submitted successfully!");
      setIsReviewDialogOpen(false);
      setNewReview({
        rating: 5,
        review_text: "",
        reviewer_name: "",
        reviewer_email: "",
        reviewer_location: "",
      });
    } catch (error: any) {
      console.error("Review submission error:", error);
      const errorMessage = error.response?.data?.message || "Failed to submit review. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  useEffect(() => {
    fetchFeaturedProducts();
    fetchPublishedReviews();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setLoading(true);
      let coffeeProductsData: Product[] = [];
      let teaProductsData: Product[] = [];

      // Fetch featured coffee (featured_1) and tea (featured_2) products
      try {
        const [coffeeResponse, teaResponse] = await Promise.all([
          api
            .get("/store/products/featured/coffee", { params: { limit: 4 } })
            .catch(() => null),
          api
            .get("/store/products/featured/tea", { params: { limit: 4 } })
            .catch(() => null),
        ]);

        coffeeProductsData = coffeeResponse?.data?.products || [];
        teaProductsData = teaResponse?.data?.products || [];
      } catch (error: any) {
        console.warn("Failed to fetch featured products by flag:", error);
      }

      // If no featured products found, try fallback strategies
      if (coffeeProductsData.length === 0) {
        try {
          // Try to get products from "Coffee" category
          const fallbackResponse = await api.get("/store/products", {
            params: { limit: 4, search: "coffee" },
          });
          coffeeProductsData =
            fallbackResponse.data.products?.slice(0, 4) || [];
        } catch (fallbackError) {
          console.warn("Coffee fallback failed:", fallbackError);
        }
      }

      if (teaProductsData.length === 0) {
        try {
          // Try to get products from "Tea" category
          const fallbackResponse = await api.get("/store/products", {
            params: { limit: 4, search: "tea" },
          });
          teaProductsData = fallbackResponse.data.products?.slice(0, 4) || [];
        } catch (fallbackError) {
          console.warn("Tea fallback failed:", fallbackError);
        }
      }

      // Last resort: try general featured products
      if (coffeeProductsData.length === 0 && teaProductsData.length === 0) {
        try {
          const response = await api.get("/store/products/featured", {
            params: { limit: 8 },
          });
          const products = response.data.products || [];
          if (products.length > 0) {
            coffeeProductsData = products.slice(0, 4);
            teaProductsData = products.slice(4, 8);
          }
        } catch (fallbackError) {
          console.error("All fallback fetches failed:", fallbackError);
        }
      }

      // Filter products to only show those with show_in_store = true
      coffeeProductsData = coffeeProductsData.filter(
        (product: Product) => product.show_in_store !== false
      );
      teaProductsData = teaProductsData.filter(
        (product: Product) => product.show_in_store !== false
      );

      setCoffeeProducts(coffeeProductsData);
      setTeaProducts(teaProductsData);
    } catch (error: any) {
      console.error("Failed to fetch featured products:", error);
      // Set empty arrays on complete failure
      setCoffeeProducts([]);
      setTeaProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublishedReviews = async () => {
    try {
      setReviewsLoading(true);
      const response = await api.get("/store/reviews/general", {
        params: { limit: 6 },
      });
      setReviews(response.data.reviews || []);
    } catch (error: any) {
      console.error("Failed to fetch reviews:", error);
      // Use empty array if fetch fails - reviews are optional
      setReviews([]);
      // Don't show error toast - reviews are not critical
    } finally {
      setReviewsLoading(false);
    }
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

  // Product Card Component for Home Page
  const ProductCard = ({ product }: { product: Product }) => {
    const { displayPrice, strikePrice, isWholesale } = getProductPrices(product);

    return (
      <Link href={`/shop/${product.product_id}`} className="block h-full">
        <Card
          key={product.product_id}
          className="overflow-hidden hover:shadow-xl transition-shadow group h-full flex flex-col"
        >
          <div className="relative aspect-square w-full">
            {getProductImageUrl(product) ? (
              <img
                src={getProductImageUrl(product)!}
                alt={product.product_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-black/30" />
            )}
            {!getProductImageUrl(product) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="text-6xl font-light mb-2">25g</div>
                  <div className="text-sm">SAMPLE PACK</div>
                </div>
              </div>
            )}
          </div>
          <CardContent className="p-4 flex flex-col flex-1">
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-0">
                {product.product_name}
              </h3>
              <div className="flex items-center gap-2 mb-1 min-h-[20px]">
                {displayPrice > 0 ? (
                  isWholesale ? (
                    // WHOLESALE CUSTOMER
                    <>
                      {strikePrice ? (
                        // Show strike-through price (user_price - what regular customers pay)
                        <>
                          <span className="text-sm text-gray-500 line-through">
                            ${strikePrice.toFixed(2)}
                          </span>
                          <span className="text-xl font-bold text-[#2952E6]">
                            ${displayPrice.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        // No strike price available
                        <span className="text-xl font-bold text-[#2952E6]">
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
                            ${product.user_price
                              ? Number.parseFloat(product.user_price).toFixed(2)
                              : Number.parseFloat(product.product_price).toFixed(
                                2
                              )}
                          </span>
                          <span className="text-xl font-bold text-[#2952E6]">
                            ${product.discounted_price.toFixed(2)}
                          </span>
                          {product.discount_percentage &&
                            product.discount_percentage > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {product.discount_percentage}% OFF
                              </Badge>
                            )}
                        </div>
                      ) : (
                        // Regular price
                        <span className="text-xl font-bold text-[#2952E6]">
                          ${displayPrice.toFixed(2)}
                        </span>
                      )}
                    </>
                  )
                ) : null}
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {product.product_description}
              </p>
            </div>
            <Button
              asChild
              size="sm"
              className="w-full bg-[#2952E6] hover:bg-[#1e3fb3] mt-auto"
            >
              <span>View Product</span>
            </Button>
          </CardContent>
        </Card>
      </Link>
    );
  };

  // Static brewing images
  const BREWING_IMAGES = [
    {
      id: 1,
      image: "/assets/sndurex/Feature Card.png",
      alt: "St. Dreux Coffee Cups",
    },
    {
      id: 2,
      image: "/assets/sndurex/Feature Card (1).png",
      alt: "The Shepherd Coffee Bag",
    },
    {
      id: 3,
      image: "/assets/sndurex/Feature Card (2).png",
      alt: "Coffee Pouring",
    },
  ] as const;

  // Pagination constants
  const COFFEE_PRODUCTS_PER_PAGE = 4;
  const TEA_PRODUCTS_PER_PAGE = 4;
  const BREWING_IMAGES_PER_PAGE = 3;

  // Calculate pagination for coffee products (4 per page)
  const coffeeTotalPages = useMemo(() => {
    if (!coffeeProducts || coffeeProducts.length === 0) return 1;
    return Math.ceil(coffeeProducts.length / COFFEE_PRODUCTS_PER_PAGE);
  }, [coffeeProducts.length]);

  const displayedCoffeeProducts = useMemo(() => {
    if (!coffeeProducts || coffeeProducts.length === 0) return [];
    const startIndex = (coffeePage - 1) * COFFEE_PRODUCTS_PER_PAGE;
    const endIndex = startIndex + COFFEE_PRODUCTS_PER_PAGE;
    return coffeeProducts.slice(startIndex, endIndex);
  }, [coffeeProducts, coffeePage]);

  // Calculate pagination for tea products (4 per page)
  const teaTotalPages = useMemo(() => {
    if (!teaProducts || teaProducts.length === 0) return 1;
    return Math.ceil(teaProducts.length / TEA_PRODUCTS_PER_PAGE);
  }, [teaProducts.length]);

  const displayedTeaProducts = useMemo(() => {
    if (!teaProducts || teaProducts.length === 0) return [];
    const startIndex = (teaPage - 1) * TEA_PRODUCTS_PER_PAGE;
    const endIndex = startIndex + TEA_PRODUCTS_PER_PAGE;
    return teaProducts.slice(startIndex, endIndex);
  }, [teaProducts, teaPage]);

  // Calculate pagination for brewing images (3 per page)
  const brewingTotalPages = useMemo(() => {
    return Math.ceil(BREWING_IMAGES.length / BREWING_IMAGES_PER_PAGE);
  }, []);

  const displayedBrewingImages = useMemo(() => {
    const startIndex = (brewingPage - 1) * BREWING_IMAGES_PER_PAGE;
    const endIndex = startIndex + BREWING_IMAGES_PER_PAGE;
    return BREWING_IMAGES.slice(startIndex, endIndex);
  }, [brewingPage]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post("/store/newsletter/subscribe", {
        email: email.trim(),
      });

      toast.success(
        response.data.message || "Successfully subscribed to our newsletter!"
      );
      setEmail("");
    } catch (error: any) {
      console.error("Newsletter subscription error:", error);
      const errorMessage =
        error.response?.data?.message ||
        "Failed to subscribe. Please try again later.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative h-[600px] sm:h-[700px] md:h-[800px] bg-black">
        <div className="absolute inset-0">
          <Image
            src="/assets/sndurex/Wireframe - 14 (3).png"
            alt="St. Dreux Coffee"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-black/30" />
        </div>
        <div className="relative container mx-auto px-6 h-full flex items-center">
          <div className="max-w-2xl text-white">
            <p className="text-lg sm:text-xl mb-2 font-light italic">
              Crafted with love.
            </p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-6">
              Served with purpose.
            </h1>
            <p className="text-lg sm:text-xl mb-8 text-white/90">
              Crafted with passion, enjoyed in every sip. Taste the difference.
            </p>
            <Link href="/shop">
              <Button
                size="lg"
                className="bg-[#2952E6] hover:bg-[#1e3fb3] text-white px-8 py-6 text-lg"
              >
                Order Now
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Mission Statement */}
      <section
        className="relative w-screen py-16 bg-white"
        style={{
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
        }}
      >
        <div className="absolute inset-0">
          <Image
            src="/assets/sndurex/Frame 729.png"
            alt="Coffee Beans"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative container mx-auto px-6 text-center max-w-4xl z-10">
          <p className="text-white leading-relaxed text-lg">
            At St Dreux Coffee, authenticity drives every moment we share.
            Whether it&#39;s your pick-me-up or laid-back treat, we recognize
            that a cup is more than just something to sip. It&#39;s our mission
            to bring together brewers, baristas, and coffee-lovers to create
            something truly special.
          </p>
          <p className="text-white mt-4 italic text-lg">
            Every bean matters <span className="inline-block">—</span> to our
            community, one story, one shared enjoyment.
          </p>
        </div>
      </section>

      {/* Coffee Blends Section */}
      <section className="py-16 bg-[#F5F5F0]">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-gray-500 mb-2">Featured</p>
              <h2 className="text-4xl font-bold text-gray-900">
                Featured Products
              </h2>
              <p className="text-gray-600 mt-2">
                Arabica beans from around the world that tastes unbelievably
                good
              </p>
            </div>
            <Link href="/shop">
              <Button
                variant="outline"
                className="border-[#2952E6] text-[#2952E6] hover:bg-[#2952E6] hover:text-white"
              >
                View more
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : coffeeProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No featured  products available at the moment.
              </p>
              <Link href="/shop">
                <Button
                  variant="outline"
                  className="border-[#2952E6] text-[#2952E6] hover:bg-[#2952E6] hover:text-white"
                >
                  Browse All Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedCoffeeProducts.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          )}

          {coffeeTotalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setCoffeePage((p) => Math.max(1, p - 1))}
                disabled={coffeePage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from(
                { length: coffeeTotalPages || 1 },
                (_, i) => i + 1
              ).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant="outline"
                  size="icon"
                  className={`rounded-full ${coffeePage === pageNum ? "bg-[#2952E6] text-white" : ""
                    }`}
                  onClick={() => setCoffeePage(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() =>
                  setCoffeePage((p) => Math.min(coffeeTotalPages, p + 1))
                }
                disabled={coffeePage === coffeeTotalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Tea Products Section */}
      <section className="py-16 bg-[#F5F5F0]">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm text-gray-500 mb-2">Featured</p>
              <h2 className="text-4xl font-bold text-gray-900">
                Featured Products
              </h2>
              <p className="text-gray-600 mt-2">
                Premium selections for every taste
              </p>
            </div>
            <Link href="/shop">
              <Button
                variant="outline"
                className="border-[#2952E6] text-[#2952E6] hover:bg-[#2952E6] hover:text-white"
              >
                View more
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : teaProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                No featured products available at the moment.
              </p>
              <Link href="/shop">
                <Button
                  variant="outline"
                  className="border-[#2952E6] text-[#2952E6] hover:bg-[#2952E6] hover:text-white"
                >
                  Browse All Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {displayedTeaProducts.map((product) => (
                <ProductCard key={product.product_id} product={product} />
              ))}
            </div>
          )}

          {teaTotalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setTeaPage((p) => Math.max(1, p - 1))}
                disabled={teaPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: teaTotalPages || 1 }, (_, i) => i + 1).map(
                (pageNum) => (
                  <Button
                    key={pageNum}
                    variant="outline"
                    size="icon"
                    className={`rounded-full ${teaPage === pageNum ? "bg-[#2952E6] text-white" : ""
                      }`}
                    onClick={() => setTeaPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() =>
                  setTeaPage((p) => Math.min(teaTotalPages, p + 1))
                }
                disabled={teaPage === teaTotalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Wholesale Partner Section */}
      <section
        className="w-screen py-16 bg-[#5C4033]"
        style={{
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
        }}
      >
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-96 lg:h-[500px] rounded-lg overflow-hidden">
              <Image
                src="/assets/sndurex/Rectangle 183.png"
                alt="Coffee Beans"
                fill
                className="object-cover"
              />
            </div>
            <div className="text-white">
              <p
                className="text-lg sm:text-xl mb-2 font-light italic"
                style={{ fontFamily: "cursive" }}
              >
                Become a
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                Wholesale Partner
              </h2>
              <p className="text-white/90 mb-6 leading-relaxed text-lg">
                At St. Dreux Coffee, we collaborate to create exceptional
                experiences. We are dedicated to making things happen and enjoy
                pushing boundaries to ensure you receive the best possible
                service.
              </p>
              <p className="text-white/90 mb-8 leading-relaxed text-lg">
                If you're inspired by this and are ready to discover how we can
                make a difference for you, reach out below and let's take the
                next step together.
              </p>
              <Link href="/wholesale-info">
                <Button
                  size="lg"
                  className="bg-[#2952E6] hover:bg-[#1e3fb3] text-white px-8 py-6 text-lg rounded-lg"
                >
                  Partner with Us!
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Subscription Section */}
      <section
        className="w-screen py-16"
        style={{
          backgroundColor: "rgba(20, 39, 102, 1)",
          marginLeft: "calc(50% - 50vw)",
          marginRight: "calc(50% - 50vw)",
        }}
      >
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white order-2 lg:order-1">
              <p
                className="text-lg sm:text-xl mb-2 font-light italic"
                style={{ fontFamily: "cursive" }}
              >
                Your Coffee Journey
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                on St. Dreux's Subscription
              </h2>
              <p className="text-white/90 mb-6 leading-relaxed text-lg">
                Make great coffee part of your daily ritual. Choose your
                favorite blend, set your schedule, and receive fresh, perfectly
                roasted beans at your doorstep.
              </p>
              <p className="text-white/90 mb-8 leading-relaxed text-lg">
                Simple, flexible, and full of heart — just how coffee should be.
              </p>
              <Link href="/shop?purchaseType=subscription">
                <Button
                  size="lg"
                  className="bg-white text-[#142766] hover:bg-white/90 px-8 py-6 text-lg rounded-lg"
                >
                  Subscribe
                </Button>
              </Link>
            </div>
            <div className="relative h-96 lg:h-[500px] order-1 lg:order-2">
              <div className="absolute inset-0 rounded-lg overflow-hidden">
                <Image
                  src="/assets/sndurex/Rectangle 180 (1).png"
                  alt="St. Dreux Subscription Coffee Bags"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-[#F5F5F0]">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div className="text-center md:text-left mb-6 md:mb-0">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                Our customers
              </h2>
              <p className="text-2xl text-gray-600 italic">
                keep coming back{" "}
                <span className="italic" style={{ fontFamily: "cursive" }}>
                  for more.
                </span>
              </p>
            </div>

            <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#2952E6] hover:bg-[#1e3fb3] text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Write a Review
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Write a Review</DialogTitle>
                  <DialogDescription>
                    Share your experience with us. Your review will be posted after moderation.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleReviewSubmit} className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="rating">Rating</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-6 h-6 cursor-pointer hover:scale-110 transition-transform ${star <= newReview.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                            }`}
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newReview.reviewer_name}
                      onChange={(e) => setNewReview({ ...newReview, reviewer_name: e.target.value })}
                      placeholder="Your Name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newReview.reviewer_email}
                      onChange={(e) => setNewReview({ ...newReview, reviewer_email: e.target.value })}
                      placeholder="Your Email"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location (Optional)</Label>
                    <Input
                      id="location"
                      value={newReview.reviewer_location}
                      onChange={(e) => setNewReview({ ...newReview, reviewer_location: e.target.value })}
                      placeholder="City, Country"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="review">Review</Label>
                    <Textarea
                      id="review"
                      value={newReview.review_text}
                      onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                      placeholder="Tell us about your experience..."
                      required
                      minLength={10}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isSubmittingReview} className="bg-[#2952E6] hover:bg-[#1e3fb3]">
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {reviewsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No reviews available yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {reviews.map((review) => (
                <Card key={review.review_id} className="relative">
                  <CardContent className="pt-12 pb-6">
                    <div className="absolute top-6 left-6 text-6xl text-gray-200">
                      "
                    </div>
                    <p className="text-gray-700 mb-6 relative z-10 leading-relaxed text-sm">
                      {review.review_text}
                    </p>
                    <div className="border-t pt-4">
                      <p className="font-semibold text-gray-900">
                        {review.reviewer_name}
                      </p>
                      {review.reviewer_location && (
                        <p className="text-sm text-gray-500">
                          {review.reviewer_location}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Brewing Gallery */}
      <section className="py-16 bg-[#F5F5F0]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              See What's{" "}
              <span className="italic" style={{ fontFamily: "cursive" }}>
                Brewing
              </span>
            </h2>
            <p className="text-gray-600">
              Follow us @stdreux_coffee. Snap, share, and tag us — let&#39;s
              create stories, one cup at a time.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {displayedBrewingImages.map((item) => (
              <div
                key={item.id}
                className="relative aspect-square overflow-hidden rounded-lg group cursor-pointer"
              >
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </div>
            ))}
          </div>

          {brewingTotalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => setBrewingPage((p) => Math.max(1, p - 1))}
                disabled={brewingPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from(
                { length: brewingTotalPages || 1 },
                (_, i) => i + 1
              ).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant="outline"
                  size="icon"
                  className={`rounded-full ${brewingPage === pageNum ? "bg-[#2952E6] text-white" : ""
                    }`}
                  onClick={() => setBrewingPage(pageNum)}
                >
                  {pageNum}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() =>
                  setBrewingPage((p) => Math.min(brewingTotalPages, p + 1))
                }
                disabled={brewingPage === brewingTotalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>


    </div>
  );
}