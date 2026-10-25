// The backend cuts excerpts from raw Markdown, so the client always sends its own plain-text one.
export const markdownToPlain = (md: string) =>
  md
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/^```.*$/gm, '')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~|]/g, '')
    .replace(/\s-{3,}(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
