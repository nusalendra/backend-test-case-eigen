const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");
const response = require("../response");

router.use(bodyParser.json());

router.get("/", (req, res) => {
  const sql = `SELECT * FROM Books WHERE stock > 0 AND id NOT IN (SELECT book_id FROM BorrowingBooks WHERE updatedAt IS NULL)`;
  db.query(sql, (err, fields) => {
    if (err) {
      return response(500, "invalid", "Error saat mengambil data buku", res);
    }

    const responseData = {
      datas: fields,
    };
    return response(200, responseData, "Daftar buku yang tersedia", res);
  });
});

module.exports = router;
