// apps/web/src/lib/video-utils.ts

/**
 * Extracts YouTube Video ID from any YouTube URL format
 * (watch?v=, youtu.be/, embed/, shorts/, live/)
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;

  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^"&?\/\s]{11})/i;
  const match = url.match(regExp);

  return match && match[1] ? match[1] : null;
}

/**
 * Gets high quality YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(url: string): string {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
  return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60';
}

/**
 * Generates responsive YouTube embed URL
 */
export function getYouTubeEmbedUrl(url: string, autoPlay: boolean = false): string | null {
  const videoId = getYouTubeVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&rel=0&modestbranding=1&enablejsapi=1`;
  }
  return null;
}

/**
 * Checks if URL is a direct MP4/HLS stream
 */
export function isDirectVideo(url: string): boolean {
  if (!url) return false;
  return url.endsWith('.mp4') || url.endsWith('.m3u8') || url.includes('r2.cloudflarestorage.com') || url.includes('r2.dev');
}
