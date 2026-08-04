import { useState } from "react";
import "./PropertyFilters.css";
import PriceBand from "./PriceBand";

const BLANK_FORM = {
  city: "",
  zipcode: "",
  minPrice: "",
  maxPrice: "",
  beds: "",
  baths: "",
};

function PropertyFilters({ onSearch, onClear, busy }) {
  const [form, setForm] = useState(BLANK_FORM);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSearch(event) {
    event.preventDefault();
    onSearch(form);
  }

  function handleClear() {
    setForm(BLANK_FORM);
    onClear();
  }

  return (
    <form className="filters" onSubmit={handleSearch}>
      <div className="filters__field">
        <label className="filters__label" htmlFor="filter-city">City</label>
        <input
          id="filter-city"
          className="filters__input"
          type="text"
          value={form.city}
          onChange={(e) => updateField("city", e.target.value)}
        />
      </div>

      <div className="filters__field">
        <label className="filters__label" htmlFor="filter-zip">ZIP Code</label>
        <input
          id="filter-zip"
          className="filters__input"
          type="text"
          value={form.zipcode}
          onChange={(e) => updateField("zipcode", e.target.value)}
        />
      </div>

      <PriceBand
        contextFilters={{
          city: form.city,
          zipcode: form.zipcode,
          beds: form.beds,
          baths: form.baths,
        }}
        minPrice={form.minPrice}
        maxPrice={form.maxPrice}
        onChange={({ minPrice, maxPrice }) =>
          setForm((current) => ({ ...current, minPrice, maxPrice }))
        }
      />

      <div className="filters__field">
        <label className="filters__label" htmlFor="filter-beds">Beds</label>
        <select
          id="filter-beds"
          className="filters__input"
          value={form.beds}
          onChange={(e) => updateField("beds", e.target.value)}
        >
          <option value="">Any</option>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="filters__field">
        <label className="filters__label" htmlFor="filter-baths">Baths</label>
        <select
          id="filter-baths"
          className="filters__input"
          value={form.baths}
          onChange={(e) => updateField("baths", e.target.value)}
        >
          <option value="">Any</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="filters__actions">
        <button className="filters__submit" type="submit" disabled={busy}>
          {busy ? "Searching" : "Search"}
        </button>
        <button className="filters__reset" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>
    </form>
  );
}

export default PropertyFilters;