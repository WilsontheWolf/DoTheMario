require("dotenv").config()
const config = {
  prefix: "'",
  token: process.env.TOKEN,
  dbl: process.env.DBL,
  admins: ['517371142508380170', '312974985876471810']
}
module.exports = config;
