import { useState, useEffect, useCallback } from "react";
import { loadListings } from "../services/listingsApi";
import PropertyCard from "../components/PropertyCard";
import PropertyFilters from "../components/PropertyFilters";
import Pagination from "../components/Pagination";
import "./ListingsPage.css";

const PAGE_SIZE = 20;

function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [matchCount, setMatchCount] = useState(0);
  const [isFetching, setIsFetching] = useState(true);
  const [failure, setFailure] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(PAGE_SIZE);

  useEffect(() => {
    let active = true;

    async function fetchPage() {
      setIsFetching(true);
      setFailure(null);

      try {
        const payload = await loadListings({
          ...activeFilters,
          limit: itemsPerPage,
          offset: (currentPage - 1) * itemsPerPage,
        });
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
  }, [activeFilters, currentPage, itemsPerPage]);

  //a new filter set describes a different result set, so the old page number
  //no longer means anything and the user goes back to the start of it
  const handleSearch = useCallback((submitted) => {
    setActiveFilters(submitted);
    setCurrentPage(1);
  }, []);

  const handleClear = useCallback(() => {
    setActiveFilters({});
    setCurrentPage(1);
  }, []);

  //only the page moves here, so whatever filters are active carry over untouched
  const handlePageChange = useCallback((nextPage) => {
    setCurrentPage(nextPage);
    window.scrollTo(0, 0);
  }, []);

  const totalPages = Math.ceil(matchCount / itemsPerPage);
  const firstShown = (currentPage - 1) * itemsPerPage + 1;
  const lastShown = firstShown + listings.length - 1;

  let statusLabel;
  if (isFetching) {
    statusLabel = "Loading";
  } else if (failure) {
    statusLabel = "Unavailable";
  } else if (matchCount === 0) {
    statusLabel = "No properties";
  } else {
    statusLabel = `Showing ${firstShown}-${lastShown} of ${matchCount.toLocaleString()} properties`;
  }

  return (
    <main className="listings">
      <header className="listings__header">
        <h1 className="listings__title">Properties</h1>
        <p className="listings__count">{statusLabel}</p>
      </header>
      <div className="listings__rule" />

      <PropertyFilters
        onSearch={handleSearch}
        onClear={handleClear}
        busy={isFetching}
      />

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
          <p className="listings__notice-body">
            No listings match these filters. Try widening your search.
          </p>
        </div>
      )}

      {!isFetching && !failure && listings.length > 0 && (
        <div className="listings__grid">
          {listings.map((listing) => (
            <PropertyCard key={listing.L_ListingID} listing={listing} />
          ))}
        </div>
      )}

      {!isFetching && !failure && listings.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </main>
  );
}

export default ListingsPage;
