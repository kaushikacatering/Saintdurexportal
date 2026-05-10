"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { api } from "@/lib/api"

interface Blog {
  blog_id: number
  title: string
  slug: string
  category: string
  excerpt: string
  featured_image_url: string
  author: string
  tags: string[]
  read_time: number
  is_featured: boolean
  published_date: string
}

export default function BlogsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Fetch blogs and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Fetch categories
        const categoriesRes = await api.get("/store/blogs/categories")
        setCategories(categoriesRes.data || [])

        // Fetch blogs
        const params = new URLSearchParams()
        if (selectedFilters.length > 0) {
          params.append("category", selectedFilters[0])
        }
        if (searchQuery.trim()) {
          params.append("search", searchQuery.trim())
        }
        params.append("limit", "20")
        params.append("offset", String((currentPage - 1) * 20))

        const blogsRes = await api.get(`/store/blogs?${params.toString()}`)
        setBlogs(blogsRes.data.blogs || [])
        setTotalPages(Math.ceil((blogsRes.data.total || 0) / 20))
      } catch (error: any) {
        console.error("Failed to fetch blogs:", error)
        // Don't show error for auth issues - blogs should work without auth
        setBlogs([]) // Set empty array on error
        setTotalPages(1)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedFilters, currentPage, searchQuery])

  const toggleFilter = (filter: string) => {
    if (selectedFilters.includes(filter)) {
      setSelectedFilters(selectedFilters.filter(f => f !== filter))
    } else {
      setSelectedFilters([filter]) // Only allow one filter at a time
    }
  }

  // Get featured blog
  const featuredBlog = blogs.find(blog => blog.is_featured) || blogs[0]
  const otherBlogs = blogs.filter(blog => !blog.is_featured || blog.blog_id !== featuredBlog?.blog_id)

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-64 sm:h-80 md:h-96 bg-gradient-to-r from-amber-900/80 to-amber-800/80">
        <div className="absolute inset-0">
          <Image
            src="/assets/sndurex/Frame 1000007198.png"
            alt="Freshly Brewed Reads"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 to-black/40" />
        </div>
        <div className="relative container mx-auto px-6 h-full flex flex-col items-center justify-center text-white text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4">Freshly Brewed Reads</h1>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl">
            Thoughts, updates, and everything we're passionate about –
          </p>
          <p className="text-lg sm:text-xl text-white/90 max-w-2xl">
            straight from our roastery to your screen.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Blogs</h2>
            <p className="text-gray-600">
              Crafted with passion, enjoyed in every sip. Taste the difference!
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8">
            <div className="relative max-w-md mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Q Search Products"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-6"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedFilters.includes(category) ? "default" : "outline"}
                  className={`px-4 py-2 cursor-pointer text-sm ${
                    selectedFilters.includes(category)
                      ? "bg-[#2952E6] hover:bg-[#1e3fb3] text-white"
                      : "bg-[#E3F2FD] border-[#2952E6] text-[#2952E6] hover:bg-[#BBDEFB]"
                  }`}
                  onClick={() => toggleFilter(category)}
                >
                  {category}
                  {selectedFilters.includes(category) && (
                    <span className="ml-2 text-white">×</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Featured Blog */}
          {featuredBlog && (
            <div className="mb-16">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
                  {featuredBlog.featured_image_url ? (
                    <Image
                      src={featuredBlog.featured_image_url}
                      alt={featuredBlog.title}
                      fill
                      className="object-cover"
                      unoptimized={true}
                      onError={(e) => {
                        console.error("Failed to load featured blog image:", featuredBlog.featured_image_url)
                        console.error("Image error:", e)
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-900 to-amber-800 flex items-center justify-center">
                      <span className="text-white/40">No Image</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-[#C4A484] italic mb-2">Featured Blog</p>
                  {featuredBlog.category && (
                    <p className="text-xs text-[#C4A484] uppercase font-semibold mb-2">
                      {featuredBlog.category}
                    </p>
                  )}
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    {featuredBlog.title}
                  </h2>
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {featuredBlog.excerpt || "Read more to discover..."}
                  </p>
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                    {featuredBlog.author && <span>By {featuredBlog.author}</span>}
                    {featuredBlog.read_time && <span>{featuredBlog.read_time} min read</span>}
                    {featuredBlog.published_date && (
                      <span>{formatDate(featuredBlog.published_date)}</span>
                    )}
                  </div>
                  <Link href={`/blogs/${featuredBlog.slug}`}>
                    <Button variant="link" className="text-[#2952E6] p-0 text-base font-medium">
                      Read more →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Other Blogs */}
          <div className="mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">Other Blogs</h3>
            <p className="text-gray-600 mb-8">
              Crafted with passion, enjoyed in every sip. Taste the difference!
            </p>

            {loading ? (
              <div className="text-center py-12">Loading blogs...</div>
            ) : otherBlogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">No blogs found</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherBlogs.map((blog) => (
                  <Card key={blog.blog_id} className="overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="relative aspect-[4/3]">
                      {blog.featured_image_url ? (
                        <Image
                          src={blog.featured_image_url}
                          alt={blog.title}
                          fill
                          className="object-cover"
                          unoptimized={true}
                          onError={(e) => {
                            console.error("Failed to load blog image:", blog.featured_image_url)
                            console.error("Image error:", e)
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-500 flex items-center justify-center">
                          <span className="text-white/40">No Image</span>
                        </div>
                      )}
                      {blog.read_time && (
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-white/90 text-gray-900 hover:bg-white">
                            {blog.read_time} MIN READ
                          </Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-6">
                      {blog.category && (
                        <p className="text-xs text-[#C4A484] uppercase font-semibold mb-2">
                          {blog.category}
                        </p>
                      )}
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        {blog.title}
                      </h3>
                      <div className="text-sm text-gray-500 mb-3">
                        {blog.author && <span>By {blog.author}</span>}
                        {blog.published_date && (
                          <span className="ml-2">{formatDate(blog.published_date)}</span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                        {blog.excerpt || "Read more..."}
                      </p>
                      <Link href={`/blogs/${blog.slug}`}>
                        <Button variant="link" className="text-[#2952E6] p-0">
                          Read more →
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant="outline"
                  size="icon"
                  className={`rounded-full ${currentPage === page ? "bg-[#2952E6] text-white" : ""}`}
                  onClick={() => {
                    setCurrentPage(page)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  setCurrentPage(p => Math.min(totalPages, p + 1))
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

