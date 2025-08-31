'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TreeNode } from '@/lib/posts'

interface SidebarProps {
  tree: TreeNode[]
}

interface TreeItemProps {
  node: TreeNode
  level: number
}

function TreeItem({ node, level }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(level === 0) // 최상위는 기본 열림

  const paddingLeft = `${level * 1.5}rem`

  return (
    <div>
      <div 
        style={{ paddingLeft }}
        className="flex items-center py-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded"
      >
        {node.type === 'folder' ? (
          <>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center text-left text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 w-full"
            >
              <span className="mr-2 text-xs">
                {isOpen ? '📂' : '📁'}
              </span>
              {node.name}
            </button>
          </>
        ) : (
          <Link
            href={`/posts/${node.slug}`}
            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 w-full"
          >
            <span className="mr-2 text-xs">📄</span>
            {node.name.replace(/^\d+\./, '').replace(/-/g, ' ')}
          </Link>
        )}
      </div>
      
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map((child, index) => (
            <TreeItem key={index} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({ tree }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* 모바일 오버레이 */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 사이드바 토글 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:shadow-xl transition-shadow lg:hidden"
        aria-label="사이드바 토글"
      >
        <svg
          className="w-6 h-6 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* 사이드바 */}
      <div
        className={`
          fixed top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto lg:w-72
        `}
      >
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Posts
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 lg:hidden"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* 트리 뷰 */}
          <div className="space-y-1">
            {tree.map((node, index) => (
              <TreeItem key={index} node={node} level={0} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}