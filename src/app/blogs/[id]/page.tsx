"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { api } from "@/lib/api"
import Image from "next/image"

interface Blog {
  blog_id: number
  title: string
  slug: string
  category: string
  excerpt: string
  content: string
  featured_image_url: string
  author: string
  tags: string[]
  read_time: number
  published_date: string
}

export default function BlogDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const [slug, setSlug] = useState<string>("")
  const [blogPost, setBlogPost] = useState<Blog | null>(null)
  const [relatedBlogs, setRelatedBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(true)

  // Handle params (can be Promise in Next.js 15+ or object in Next.js 14)
  useEffect(() => {
    const resolveParams = async () => {
      if (params && typeof params === 'object' && 'then' in params) {
        const resolved = await params
        setSlug(resolved.id)
      } else {
        setSlug((params as { id: string }).id)
      }
    }
    resolveParams()
  }, [params])

  // Fetch blog post
  useEffect(() => {
    const fetchBlog = async () => {
      if (!slug) return

      try {
        setLoading(true)
        const response = await api.get(`/store/blogs/${slug}`)
        setBlogPost(response.data)

        // Fetch related blogs (same category)
        if (response.data.category) {
          const relatedResponse = await api.get(`/store/blogs?category=${encodeURIComponent(response.data.category)}&limit=3`)
          setRelatedBlogs(
            (relatedResponse.data.blogs || []).filter((blog: Blog) => blog.slug !== slug).slice(0, 3)
          )
        } else {
          // Fetch any recent blogs if no category
          const relatedResponse = await api.get("/store/blogs?limit=3")
          setRelatedBlogs(
            (relatedResponse.data.blogs || []).filter((blog: Blog) => blog.slug !== slug).slice(0, 3)
          )
        }
      } catch (error: any) {
        console.error("Failed to fetch blog:", error)
        // Don't show error for auth issues - blogs should work without auth
        if (error.response?.status === 404) {
          // Blog not found - will show empty state
        }
        setBlogPost(null)
        setRelatedBlogs([])
      } finally {
        setLoading(false)
      }
    }

    fetchBlog()
  }, [slug])

  const formatDate = (dateString: string) => {
    if (!dateString) return ""
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col bg-white min-h-screen">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">Loading blog post...</div>
        </div>
      </div>
    )
  }

  if (!blogPost) {
    return (
      <div className="flex flex-col bg-white min-h-screen">
        <div className="container mx-auto px-6 py-16">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
            <Link href="/blogs">
              <Button>Back to Blogs</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-white">
      {/* Breadcrumb */}
      <div className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/blogs" className="hover:text-[#2952E6]">Blogs</Link>
            <span>/</span>
            <span className="text-gray-900">{blogPost.category}</span>
          </div>
        </div>
      </div>

      {/* Blog Content */}
      <article className="py-16">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            {blogPost.published_date && (
              <p className="text-sm text-gray-500 mb-4">
                POSTED ON {formatDate(blogPost.published_date).toUpperCase()}
              </p>
            )}
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              {blogPost.title}
            </h1>
            {blogPost.author && (
              <p className="text-sm text-gray-500 mb-6">
                POSTED BY {blogPost.author.toUpperCase()}
              </p>
            )}
            {blogPost.tags && blogPost.tags.length > 0 && (
              <div className="flex justify-center gap-2 flex-wrap">
                {blogPost.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="border-[#2952E6] text-[#2952E6] px-4 py-1"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Featured Image */}
          {blogPost.featured_image_url && (
            <div className="relative aspect-video rounded-lg overflow-hidden mb-12">
              <Image
                src={blogPost.featured_image_url}
                alt={blogPost.title}
                fill
                className="object-cover"
                unoptimized={true}
                onError={(e) => {
                  console.error("Failed to load blog image:", blogPost.featured_image_url)
                  console.error("Image error:", e)
                }}
              />
            </div>
          )}

          {/* Content */}
          <div 
            className="prose prose-lg max-w-none"
            dangerouslySetInnerHTML={{ __html: blogPost.content }}
          />
        </div>
      </article>

      {/* Related Blogs */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Related Blogs</h2>

          {relatedBlogs.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              {relatedBlogs.map((blog) => (
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
                          console.error("Failed to load related blog image:", blog.featured_image_url)
                          console.error("Image error:", e)
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-700 to-gray-500 flex items-center justify-center">
                        <span className="text-white/40">Blog Image</span>
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
                      <p className="text-xs text-pink-500 font-semibold mb-2">
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
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3">
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
          ) : (
            <div className="text-center py-8 text-gray-500">No related blogs found</div>
          )}

          {/* Pagination */}
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="icon" className="rounded-full">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" className="rounded-full bg-[#2952E6] text-white">
              1
            </Button>
            <Button variant="outline" size="icon" className="rounded-full">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}

