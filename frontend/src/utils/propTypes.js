import PropTypes from "prop-types";

//The listing shape as the API actually returns it, shared by every component
//that renders a property. Almost nothing is required: the RETS feed fills these
//unevenly, and the components already handle missing values. Marking them
//required would fill the console with warnings about data we expect to be
//patchy — see Appendix A of the challenge guide.
export const listingShape = PropTypes.shape({
  L_ListingID: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
  L_Address: PropTypes.string,
  L_City: PropTypes.string,
  L_State: PropTypes.string,
  L_Zip: PropTypes.string,
  //price is null or zero on some rows, which renders as "Price on request"
  L_SystemPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  //JSON string from the database, parsed by readPhotoUrls
  L_Photos: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
  //beds and baths, both nullable
  L_Keyword2: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  LM_Dec_3: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  //living area in square feet
  LM_Int2_3: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
});

//an open house row, whose remarks live inside the all_data JSON blob
export const openHouseShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  OpenHouseDate: PropTypes.string,
  OH_StartTime: PropTypes.string,
  OH_EndTime: PropTypes.string,
  all_data: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
});
