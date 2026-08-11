//Open house rows do not carry their remarks in a column of their own. The text
//lives inside the all_data JSON blob, which is why reading OpenHouseRemarks off
//the row directly always comes back undefined. Parse the blob, then read the key.
export function readOpenHouseRemarks(openHouse) {
  const blob = openHouse?.all_data;
  if (!blob) return "";

  //a JSON column arrives already parsed, a TEXT column arrives as a string
  if (typeof blob === "object") return blob.OpenHouseRemarks || "";

  try {
    const parsed = JSON.parse(blob);
    return parsed?.OpenHouseRemarks || "";
  } catch {
    return "";
  }
}

//A date-only value like "2026-08-15" is read as UTC midnight by the Date
//constructor, which renders as the previous day anywhere west of Greenwich.
//Build it from its parts instead so the day stays the day.
function toLocalDate(value) {
  if (value instanceof Date) return value;
  if (typeof value !== "string") return null;

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatOpenHouseDate(value) {
  const date = toLocalDate(value);
  if (!date) return "";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

//times arrive as "13:00:00", which is not what a buyer reads on a listing
export function formatOpenHouseTime(value) {
  if (!value) return "";

  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(value);

  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;

  return `${hour12}:${minutes} ${suffix}`;
}

//"1:00 PM – 4:00 PM", or whichever half is present
export function formatOpenHouseWindow(openHouse) {
  const start = formatOpenHouseTime(openHouse?.OH_StartTime);
  const end = formatOpenHouseTime(openHouse?.OH_EndTime);

  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}
