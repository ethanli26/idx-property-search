import { readPhotoUrls } from "../utils/photoData";
import "./PropertyCard.css";

//format a price, or returns a placeholder when it's null or zero.
function displayPrice(amount) {
  if (!amount || Number(amount) <= 0) return "Price unavailable";
  return Number(amount).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

//formats a stat, or a dash when the value is missing.
function displayStat(value, label) {
  if (value === null || value === undefined || value === "") return null;
  return `${value} ${label}`;
}

function PropertyCard({ listing }) {
  const photos = readPhotoUrls(listing.L_Photos);
  const coverPhoto = photos[0];

  const stats = [
    displayStat(listing.L_Keyword2, "bd"),
    displayStat(listing.LM_Dec_3, "ba"),
    displayStat(listing.LM_Int2_3, "sqft"),
  ].filter(Boolean);

  return (
    <article className="listing-card">
      <div className="listing-card__image">
        {coverPhoto ? (
          <img src={coverPhoto} alt={listing.L_Address || "Property"} />
        ) : (
          <div className="listing-card__no-image">No photo available</div>
        )}
      </div>

      <div className="listing-card__body">
        <p className="listing-card__price">{displayPrice(listing.L_SystemPrice)}</p>
        <p className="listing-card__address">{listing.L_Address || "Address unavailable"}</p>
        <p className="listing-card__region">
          {[listing.L_City, listing.L_State].filter(Boolean).join(", ")}
        </p>
        {stats.length > 0 && (
          <p className="listing-card__stats">{stats.join(" · ")}</p>
        )}
      </div>
    </article>
  );
}

export default PropertyCard;