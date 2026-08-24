import { useState, useEffect, useRef } from "react";
import { loadPriceDistribution } from "../api/listingsApi";
import "./PriceBand.css";

function abbreviate(value) {
  if (!Number.isFinite(value)) return "";
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${value}`;
}

//the collapsed trigger only has room for one line, so describe the bound that is set
function summarize(minPrice, maxPrice) {
  const hasMin = minPrice !== "";
  const hasMax = maxPrice !== "";
  if (!hasMin && !hasMax) return "Any price";
  if (hasMin && !hasMax) return `${abbreviate(Number(minPrice))}+`;
  if (!hasMin && hasMax) return `Up to ${abbreviate(Number(maxPrice))}`;
  return `${abbreviate(Number(minPrice))} – ${abbreviate(Number(maxPrice))}`;
}

function PriceBand({ contextFilters, minPrice, maxPrice, onChange }) {
  const [open, setOpen] = useState(false);
  const [spread, setSpread] = useState(null);
  const [pending, setPending] = useState(false);
  const contextKey = JSON.stringify(contextFilters);
  const root = useRef(null);
  const trigger = useRef(null);
  const loadedOnce = useRef(false);

  //the histogram is only worth a round trip once the panel is actually on screen
  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    setPending(true);

    //first open should feel instant, later context edits debounce while typing
    const timer = setTimeout(
      async () => {
        try {
          const data = await loadPriceDistribution(JSON.parse(contextKey));
          if (active) {
            setSpread(data);
            loadedOnce.current = true;
          }
        } catch {
          if (active) setSpread(null);
        } finally {
          if (active) setPending(false);
        }
      },
      loadedOnce.current ? 350 : 0
    );

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [open, contextKey]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (root.current && !root.current.contains(event.target)) setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const isSet = minPrice !== "" || maxPrice !== "";

  return (
    <div className="price-band" ref={root}>
      <span className="price-band__label" id="price-band-label">
        Price
      </span>
      <button
        ref={trigger}
        type="button"
        className={
          isSet
            ? "price-band__trigger price-band__trigger--set"
            : "price-band__trigger"
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-labelledby="price-band-label price-band-value"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="price-band__value" id="price-band-value">
          {summarize(minPrice, maxPrice)}
        </span>
        <span className="price-band__caret" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="price-band__panel"
          role="dialog"
          aria-label="Price range"
        >
          <PriceBandPanel
            spread={spread}
            pending={pending}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onChange={onChange}
          />

          <div className="price-band__footer">
            <button
              type="button"
              className="price-band__clear"
              disabled={!isSet}
              onClick={() => onChange({ minPrice: "", maxPrice: "" })}
            >
              Clear
            </button>
            <button
              type="button"
              className="price-band__done"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceBandPanel({ spread, pending, minPrice, maxPrice, onChange }) {
  if (pending && !spread) {
    return <div className="price-band__placeholder" />;
  }

  if (!spread || !spread.bucketSize) {
    return <p className="price-band__empty">No priced listings match</p>;
  }

  const { low, high, buckets, capped } = spread;
  const tallest = Math.max(...buckets, 1);
  const span = high - low || 1;
  const step = Math.max(Math.round(span / 200), 1);

  const currentMin = minPrice === "" ? low : Number(minPrice);
  const currentMax = maxPrice === "" ? high : Number(maxPrice);

  //clamp so a typed value outside the histogram range cannot overflow the fill
  function pct(value) {
    const raw = ((value - low) / span) * 100;
    return Math.min(Math.max(raw, 0), 100);
  }

  function handleMin(event) {
    const next = Math.min(Number(event.target.value), currentMax - step);
    onChange({ minPrice: String(next), maxPrice });
  }

  function handleMax(event) {
    const next = Math.max(Number(event.target.value), currentMin + step);
    onChange({ minPrice, maxPrice: String(next) });
  }

  //live summary of the selection, so the inputs do not need their own labels
  const openEnded = capped && currentMax >= high;
  const readout = `${abbreviate(currentMin)} – ${abbreviate(currentMax)}${
    openEnded ? "+" : ""
  }`;

  return (
    <>
      <p className="price-band__readout">{readout}</p>

      <div className="price-band__graph">
        <div className="price-band__chart" aria-hidden="true">
          {buckets.map((count, i) => {
            const bucketLow = low + i * spread.bucketSize;
            const bucketHigh = bucketLow + spread.bucketSize;
            const inRange = bucketHigh > currentMin && bucketLow < currentMax;
            return (
              <span
                key={i}
                className={
                  inRange
                    ? "price-band__bar price-band__bar--active"
                    : "price-band__bar"
                }
                style={{ height: `${Math.max((count / tallest) * 100, 2)}%` }}
              />
            );
          })}
        </div>

        <div className="price-band__slider">
          <div className="price-band__track" />
          <div
            className="price-band__fill"
            style={{
              left: `${pct(currentMin)}%`,
              right: `${100 - pct(currentMax)}%`,
            }}
          />
          <input
            className="price-band__range"
            type="range"
            min={low}
            max={high}
            step={step}
            value={currentMin}
            onChange={handleMin}
            aria-label="Minimum price"
          />
          <input
            className="price-band__range"
            type="range"
            min={low}
            max={high}
            step={step}
            value={currentMax}
            onChange={handleMax}
            aria-label="Maximum price"
          />
        </div>
      </div>

      <div className="price-band__ends">
        <div className="price-band__field">
          <span className="price-band__prefix" aria-hidden="true">$</span>
          <input
            id="filter-min"
            className="price-band__number"
            type="number"
            min={low}
            max={high}
            value={minPrice}
            placeholder="Min"
            aria-label="Minimum price"
            onChange={(e) => onChange({ minPrice: e.target.value, maxPrice })}
          />
        </div>
        <span className="price-band__dash" aria-hidden="true">–</span>
        <div className="price-band__field">
          <span className="price-band__prefix" aria-hidden="true">$</span>
          <input
            id="filter-max"
            className="price-band__number"
            type="number"
            min={low}
            max={high}
            value={maxPrice}
            placeholder="Max"
            aria-label="Maximum price"
            onChange={(e) => onChange({ minPrice, maxPrice: e.target.value })}
          />
        </div>
      </div>
    </>
  );
}

export default PriceBand;
