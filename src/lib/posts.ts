import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'

const postsDirectory = path.join(process.cwd(), 'posts')

export interface PostData {
  slug: string
  title: string
  date?: string
  category: string
  subcategory?: string
  content: string
  excerpt?: string
}

export interface PostMeta {
  slug: string
  title: string
  date?: string
  category: string
  subcategory?: string
  excerpt?: string
}

function getAllPostPaths(dir: string = postsDirectory, relativePath: string = ''): Array<{
  fullPath: string
  relativePath: string
  fileName: string
}> {
  const posts: Array<{
    fullPath: string
    relativePath: string
    fileName: string
  }> = []
  
  const items = fs.readdirSync(dir)
  
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory()) {
      // 하위 디렉토리 탐색
      const newRelativePath = relativePath ? `${relativePath}/${item}` : item
      posts.push(...getAllPostPaths(fullPath, newRelativePath))
    } else if (item.endsWith('.md')) {
      posts.push({
        fullPath,
        relativePath,
        fileName: item
      })
    }
  }
  
  return posts
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const postPaths = getAllPostPaths()
  const posts: PostMeta[] = []
  
  for (const { fullPath, category, subcategory, fileName } of postPaths) {
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    const slug = fileName.replace(/\.md$/, '')
    const title = data.title || slug.replace(/^\d+\./, '').replace(/-/g, ' ')
    const excerpt = data.excerpt || content.slice(0, 200) + '...'
    
    posts.push({
      slug: subcategory ? `${category}/${subcategory}/${slug}` : `${category}/${slug}`,
      title,
      date: data.date,
      category,
      subcategory,
      excerpt
    })
  }
  
  return posts.sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    }
    return 0
  })
}

export async function getPostBySlug(slug: string): Promise<PostData | null> {
  try {
    const slugParts = slug.split('/')
    const fileName = slugParts.pop() + '.md'
    const categoryPath = slugParts.join('/')
    
    const fullPath = path.join(postsDirectory, categoryPath, fileName)
    
    if (!fs.existsSync(fullPath)) {
      return null
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    // 마크다운을 HTML로 변환
    const processedContent = await remark()
      .use(html, { sanitize: false })
      .process(content)
    
    const contentHtml = processedContent.toString()
    
    const title = data.title || fileName.replace(/\.md$/, '').replace(/^\d+\./, '').replace(/-/g, ' ')
    const category = slugParts[0] || ''
    const subcategory = slugParts[1] || undefined
    
    return {
      slug,
      title,
      date: data.date,
      category,
      subcategory,
      content: contentHtml,
      excerpt: data.excerpt || content.slice(0, 200) + '...'
    }
  } catch (error) {
    console.error('Error reading post:', error)
    return null
  }
}

export async function getPostsByCategory(category: string): Promise<PostMeta[]> {
  const allPosts = await getAllPosts()
  return allPosts.filter(post => post.category === category)
}

export function getCategories(): string[] {
  const postPaths = getAllPostPaths()
  const categories = new Set(postPaths.map(p => p.category))
  return Array.from(categories)
}