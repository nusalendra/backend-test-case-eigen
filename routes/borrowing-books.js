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
    if (err) return response(500, "invalid", "error", res); // tambahkan return di sini
    if (bookResult.length === 0) {
      return response(
        404,
        "invalid",
        "book_id tidak ditemukan di database",
        res
      ); // tambahkan return di sini
    }

    // check query mencari member_id
    const checkMemberQuery = `SELECT * FROM Members WHERE id = ${member_id}`;
    db.query(checkMemberQuery, (err, memberResult) => {
      if (err) return response(500, "invalid", "error", res); // tambahkan return di sini
      if (memberResult.length === 0) {
        return response(
          404,
          "invalid",
          "member_id tidak ditemukan di database",
          res
        ); // tambahkan return di sini
      }

      // check query tidak dapat meminjam 2 buku
      const checkBorrowedBooksQuery = `SELECT COUNT(*) as bookCount FROM BorrowingBooks WHERE member_id = ${member_id}`;
      db.query(checkBorrowedBooksQuery, (err, result) => {
        if (err) return response(500, "invalid", "error", res); // tambahkan return di sini

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
          if (err) return response(500, "invalid", "error", res); // tambahkan return di sini

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
            if (err) return response(500, "invalid", "error", res); // tambahkan return di sini

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
              if (err) return response(500, "invalid", "error", res); // tambahkan return di sini
              if (fields?.affectedRows) {
                const sqlUpdateStock = `UPDATE Books SET stock = stock - 1 WHERE id = ${book_id}`;
                db.query(sqlUpdateStock, (err, updateResult) => {
                  if (err) return response(500, "invalid", "error", res); // tambahkan return di sini
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

router.post("/book-return", (req, res) => {
  const { book_id, member_id } = req.body;

  // check buku yang dikembalikan apakah telah dipinjam anggota
  const checkBorrowQuery = `SELECT * FROM BorrowingBooks WHERE book_id = ${book_id} AND member_id = ${member_id} AND updatedAt IS NULL`;
  db.query(checkBorrowQuery, (err, borrowResult) => {
    if (err) return response(500, "invalid", "error", res);

    if (borrowResult.length === 0) {
      return response(
        400,
        "invalid",
        "Buku ini tidak sedang dipinjam oleh anggota",
        res
      );
    }

    const createdAt = borrowResult[0].createdAt;
    const updateBorrowQuery = `UPDATE BorrowingBooks SET updatedAt = NOW() WHERE book_id = ${book_id} AND member_id = ${member_id} AND updatedAt IS NULL`;
    db.query(updateBorrowQuery, (err, fields) => {
      if (err) return response(500, "invalid", "error", res);

      if (fields.affectedRows) {
        // Hitung selisih waktu dalam hari
        const updatedAt = new Date();
        const diffTime = Math.abs(updatedAt - createdAt);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 7) {
          const sanctionDate = new Date();
          sanctionDate.setDate(sanctionDate.getDate() + 3);

          const updateMemberQuery = `UPDATE Members SET sanctionAt = '${sanctionDate
            .toISOString()
            .slice(0, 19)
            .replace("T", " ")}' WHERE id = ${member_id}`;
          db.query(updateMemberQuery, (err, updateMemberResult) => {
            if (err) return response(500, "invalid", "error", res);

            // Setelah update member (jika ada sanksi), tambahkan kembali stok buku
            const sqlUpdateStock = `UPDATE Books SET stock = stock + 1 WHERE id = ${book_id}`;
            db.query(sqlUpdateStock, (err, updateStockResult) => {
              if (err) return response(500, "invalid", "error", res);

              const data = {
                isSuccess: fields.affectedRows,
                id: fields.insertId,
              };
              return response(
                200,
                data,
                "Buku berhasil dikembalikan dan stok diperbarui",
                res
              );
            });
          });
        } else {
          // Jika tidak ada sanksi, langsung tambahkan kembali stok buku
          const sqlUpdateStock = `UPDATE Books SET stock = stock + 1 WHERE id = ${book_id}`;
          db.query(sqlUpdateStock, (err, updateStockResult) => {
            if (err) return response(500, "invalid", "error", res);

            const data = {
              isSuccess: fields.affectedRows,
              id: fields.insertId,
            };
            return response(200, data, "Buku berhasil dikembalikan", res);
          });
        }
      } else {
        return response(404, "Tidak Ditemukan", "error", res);
      }
    });
  });
});

module.exports = router;
