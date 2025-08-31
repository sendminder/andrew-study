import Link from "next/link";
import { getAllPosts, getCategories } from "@/lib/posts";
import Layout from "@/components/Layout";

export default async function Home() {
  const posts = await getAllPosts();
  const categories = getCategories();

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Andrew&apos;s Study Blog</h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300">
            개발 공부 기록과 지식 공유 공간
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          <aside className="lg:col-span-1 order-2 lg:order-1">
            <div className="lg:sticky lg:top-8">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">카테고리</h2>
              <div className="flex flex-wrap gap-2 lg:block lg:space-y-2">
                {categories.map(category => (
                  <Link 
                    key={category}
                    href={`/category/${category}`}
                    className="inline-block bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-sm lg:bg-transparent lg:dark:bg-transparent lg:px-0 lg:py-0 lg:rounded-none text-blue-600 dark:text-blue-400 hover:underline capitalize"
                  >
                    {category}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          <main className="lg:col-span-3 order-1 lg:order-2">
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
          </main>
        </div>
      </div>
    </Layout>
  );
}
