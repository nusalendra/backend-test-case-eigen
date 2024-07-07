const mysql = require('mysql')

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "db-backend-test-case"
})

module.exports = db