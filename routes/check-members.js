const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");
const response = require("../response");

router.use(bodyParser.json());

router.get("/", (req, res) => {
  const sql = `SELECT Members.code, Members.name, COUNT(BorrowingBooks.id) AS jumlahPinjamBuku FROM Members LEFT JOIN BorrowingBooks ON Members.id = BorrowingBooks.member_id AND BorrowingBooks.updatedAt IS NULL GROUP BY Members.id`;

  db.query(sql, (err, fields) => {
    if (err) {
      return response(500, "invalid", "Error saat mengambil data anggota", res);
    }

    const responseData = {
      members: fields,
    };
    return response(
      200,
      responseData,
      "Daftar anggota dan jumlah buku yang dipinjam",
      res
    );
  });
});

module.exports = router;
