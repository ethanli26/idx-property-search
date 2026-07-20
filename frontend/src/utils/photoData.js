//L_Photos arrives as a JSON string, but the data is inconsistent.
//Some rows are null, empty, or malformed. Always returns an array.
export function readPhotoUrls(rawPhotos) {
  if (!rawPhotos) return [];

  if (Array.isArray(rawPhotos)) return rawPhotos.filter(Boolean);

  try {
    const parsed = JSON.parse(rawPhotos);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}