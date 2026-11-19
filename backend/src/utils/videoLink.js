/**
 * Video links for promos.
 *
 * Admins can either upload a video file or paste a link to a YouTube or Vimeo
 * video. Only these two providers are accepted, so the frontend can always
 * embed the video in that provider's own player. Links are stored in the
 * existing promos.video_url column in a single canonical form, so no database
 * change is needed.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'];
const VIMEO_HOSTS = ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'];

/**
 * Turn any common YouTube or Vimeo URL into its canonical watch URL.
 * Returns { provider, id, url } or null when the link isn't a supported video.
 *
 *   https://youtu.be/ID, https://www.youtube.com/watch?v=ID,
 *   /shorts/ID, /embed/ID, /live/ID      → https://www.youtube.com/watch?v=ID
 *   https://vimeo.com/123456789,
 *   https://player.vimeo.com/video/123   → https://vimeo.com/123456789
 */
export const normalizeVideoLink = (raw) => {
    if (typeof raw !== 'string') return null;
    let u;
    try {
        u = new URL(raw.trim());
    } catch {
        return null;
    }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const host = u.hostname.toLowerCase();
    const parts = u.pathname.split('/').filter(Boolean);

    let ytId = null;
    if (host === 'youtu.be') ytId = parts[0];
    else if (YOUTUBE_HOSTS.includes(host)) {
        if (parts[0] === 'watch') ytId = u.searchParams.get('v');
        else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) ytId = parts[1];
    }
    if (ytId && YOUTUBE_ID.test(ytId)) {
        return { provider: 'youtube', id: ytId, url: `https://www.youtube.com/watch?v=${ytId}` };
    }

    if (VIMEO_HOSTS.includes(host)) {
        const vimeoId = host === 'player.vimeo.com' ? parts[1] : parts.find((p) => /^\d+$/.test(p));
        if (vimeoId && /^\d{6,12}$/.test(vimeoId)) {
            return { provider: 'vimeo', id: vimeoId, url: `https://vimeo.com/${vimeoId}` };
        }
    }
    return null;
};

export const VIDEO_LINK_ERROR = 'Paste a YouTube or Vimeo link, e.g. https://www.youtube.com/watch?v=… or https://vimeo.com/…';
