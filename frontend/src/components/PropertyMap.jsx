import "./PropertyMap.css";

function PropertyMap({ latitude, longitude, address }) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  //0,0 is the null island a missing coordinate falls back to, not a property
  const hasCoordinates =
    latitude !== null &&
    latitude !== undefined &&
    latitude !== "" &&
    longitude !== null &&
    longitude !== undefined &&
    longitude !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0);

  //no location means no map, rather than a map of somewhere else
  if (!hasCoordinates) return null;

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${lat},${lng}&zoom=15`;

  return (
    <section className="property-map">
      <div className="property-map__head">
        <h2 className="property-map__title">Location</h2>
        <a
          className="property-map__directions"
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Directions
        </a>
      </div>

      {apiKey ? (
        <iframe
          className="property-map__frame"
          title={`Map of ${address || "the property"}`}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      ) : (
        //the key is supplied per environment, so its absence is a setup state
        //rather than an error. Directions still work without it.
        <div className="property-map__placeholder">
          <p className="property-map__placeholder-title">Map unavailable</p>
          <p className="property-map__placeholder-body">
            Set REACT_APP_GOOGLE_MAPS_API_KEY in frontend/.env to display the
            map. Get Directions works without it.
          </p>
        </div>
      )}
    </section>
  );
}

export default PropertyMap;
