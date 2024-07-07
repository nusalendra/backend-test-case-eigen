const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");
const response = require("../response");

router.use(bodyParser.json());

router.post("/", (req, res) => {
  const { book_id, member_id } = req.body;

  // check query mencari book_id
  const checkBookQuery = `SELECT * FROM Books WHERE id = ${book_id}`;
  db.query(checkBookQuery, (err, bookResult) => {
    if (err) return response(500, "invalid", "error", res);
    if (bookResult.length === 0) {
      return response(
        404,
        "invalid",
        "book_id tidak ditemukan di database",
        res
      );
    }

    // check query mencari member_id
    const checkMemberQuery = `SELECT * FROM Members WHERE id = ${member_id}`;
    db.query(checkMemberQuery, (err, memberResult) => {
      if (err) return response(500, "invalid", "error", res);
      if (memberResult.length === 0) {
        return response(
          404,
          "invalid",
          "member_id tidak ditemukan di database",
          res
        );
      }

      // check query tidak dapat meminjam 2 buku
      const checkBorrowedBooksQuery = `SELECT COUNT(*) as bookCount FROM BorrowingBooks WHERE member_id = ${member_id}`;
      db.query(checkBorrowedBooksQuery, (err, result) => {
        if (err) return response(500, "invalid", "error", res);

        const { bookCount } = result[0];
        if (bookCount >= 2) {
          return response(
            400,
            "invalid",
            "Anggota tidak boleh meminjam lebih dari 2 buku",
            res
          );
        }

        // check apakah anggota memiliki sanctionAt dan apakah masih berlaku
        const checkSanctionQuery = `SELECT sanctionAt FROM Members WHERE id = ${member_id} AND sanctionAt IS NOT NULL AND sanctionAt > NOW()`;
        db.query(checkSanctionQuery, (err, sanctionResult) => {
          if (err) return response(500, "invalid", "error", res);

          if (sanctionResult.length > 0) {
            return response(
              400,
              "invalid",
              "Anggota tidak dapat meminjam buku karena sedang dalam masa sanksi",
              res
            );
          }

          // check buku sedang dipinjam anggota lain / tidak
          const checkBookAvailabilityQuery = `SELECT * FROM BorrowingBooks WHERE book_id = ${book_id}`;
          db.query(checkBookAvailabilityQuery, (err, result) => {
            if (err) return response(500, "invalid", "error", res);

            if (result.length > 0) {
              if (bookResult[0].stock === 0) {
                return response(
                  400,
                  "invalid",
                  "Buku sedang dipinjam oleh anggota lain dan stok buku habis",
                  res
                );
              } else {
                return response(
                  400,
                  "invalid",
                  "Buku sedang dipinjam oleh anggota lain",
                  res
                );
              }
            }

            const sql = `INSERT INTO BorrowingBooks(book_id, member_id, createdAt) VALUES(${book_id}, '${member_id}', NOW())`;

            db.query(sql, (err, fields) => {
              if (err) return response(500, "invalid", "error", res);
              if (fields?.affectedRows) {
                const sqlUpdateStock = `UPDATE Books SET stock = stock - 1 WHERE id = ${book_id}`;
                db.query(sqlUpdateStock, (err, updateResult) => {
                  if (err) return response(500, "invalid", "error", res);
                  const data = {
                    isSuccess: fields.affectedRows,
                    id: fields.insertId,
                  };
                  response(200, data, "Data berhasil ditambahkan", res);
                });
              } else {
                response(404, "Tidak Ditemukan", "error", res);
              }
            });
          });
        });
      });
    });
  });
});

module.exports = router;
