import "./SortControl.css";

//The value is a single "<sortBy>-<sortOrder>" string so the whole choice lives
//in one piece of state and one <select>, rather than two controls the user has
//to reason about together.
export const SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "sqft-desc", label: "Largest first" },
  { value: "beds-desc", label: "Most bedrooms" },
];

//splits the combined value back into the two parameters the API expects
export function toSortParams(value) {
  if (!value) return { sortBy: "", sortOrder: "" };

  const [sortBy, sortOrder] = value.split("-");
  return { sortBy, sortOrder };
}

function SortControl({ value, onChange, disabled }) {
  return (
    <div className="sort">
      <label className="sort__label" htmlFor="listings-sort">
        Sort
      </label>
      <select
        id="listings-sort"
        className="sort__select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SortControl;
