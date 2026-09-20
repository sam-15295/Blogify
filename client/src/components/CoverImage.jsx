import { useState } from "react";

// Shows the image, or `placeholder` when there is no image or it fails to load
// (deleted file, expired link, offline) so the UI never displays a broken-image icon.
export default function CoverImage({ src, alt = "", className, placeholder = null }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src || failedSrc === src) return placeholder;
  return <img src={src} alt={alt} loading="lazy" className={className} onError={() => setFailedSrc(src)} />;
}
