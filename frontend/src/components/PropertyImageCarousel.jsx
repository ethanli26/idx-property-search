import { useState } from "react";
import PropTypes from "prop-types";
import "./PropertyImageCarousel.css";

function PropertyImageCarousel({ photos, alt }) {
  const [index, setIndex] = useState(0);
  const [brokenPhotos, setBrokenPhotos] = useState(() => new Set());

  if (!photos || photos.length === 0) {
    return <div className="carousel__empty">No photo</div>;
  }

  const currentPhoto = photos[index];
  const isBroken = brokenPhotos.has(index);
  const hasMultiple = photos.length > 1;

  //the carousel sits inside the card's link, so an arrow press must neither
  //navigate nor bubble up to it
  function step(event, delta) {
    event.preventDefault();
    event.stopPropagation();
    setIndex((current) => (current + delta + photos.length) % photos.length);
  }

  function markBroken(brokenIndex) {
    setBrokenPhotos((current) => new Set(current).add(brokenIndex));
  }

  return (
    <div className="carousel">
      {isBroken ? (
        <div className="carousel__empty">No photo</div>
      ) : (
        <img
          className="carousel__photo"
          src={currentPhoto}
          alt={alt || "Property"}
          onError={() => markBroken(index)}
        />
      )}

      {hasMultiple && (
        <>
          <button
            type="button"
            className="carousel__arrow carousel__arrow--prev"
            aria-label="Previous photo"
            onClick={(event) => step(event, -1)}
          >
            {"‹"}
          </button>
          <button
            type="button"
            className="carousel__arrow carousel__arrow--next"
            aria-label="Next photo"
            onClick={(event) => step(event, 1)}
          >
            {"›"}
          </button>
          <span className="carousel__counter">
            {index + 1} / {photos.length}
          </span>
        </>
      )}
    </div>
  );
}

PropertyImageCarousel.propTypes = {
  photos: PropTypes.arrayOf(PropTypes.string),
  alt: PropTypes.string,
};

export default PropertyImageCarousel;
