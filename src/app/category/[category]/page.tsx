import Link from "next/link";
import { notFound } from "next/navigation";
import { getPostsByCategory, getCategories } from "@/lib/posts";

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
    <div className="max-w-4xl mx-auto p-8">
      <Link 
        href="/"
        className="text-blue-600 dark:text-blue-400 hover:underline mb-8 inline-block"
      >
        ← 홈으로 돌아가기
      </Link>

      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4 capitalize">
          {resolvedParams.category} 카테고리
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {posts.length}개의 포스트
        </p>
      </header>

      <div className="space-y-8">
        {posts.map(post => (
          <article key={post.slug} className="border-b border-gray-200 dark:border-gray-700 pb-8">
            <header className="mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                  {post.category}
                </span>
                {post.subcategory && (
                  <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                    {post.subcategory}
                  </span>
                )}
                {post.date && (
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString('ko-KR')}
                  </time>
                )}
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                <Link 
                  href={`/posts/${post.slug}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {post.title}
                </Link>
              </h2>
            </header>
            {post.excerpt && (
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {post.excerpt}
              </p>
            )}
            <Link 
              href={`/posts/${post.slug}`}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              더 읽기 →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}