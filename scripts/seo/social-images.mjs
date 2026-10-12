// Verify actual files: a populated og:image tag can still point to a 404 or HTML fallback.
export async function checkSocialImages(pages, base, canonicalOrigin) {
  const findings = [];
  const urls = new Set(pages.map(page => page.og?.['og:image']).filter(Boolean));
  for (const href of urls) {
    try {
      const image = new URL(href);
      const target = image.origin === canonicalOrigin
        ? new URL(`${image.pathname}${image.search}`, base).href : image.href;
      const response = await fetch(target, { signal: AbortSignal.timeout(10000) });
      const type = response.headers.get('content-type') || '';
      const bytes = new Uint8Array(await response.arrayBuffer());
      const raster = (bytes[0] === 0xff && bytes[1] === 0xd8)
        || (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47)
        || (String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
          && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP');
      if (!response.ok || !type.startsWith('image/') || !raster) {
        findings.push({ severity: 'error', code: 'social-image-invalid', message: `${href}: HTTP ${response.status}, ${type}, valid JPEG/PNG/WebP=${raster}` });
      }
    } catch (error) {
      findings.push({ severity: 'error', code: 'social-image-fetch', message: `${href}: ${error.message}` });
    }
  }
  return findings;
}
