import {
  readOpenHouseRemarks,
  formatOpenHouseDate,
  formatOpenHouseWindow,
} from "../utils/openHouseData";
import "./OpenHouseList.css";

function OpenHouseList({ openHouses }) {
  if (!openHouses || openHouses.length === 0) {
    return (
      <section className="open-houses">
        <h2 className="open-houses__title">Open Houses</h2>
        <p className="open-houses__empty">No open houses scheduled</p>
      </section>
    );
  }

  return (
    <section className="open-houses">
      <h2 className="open-houses__title">Open Houses</h2>
      <ul className="open-houses__list">
        {openHouses.map((openHouse, index) => {
          const remarks = readOpenHouseRemarks(openHouse);
          const when = formatOpenHouseWindow(openHouse);

          return (
            <li className="open-houses__item" key={openHouse.id ?? index}>
              <p className="open-houses__date">
                {formatOpenHouseDate(openHouse.OpenHouseDate)}
              </p>
              {when && <p className="open-houses__time">{when}</p>}
              {remarks && <p className="open-houses__remarks">{remarks}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default OpenHouseList;
