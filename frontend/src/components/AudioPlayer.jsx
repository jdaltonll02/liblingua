// Resolves both local relative paths ("uploads/audio/…") and full S3/CDN URLs.
function resolveUrl(src) {
  if (!src) return null;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return `/${src}`;
}

export default function AudioPlayer({ src, label = 'Listen to source audio' }) {
  const url = resolveUrl(src);
  if (!url) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <audio controls className="w-full rounded-lg" src={url}>
        Your browser does not support the audio element.
      </audio>
    </div>
  );
}
