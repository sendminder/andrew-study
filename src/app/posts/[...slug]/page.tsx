import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getAllPosts } from '@/lib/posts'

interface PageProps {
  params: {
    slug: string[]
  }
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  
  return posts.map(post => ({
    slug: post.slug.split('/')
  }))
}

export async function generateMetadata({ params }: PageProps) {
  const resolvedParams = await params
  const slug = resolvedParams.slug.join('/')
  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found'
    }
  }

  return {
    title: post.title,
    description: post.excerpt,
  }
}

export default async function PostPage({ params }: PageProps) {
  const resolvedParams = await params
  const slug = resolvedParams.slug.join('/')
  const post = await getPostBySlug(slug)

  if (!post) {
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

      <article className="prose prose-lg dark:prose-invert max-w-none">
        <header className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
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
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            {post.title}
          </h1>
        </header>

        <div 
          className="markdown-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      <nav className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <Link 
          href="/"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← 모든 포스트 보기
        </Link>
      </nav>
    </div>
  )
}