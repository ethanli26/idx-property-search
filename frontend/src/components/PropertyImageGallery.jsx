import { useState, useRef, useEffect } from "react";
import "./PropertyImageGallery.css";

function PropertyImageGallery({ photos, alt }) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const overlayRef = useRef(null);

  //A div is not in the tab order, so on its own it can never hold focus, and a
  //keydown handler on an unfocused element never fires. tabIndex makes it
  //focusable; focusing it here is the other half — without both, Escape is lost.
  useEffect(() => {
    if (lightboxOpen) overlayRef.current?.focus();
  }, [lightboxOpen]);

  if (!photos || photos.length === 0) {
    return <div className="gallery__empty">No photos available</div>;
  }

  const total = photos.length;

  function step(delta) {
    setIndex((current) => (current + delta + total) % total);
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setLightboxOpen(false);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      step(-1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      step(1);
    }
  }

  //only a press on the backdrop closes, a press on the photo itself does not
  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) setLightboxOpen(false);
  }

  return (
    <div className="gallery">
      {/* the arrows sit beside the main button rather than inside it, so the
          photo can be stepped through without opening the viewer */}
      <div className="gallery__stage">
        <button
          type="button"
          className="gallery__main"
          aria-label="Open photo viewer"
          onClick={() => setLightboxOpen(true)}
        >
          <img src={photos[index]} alt={alt || "Property"} />
        </button>

        {total > 1 && (
          <>
            <button
              type="button"
              className="gallery__stage-arrow gallery__stage-arrow--prev"
              aria-label="Previous photo"
              onClick={() => step(-1)}
            >
              {"‹"}
            </button>
            <button
              type="button"
              className="gallery__stage-arrow gallery__stage-arrow--next"
              aria-label="Next photo"
              onClick={() => step(1)}
            >
              {"›"}
            </button>
          </>
        )}

        <span className="gallery__counter">
          {index + 1} / {total}
        </span>
      </div>

      {total > 1 && (
        <div className="gallery__thumbs">
          {photos.map((photo, photoIndex) => (
            <button
              key={photo + photoIndex}
              type="button"
              className={
                photoIndex === index
                  ? "gallery__thumb gallery__thumb--current"
                  : "gallery__thumb"
              }
              aria-label={`View photo ${photoIndex + 1}`}
              aria-current={photoIndex === index ? "true" : undefined}
              onClick={() => setIndex(photoIndex)}
            >
              <img src={photo} alt="" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          ref={overlayRef}
          className="gallery__lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          onClick={handleOverlayClick}
        >
          <button
            type="button"
            className="gallery__close"
            aria-label="Close photo viewer"
            onClick={() => setLightboxOpen(false)}
          >
            {"×"}
          </button>

          {total > 1 && (
            <button
              type="button"
              className="gallery__nav gallery__nav--prev"
              aria-label="Previous photo"
              onClick={() => step(-1)}
            >
              {"‹"}
            </button>
          )}

          <img
            className="gallery__full"
            src={photos[index]}
            alt={alt || "Property"}
          />

          {total > 1 && (
            <button
              type="button"
              className="gallery__nav gallery__nav--next"
              aria-label="Next photo"
              onClick={() => step(1)}
            >
              {"›"}
            </button>
          )}

          <span className="gallery__lightbox-counter">
            {index + 1} / {total}
          </span>
        </div>
      )}
    </div>
  );
}

export default PropertyImageGallery;
