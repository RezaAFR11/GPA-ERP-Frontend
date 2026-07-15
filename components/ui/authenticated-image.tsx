"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { authenticatedFilesApi } from "@/lib/api";


type AuthenticatedImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
};


export function AuthenticatedImage({ src, alt, className, ...props }: AuthenticatedImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let loadedUrl: string | null = null;

    authenticatedFilesApi.fetch(src).then((response) => {
      if (!active) return;
      loadedUrl = URL.createObjectURL(response.data);
      setObjectUrl(loadedUrl);
    }).catch(() => {
      if (active) setObjectUrl(null);
    });

    return () => {
      active = false;
      if (loadedUrl) URL.revokeObjectURL(loadedUrl);
    };
  }, [src]);

  if (!objectUrl) {
    return <div className={className} aria-label={alt} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={objectUrl} alt={alt} className={className} {...props} />;
}
