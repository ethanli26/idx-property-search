require("dotenv").config();
const app = require("./app");

//5001 rather than 5000: macOS AirPlay Receiver already holds 5000
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
