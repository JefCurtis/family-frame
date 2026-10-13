// Resizes an image once with the Cloudflare Images binding (IMAGES), before it's stored in KV.
// The frame's Wi-Fi is slow and its CPU decodes big JPEGs slowly, so stored images are sized for
// its screen. One transformation per stored image, well inside the free 5,000 a month. Without
// the binding, for small images, or if resizing fails or doesn't help, the original is kept.
export async function shrink(env, bytes, type, width, minBytes = 150 * 1024) {
  if (!env.IMAGES || bytes.byteLength < minBytes) return { bytes, type };
  try {
    const out = await env.IMAGES.input(new Blob([bytes]).stream())
      .transform({ width, fit: 'scale-down' })
      .output({ format: 'image/jpeg', quality: 80 });
    const small = await out.response().arrayBuffer();
    return small.byteLength < bytes.byteLength ? { bytes: small, type: 'image/jpeg' } : { bytes, type };
  } catch {
    return { bytes, type };
  }
}
