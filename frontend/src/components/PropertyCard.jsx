import { Link } from "react-router-dom";
import { listingShape } from "../utils/propTypes";
import { readPhotoUrls } from "../utils/photoData";
import PropertyImageCarousel from "./PropertyImageCarousel";
import FavoriteButton from "./FavoriteButton";
import "./PropertyCard.css";

function displayPrice(amount) {
  if (!amount || Number(amount) <= 0) return "Price on request";
  return Number(amount).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function displayStat(value, label) {
  if (value === null || value === undefined || value === "") return null;
  return `${value} ${label}`;
}

function PropertyCard({ listing }) {
  const photos = readPhotoUrls(listing.L_Photos);

  const stats = [
    displayStat(listing.L_Keyword2, "bd"),
    displayStat(listing.LM_Dec_3, "ba"),
    displayStat(listing.LM_Int2_3, "sqft"),
  ].filter(Boolean);

  const region = [listing.L_City, listing.L_State].filter(Boolean).join(", ");

  return (
    <article className="listing-card">
      <Link
        className="listing-card__link"
        to={`/property/${listing.L_ListingID}`}
      >
        <div className="listing-card__image">
          <PropertyImageCarousel
            photos={photos}
            alt={listing.L_Address || "Property"}
          />
          <FavoriteButton listingId={listing.L_ListingID} />
        </div>

        <div className="listing-card__body">
          <p className="listing-card__price">
            {displayPrice(listing.L_SystemPrice)}
          </p>
          <p className="listing-card__address">
            {listing.L_Address || "Address unavailable"}
          </p>
          {region && <p className="listing-card__region">{region}</p>}
          {stats.length > 0 && (
            <p className="listing-card__stats">{stats.join("  ")}</p>
          )}
        </div>
      </Link>
    </article>
  );
}

PropertyCard.propTypes = {
  listing: listingShape.isRequired,
};

export default PropertyCard;
