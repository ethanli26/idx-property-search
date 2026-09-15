import { useFavorites } from "../hooks/useFavorites";
import "./FavoriteButton.css";
import PropTypes from "prop-types";

function FavoriteButton({ listingId }) {
  const { isFavorite, toggle } = useFavorites();
  const saved = isFavorite(listingId);

  function handleClick(event) {
    //the whole card is a link to the detail page, so the heart has to stop the
    //event before it reaches the anchor or saving would navigate away
    event.preventDefault();
    event.stopPropagation();
    toggle(listingId);
  }

  return (
    <button
      type="button"
      className={saved ? "favorite favorite--on" : "favorite"}
      aria-pressed={saved}
      aria-label={saved ? "Remove from favorites" : "Save to favorites"}
      onClick={handleClick}
    >
      {saved ? "♥" : "♡"}
    </button>
  );
}

FavoriteButton.propTypes = {
  listingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
};

export default FavoriteButton;
