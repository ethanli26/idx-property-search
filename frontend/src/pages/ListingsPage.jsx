import { useState, useEffect } from "react";
import { loadListings } from "../services/listingsApi";
import PropertyCard from "../components/PropertyCard";
import "./ListingsPage.css";

const PAGE_SIZE = 20;

function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [matchCount, setMatchCount] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [failure, setFailure] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchPage() {
      setIsFetching(true);
      setFailure(null);

      try {
        const payload = await loadListings({ limit: PAGE_SIZE, offset: 0 });
        if (!active) return;
        setListings(payload.results);
        setMatchCount(payload.total);
      } catch (err) {
        if (!active) return;
        setFailure(err.message);
        setListings([]);
        setMatchCount(0);
      } finally {
        if (active) setIsFetching(false);
      }
    }

    fetchPage();
    return () => {
      active = false;
    };
  }, []);

  let statusLabel;
  if (isFetching) {
    statusLabel = "Loading";
  } else if (failure) {
    statusLabel = "Unavailable";
  } else {
    statusLabel = `${listings.length} of ${matchCount.toLocaleString()}`;
  }

  return (
    <main className="listings">
      <header className="listings__header">
        <h1 className="listings__title">Properties</h1>
        <p className="listings__count">{statusLabel}</p>
      </header>
      <div className="listings__rule" />

      {failure && (
        <div className="listings__notice listings__notice--error">
          <p className="listings__notice-title">Could not load properties</p>
          <p className="listings__notice-body">{failure}</p>
        </div>
      )}

      {isFetching && (
        <div className="listings__grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="listings__skeleton" />
          ))}
        </div>
      )}

      {!isFetching && !failure && listings.length === 0 && (
        <div className="listings__notice">
          <p className="listings__notice-title">No properties found</p>
          <p className="listings__notice-body">Try adjusting your search.</p>
        </div>
      )}

      {!isFetching && !failure && listings.length > 0 && (
        <div className="listings__grid">
          {listings.map((listing) => (
            <PropertyCard key={listing.L_ListingID} listing={listing} />
          ))}
        </div>
      )}
    </main>
  );
}

export default ListingsPage;