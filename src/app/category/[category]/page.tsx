import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostsByCategory, getCategories } from "@/lib/posts";
import Layout from "@/components/Layout";

interface PageProps {
  params: {
    category: string
  }
}

export async function generateStaticParams() {
  const categories = getCategories()
  
  return categories.map(category => ({
    category
  }))
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
  return {
    title: `${resolvedParams.category} 카테고리`,
    description: `${resolvedParams.category} 카테고리의 모든 포스트`
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const resolvedParams = await params
  const posts = await getPostsByCategory(resolvedParams.category)

  if (posts.length === 0) {
    notFound()
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <Link 
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline mb-6 sm:mb-8 inline-flex items-center text-sm sm:text-base"
        >
          ← 홈으로 돌아가기
        </Link>

        <header className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 capitalize">
            {resolvedParams.category} 카테고리
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
            {posts.length}개의 포스트
          </p>
        </header>

        <div className="space-y-6 sm:space-y-8">
          {posts.map(post => (
            <article key={post.slug} className="border-b border-gray-200 dark:border-gray-700 pb-6 sm:pb-8">
              <header className="mb-3 sm:mb-4">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                    {post.category}
                  </span>
                  {post.subcategory && (
                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                      {post.subcategory}
                    </span>
                  )}
                  {post.date && (
                    <time dateTime={post.date} className="text-xs">
                      {new Date(post.date).toLocaleDateString('ko-KR')}
                    </time>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold mb-2 leading-tight">
                  <Link 
                    href={`/posts/${post.slug}`}
                    className="hover:text-blue-600 dark:hover:text-blue-400 block"
                  >
                    {post.title}
                  </Link>
                </h2>
              </header>
              {post.excerpt && (
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm sm:text-base line-clamp-3">
                  {post.excerpt}
                </p>
              )}
              <Link 
                href={`/posts/${post.slug}`}
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm sm:text-base inline-flex items-center"
              >
                더 읽기 →
              </Link>
            </article>
          ))}
        </div>
      </div>
    </Layout>
  );
}