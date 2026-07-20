import { useState } from "react";
import { readPhotoUrls } from "../utils/photoData";
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
  const coverPhoto = photos[0];
  const [imageBroken, setImageBroken] = useState(false);
  const showPhoto = coverPhoto && !imageBroken;

  const stats = [
    displayStat(listing.L_Keyword2, "bd"),
    displayStat(listing.LM_Dec_3, "ba"),
    displayStat(listing.LM_Int2_3, "sqft"),
  ].filter(Boolean);

  const region = [listing.L_City, listing.L_State].filter(Boolean).join(", ");

  return (
    <article className="listing-card">
      <div className="listing-card__image">
        {showPhoto ? (
          <img
            src={coverPhoto}
            alt={listing.L_Address || "Property"}
            onError={() => setImageBroken(true)}
          />
        ) : (
          <div className="listing-card__no-image">No photo</div>
        )}
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
          <p className="listing-card__stats">{stats.join("\u00A0\u00A0")}</p>
        )}
      </div>
    </article>
  );
}

export default PropertyCard;