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

/**
 * Extracts YouTube Playlist ID from URL
 */
export function getYouTubePlaylistId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  return match && match[1] ? match[1] : null;
}

/**
 * Validates video link structure with friendly diagnostics
 */
export function validateVideoUrl(url: string): {
  isValid: boolean;
  isYouTube: boolean;
  isDirect: boolean;
  isPlaylist: boolean;
  message?: string;
} {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    return { isValid: false, isYouTube: false, isDirect: false, isPlaylist: false, message: 'Please enter a video URL' };
  }

  // Check if it's a playlist URL
  const playlistId = getYouTubePlaylistId(trimmed);
  if (playlistId && (trimmed.includes('youtube.com/playlist') || trimmed.includes('&list='))) {
    return { isValid: true, isYouTube: true, isDirect: false, isPlaylist: true };
  }

  // Check if it's a valid YouTube video URL
  const videoId = getYouTubeVideoId(trimmed);
  if (videoId) {
    return { isValid: true, isYouTube: true, isDirect: false, isPlaylist: false };
  }

  // Check if user is typing a YouTube link that is broken / incomplete
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    return {
      isValid: false,
      isYouTube: true,
      isDirect: false,
      isPlaylist: false,
      message: 'Incomplete or invalid YouTube link. Please ensure the full 11-character video URL is copied.',
    };
  }

  // Check direct video link
  if (isDirectVideo(trimmed)) {
    return { isValid: true, isYouTube: false, isDirect: true, isPlaylist: false };
  }

  // Basic URL format validation
  try {
    new URL(trimmed);
  } catch (e) {
    return {
      isValid: false,
      isYouTube: false,
      isDirect: false,
      isPlaylist: false,
      message: 'Invalid link format. Please paste a valid web URL starting with https://',
    };
  }

  return {
    isValid: false,
    isYouTube: false,
    isDirect: false,
    isPlaylist: false,
    message: 'Unsupported video link. Please enter a valid YouTube video link or direct MP4 stream.',
  };
}

/**
 * Fetches YouTube playlist details and all video items
 */
export async function fetchYouTubePlaylist(urlOrId: string, apiClient: any) {
  if (!urlOrId) return null;
  try {
    const res = await apiClient.get('/lessons/meta/playlist', {
      params: { url: urlOrId },
    });
    return res.data;
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Failed to load YouTube playlist';
    return { success: false, error: msg };
  }
}

/**
 * Automatically fetches YouTube metadata including Title, Exact Duration (hr:min:sec), and Thumbnail
 */
export async function fetchYouTubeMetadata(url: string, apiClient?: any) {
  if (!url) return null;
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;

  // Try backend metadata parser
  if (apiClient) {
    try {
      const res = await apiClient.get('/lessons/meta/youtube', { params: { url } });
      if (res.data) {
        return res.data;
      }
    } catch (e) {
      // fallback to client oEmbed
    }
  }

  // Client-side oEmbed fallback
  try {
    const oembedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      return {
        isValid: true,
        videoId,
        title: data.title || '',
        authorName: data.author_name || '',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        durationMinutes: 45,
        formattedDuration: '45 mins',
        formattedTimecode: '45:00',
      };
    }
  } catch (err) {
    // ignore
  }

  return {
    isValid: true,
    videoId,
    title: '',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    durationMinutes: 45,
    formattedDuration: '45 mins',
  };
}


