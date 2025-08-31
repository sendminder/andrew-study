import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'

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
  
  for (const { fullPath, relativePath, fileName } of postPaths) {
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    const slug = fileName.replace(/\.md$/, '')
    const title = data.title || slug.replace(/^\d+\./, '').replace(/-/g, ' ')
    const excerpt = data.excerpt || content.slice(0, 200) + '...'
    
    // 경로에서 카테고리와 하위카테고리 추출
    const pathParts = relativePath.split('/').filter(Boolean)
    const category = pathParts[0] || 'uncategorized'
    const subcategory = pathParts.length > 1 ? pathParts.slice(1).join('/') : undefined
    
    // 슬러그 생성: relativePath + fileName (확장자 제거)
    const fullSlug = relativePath ? `${relativePath}/${slug}` : slug
    
    posts.push({
      slug: fullSlug,
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
    const directoryPath = slugParts.join('/')
    
    const fullPath = path.join(postsDirectory, directoryPath, fileName)
    
    if (!fs.existsSync(fullPath)) {
      console.log('File not found:', fullPath)
      return null
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = matter(fileContents)
    
    // 마크다운을 HTML로 변환 (문법 하이라이팅 포함)
    const processedContent = await remark()
      .use(remarkRehype)
      .use(rehypeHighlight)
      .use(rehypeStringify)
      .process(content)
    
    const contentHtml = processedContent.toString()
    
    const title = data.title || fileName.replace(/\.md$/, '').replace(/^\d+\./, '').replace(/-/g, ' ')
    
    // 경로에서 카테고리와 하위카테고리 추출
    const pathParts = directoryPath.split('/').filter(Boolean)
    const category = pathParts[0] || 'uncategorized'
    const subcategory = pathParts.length > 1 ? pathParts.slice(1).join('/') : undefined
    
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
  const categories = new Set<string>()
  
  for (const { relativePath } of postPaths) {
    const pathParts = relativePath.split('/').filter(Boolean)
    if (pathParts.length > 0) {
      categories.add(pathParts[0])
    }
  }
  
  return Array.from(categories)
}