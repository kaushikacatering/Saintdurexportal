
import { Suspense } from "react";
import { LoadingWithLogo } from "@/components/loading-with-logo";
import { ShopPageContent } from "./shop-content";

// Force dynamic rendering - prevents Next.js from caching this page as static
// This fixes the Engintron/Nginx upstream cache serving stale HTML
export const dynamic = 'force-dynamic';

export default function ShopPage() {
  return (
    <Suspense fallback={<LoadingWithLogo message="Loading..." size="lg" />}>
      <ShopPageContent />
    </Suspense>
  );
}
