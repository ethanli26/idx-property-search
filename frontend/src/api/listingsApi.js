export async function loadPriceDistribution(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      search.append(key, value);
    }
  });

  const query = search.toString();
  return requestJson(
    query ? `${BASE_PATH}/price-distribution?${query}` : `${BASE_PATH}/price-distribution`
  );
}

//All communication with the property API lives here.
//Components import these functions instead of calling fetch directly.

const BASE_PATH = "/api/properties";

async function requestJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body.error ? `: ${body.error}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`Request failed with status ${response.status}${detail}`);
  }

  return response.json();
}

export async function loadListings(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== null && value !== undefined) {
      search.append(key, value);
    }
  });

  const query = search.toString();
  return requestJson(query ? `${BASE_PATH}?${query}` : BASE_PATH);
}

export async function loadListingById(listingId) {
  return requestJson(`${BASE_PATH}/${listingId}`);
}

export async function loadOpenHouses(listingId) {
  return requestJson(`${BASE_PATH}/${listingId}/openhouses`);
}