import { useEffect } from 'react';

type MetadataOptions = {
  title?: string;
  description?: string;
};

const ensureMetaTag = (
  selector: string,
  attributes: Record<string, string>
): HTMLMetaElement => {
  const existing = document.querySelector<HTMLMetaElement>(selector);
  if (existing) {
    return existing;
  }

  const meta = document.createElement('meta');
  Object.entries(attributes).forEach(([key, value]) => {
    meta.setAttribute(key, value);
  });
  document.head.appendChild(meta);
  return meta;
};

export const usePageMetadata = ({ title, description }: MetadataOptions) => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const previousTitle = document.title;
    const ogTitleTag = ensureMetaTag('meta[property="og:title"]', {
      property: 'og:title',
      content: previousTitle,
    });

    const descriptionTag = description
      ? ensureMetaTag('meta[name="description"]', {
          name: 'description',
          content: '',
        })
      : null;

    const ogDescriptionTag = description
      ? ensureMetaTag('meta[property="og:description"]', {
          property: 'og:description',
          content: '',
        })
      : null;

    const previousDescription = descriptionTag?.getAttribute('content') ?? null;
    const previousOgTitle = ogTitleTag.getAttribute('content') ?? null;
    const previousOgDescription =
      ogDescriptionTag?.getAttribute('content') ?? null;

    if (title) {
      document.title = title;
      ogTitleTag.setAttribute('content', title);
    }

    if (description && descriptionTag) {
      descriptionTag.setAttribute('content', description);
    }

    if (description && ogDescriptionTag) {
      ogDescriptionTag.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle;
      if (previousOgTitle !== null) {
        ogTitleTag.setAttribute('content', previousOgTitle);
      }

      if (descriptionTag) {
        if (previousDescription !== null) {
          descriptionTag.setAttribute('content', previousDescription);
        } else {
          descriptionTag.removeAttribute('content');
        }
      }

      if (ogDescriptionTag) {
        if (previousOgDescription !== null) {
          ogDescriptionTag.setAttribute('content', previousOgDescription);
        } else {
          ogDescriptionTag.removeAttribute('content');
        }
      }
    };
  }, [title, description]);
};
