import { useState, type KeyboardEvent } from 'react'
import { Chip } from './ui'

/**
 * 标签输入器：输入后按 Enter / 逗号 生成标签胶囊，点击胶囊上的 × 可移除。
 */
export function TagInput({
  value,
  onChange,
  placeholder = '输入后按回车添加',
  autoFocus,
}: {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  autoFocus?: boolean
}) {
  const [text, setText] = useState('')

  const commit = (raw: string) => {
    const parts = raw
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    const merged = [...value]
    for (const p of parts) {
      if (!merged.some((t) => t.toLowerCase() === p.toLowerCase())) merged.push(p)
    }
    onChange(merged)
    setText('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const native = e.nativeEvent as unknown as { isComposing?: boolean }
    if (native.isComposing) return
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(text)
    } else if (e.key === 'Backspace' && text === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className="focus-ring flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 transition-colors duration-150 hover:border-line-strong focus-within:border-brand"
      onClick={(e) => {
        const input = e.currentTarget.querySelector('input')
        if (input) input.focus()
      }}
    >
      {value.map((tag, i) => (
        <Chip key={`${tag}-${i}`} tone="brand" onRemove={() => onChange(value.filter((_, idx) => idx !== i))}>
          {tag}
        </Chip>
      ))}
      <input
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (text.trim()) commit(text)
        }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="h-6 min-w-32 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
      />
    </div>
  )
}
