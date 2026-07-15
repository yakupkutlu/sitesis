import { useEffect, useState } from "react";

function SecureImage({ src, alt, className }) {
  const [imageUrl, setImageUrl] = useState("");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!src) {
      const timeoutId = window.setTimeout(() => {
        setImageUrl("");
        setHasError(false);
      }, 0);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    let objectUrl = "";
    const controller = new AbortController();

    async function loadImage() {
      try {
        setHasError(false);

        const response = await fetch(src, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Görsel alınamadı.");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        setImageUrl(objectUrl);
      } catch {
        if (!controller.signal.aborted) {
          setHasError(true);
          setImageUrl("");
        }
      }
    }

    loadImage();

    return () => {
      controller.abort();

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (!src || hasError) {
    return (
      <div className={className ? `${className} image-placeholder` : "image-placeholder"}>
        Görsel yok
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className={className ? `${className} image-placeholder` : "image-placeholder"}>
        Görsel yükleniyor...
      </div>
    );
  }

  return <img className={className} src={imageUrl} alt={alt} />;
}

export default SecureImage;
