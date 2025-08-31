import Sidebar from './Sidebar'
import { getPostsTree } from '@/lib/posts'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const tree = getPostsTree()

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Sidebar tree={tree} />
      <div className="lg:ml-72">
        <main className="pt-16 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  )
}