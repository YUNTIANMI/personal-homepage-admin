import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

const components: Components = {
  // 外链在新标签页打开，并补齐 noopener 安全属性
  a({ node, ...props }) {
    const href = props.href || ''
    const external = /^https?:\/\//i.test(href)
    return (
      <a
        {...props}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      />
    )
  },
  // 表格包一层横向滚动容器，长表格在窄屏不破版
  table({ node, ...props }) {
    return (
      <div className="md-table-scroll">
        <table {...props} />
      </div>
    )
  },
  code({ node, className, children, ...props }) {
    // 行内代码与块级代码统一走样式表（.md :not(pre) > code / .md pre code）
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
}

export function MarkdownRenderer({
  content,
  className = '',
}: {
  content: string
  className?: string
}) {
  return (
    <div className={`md ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
