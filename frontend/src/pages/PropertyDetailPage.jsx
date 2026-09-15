import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { loadListingById, loadOpenHouses } from "../api/listingsApi";
import { readPhotoUrls } from "../utils/photoData";
import PropertyImageGallery from "../components/PropertyImageGallery";
import PropertyMap from "../components/PropertyMap";
import OpenHouseList from "../components/OpenHouseList";
import "./PropertyDetailPage.css";

function displayPrice(amount) {
  if (!amount || Number(amount) <= 0) return "Price on request";
  return Number(amount).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function displayNumber(value) {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return null;
  return asNumber.toLocaleString("en-US");
}

//the Y/N columns arrive as 1/0, "Y"/"N", or true/false depending on the field
function yesNo(value) {
  if (value === null || value === undefined || value === "") return null;
  if (value === 1 || value === true || value === "1" || value === "Y") {
    return "Yes";
  }
  if (value === 0 || value === false || value === "0" || value === "N") {
    return "No";
  }
  return String(value);
}

//the feed stores enumerations as PascalCase run-ons like "SingleFamilyResidence"
function humanize(value) {
  if (typeof value !== "string") return value;
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim();
}

function lotSize(listing) {
  const acres = Number(listing.LotSizeAcres);
  //four decimal places of an acre is survey precision, not buyer information
  if (Number.isFinite(acres) && acres > 0) return `${acres.toFixed(2)} acres`;

  const squareFeet = Number(listing.LotSizeSquareFeet);
  if (Number.isFinite(squareFeet) && squareFeet > 0) {
    return `${displayNumber(squareFeet)} sqft`;
  }
  return null;
}

function hoaFee(listing) {
  const fee = Number(listing.AssociationFee);
  if (!Number.isFinite(fee) || fee <= 0) return null;

  const frequency = listing.AssociationFeeFrequency;
  const amount = displayPrice(fee);
  return frequency ? `${amount} ${String(frequency).toLowerCase()}` : amount;
}

//a curated set, in the order a buyer scans them. Rows without a value are
//dropped rather than rendered blank, because the feed fills these unevenly.
function buildDetailRows(listing) {
  const candidates = [
    ["MLS #", listing.L_DisplayId],
    ["Property type", humanize(listing.L_Type_)],
    ["Year built", listing.YearBuilt],
    ["Lot size", lotSize(listing)],
    ["Stories", listing.StoriesTotal],
    ["Garage", yesNo(listing.GarageYN)],
    ["Pool", yesNo(listing.PoolPrivateYN)],
    ["Fireplace", yesNo(listing.FireplaceYN)],
    ["Flooring", humanize(listing.Flooring)],
    ["HOA fee", hoaFee(listing)],
    ["Subdivision", humanize(listing.SubdivisionName)],
    ["School district", listing.HighSchoolDistrict],
    ["Days on market", listing.DaysOnMarket],
    ["Status", humanize(listing.L_Status)],
  ];

  return candidates
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([label, value]) => ({ label, value: String(value) }));
}

function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [openHouses, setOpenHouses] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [failure, setFailure] = useState(null);

  //a navigation keeps the scroll position, so a card clicked from halfway down
  //the grid would otherwise open its detail page halfway down as well
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let active = true;

    async function fetchDetail() {
      setIsFetching(true);
      setFailure(null);

      try {
        const found = await loadListingById(id);
        if (!active) return;
        setProperty(found);

        //a missing open house list is not a broken page, the property still stands
        try {
          const events = await loadOpenHouses(id);
          if (active) setOpenHouses(Array.isArray(events) ? events : []);
        } catch {
          if (active) setOpenHouses([]);
        }
      } catch (err) {
        if (!active) return;
        setFailure(err.message);
        setProperty(null);
        setOpenHouses([]);
      } finally {
        if (active) setIsFetching(false);
      }
    }

    fetchDetail();
    return () => {
      active = false;
    };
  }, [id]);

  if (isFetching) {
    return (
      <main className="detail">
        <Link className="detail__back" to="/">
          Back to results
        </Link>
        <div className="detail__skeleton" />
      </main>
    );
  }

  if (failure || !property) {
    return (
      <main className="detail">
        <Link className="detail__back" to="/">
          Back to results
        </Link>
        <div className="detail__notice">
          <p className="detail__notice-title">Property unavailable</p>
          <p className="detail__notice-body">
            {failure || `No property found with listing ID ${id}`}
          </p>
        </div>
      </main>
    );
  }

  const photos = readPhotoUrls(property.L_Photos);
  const region = [property.L_City, property.L_State, property.L_Zip]
    .filter(Boolean)
    .join(", ");
  const detailRows = buildDetailRows(property);

  const stats = [
    [property.L_Keyword2, "Beds"],
    [property.LM_Dec_3, "Baths"],
    [displayNumber(property.LM_Int2_3), "Sq Ft"],
    [property.YearBuilt, "Built"],
  ].filter(([value]) => value !== null && value !== undefined && value !== "");

  return (
    <main className="detail">
      <Link className="detail__back" to="/">
        Back to results
      </Link>

      <PropertyImageGallery photos={photos} alt={property.L_Address} />

      <header className="detail__header">
        <p className="detail__price">{displayPrice(property.L_SystemPrice)}</p>
        <h1 className="detail__address">
          {property.L_Address || "Address unavailable"}
        </h1>
        {region && <p className="detail__region">{region}</p>}
      </header>

      {stats.length > 0 && (
        <ul className="detail__stats">
          {stats.map(([value, label]) => (
            <li className="detail__stat" key={label}>
              <span className="detail__stat-value">{value}</span>
              <span className="detail__stat-label">{label}</span>
            </li>
          ))}
        </ul>
      )}

      {property.L_Remarks && (
        <section className="detail__section">
          <h2 className="detail__section-title">Description</h2>
          <p className="detail__description">{property.L_Remarks}</p>
        </section>
      )}

      {detailRows.length > 0 && (
        <section className="detail__section">
          <h2 className="detail__section-title">Property Details</h2>
          <dl className="detail__facts">
            {detailRows.map((row) => (
              <div className="detail__fact" key={row.label}>
                <dt className="detail__fact-label">{row.label}</dt>
                <dd className="detail__fact-value">{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <PropertyMap
        latitude={property.LMD_MP_Latitude}
        longitude={property.LMD_MP_Longitude}
        address={property.L_Address}
      />

      <OpenHouseList openHouses={openHouses} />
    </main>
  );
}

export default PropertyDetailPage;
