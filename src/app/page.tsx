import Link from "next/link";
import { getAllPosts, getCategories } from "@/lib/posts";

export default async function Home() {
  const posts = await getAllPosts();
  const categories = getCategories();

  return (
    <div className="max-w-4xl mx-auto p-8">
      <header className="mb-12">
        <h1 className="text-4xl font-bold mb-4">Andrew's Study Blog</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          개발 공부 기록과 지식 공유 공간
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-xl font-semibold mb-4">카테고리</h2>
            <ul className="space-y-2">
              {categories.map(category => (
                <li key={category}>
                  <Link 
                    href={`/category/${category}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline capitalize"
                  >
                    {category}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <main className="lg:col-span-3">
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
        </main>
      </div>
    </div>
  );
}
