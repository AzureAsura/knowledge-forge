// Cloudinary serves a resized, auto-format copy when transformations are inserted after `/upload/`.
// Other hosts (and blob: previews) are returned untouched.
export function cloudinaryWidth(url: string, width: number) {
  return url.includes('res.cloudinary.com') && url.includes('/upload/')
    ? url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`)
    : url
}
