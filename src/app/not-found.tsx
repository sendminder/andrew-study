import Link from 'next/link'
import Layout from '@/components/Layout'

export default function NotFound() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 text-center">
        <div className="py-12 sm:py-20">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">404</h1>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">페이지를 찾을 수 없습니다</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
          </p>
          <Link 
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </Layout>
  )
}