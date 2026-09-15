import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { loadListingById } from "../api/listingsApi";
import { useFavorites } from "../hooks/useFavorites";
import PropertyCard from "../components/PropertyCard";
import "./FavoritesPage.css";

function FavoritesPage() {
  const { favoriteIds, count, clear } = useFavorites();
  const [listings, setListings] = useState([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadSaved() {
      if (favoriteIds.length === 0) {
        if (active) {
          setListings([]);
          setIsFetching(false);
        }
        return;
      }

      setIsFetching(true);

      //only ids are stored, so the rows are fetched fresh and prices stay
      //current. A listing pulled from the feed since it was saved resolves to
      //null rather than emptying the whole page.
      const settled = await Promise.all(
        favoriteIds.map((id) => loadListingById(id).catch(() => null))
      );

      if (!active) return;
      setListings(settled.filter(Boolean));
      setIsFetching(false);
    }

    loadSaved();
    return () => {
      active = false;
    };
  }, [favoriteIds]);

  //filtering what is already loaded means unfavouriting removes the card at
  //once, rather than after the refetch that the id change also kicks off
  const visible = listings.filter((listing) =>
    favoriteIds.includes(String(listing.L_ListingID))
  );

  const showSkeletons = isFetching && visible.length === 0 && count > 0;

  return (
    <main className="favorites">
      <header className="favorites__header">
        <h1 className="favorites__title">Saved Properties</h1>
        <div className="favorites__meta">
          <Link className="favorites__back" to="/">
            All properties
          </Link>
          {count > 0 && (
            <button type="button" className="favorites__clear" onClick={clear}>
              Clear all
            </button>
          )}
          <p className="favorites__count">
            {count === 1 ? "1 saved" : `${count} saved`}
          </p>
        </div>
      </header>
      <div className="favorites__rule" />

      {showSkeletons && (
        <div className="favorites__grid">
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <div key={i} className="favorites__skeleton" />
          ))}
        </div>
      )}

      {!showSkeletons && visible.length === 0 && (
        <div className="favorites__notice">
          <p className="favorites__notice-title">Nothing saved yet</p>
          <p className="favorites__notice-body">
            Tap the heart on any property to keep it here. Saved properties stay
            on this device between visits.
          </p>
          <Link className="favorites__browse" to="/">
            Browse properties
          </Link>
        </div>
      )}

      {visible.length > 0 && (
        <div className="favorites__grid">
          {visible.map((listing) => (
            <PropertyCard key={listing.L_ListingID} listing={listing} />
          ))}
        </div>
      )}
    </main>
  );
}

export default FavoritesPage;
