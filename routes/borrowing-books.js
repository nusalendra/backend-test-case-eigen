const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");
const response = require("../response");

router.use(bodyParser.json());

/**
 * @swagger
 * /borrowing-books:
 *   post:
 *     summary: Borrow a book for a member
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               book_id:
 *                 type: integer
 *                 description: ID of the book to borrow
 *                 example: 1
 *               member_id:
 *                 type: integer
 *                 description: ID of the member borrowing the book
 *                 example: 1
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isSuccess:
 *                   type: boolean
 *                   example: true
 *                 id:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Anggota tidak boleh meminjam lebih dari 2 buku"
 *       404:
 *         description: Not Found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "book_id tidak ditemukan di database"
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Error saat mengambil data buku"
 */
router.post("/", (req, res) => {
  const { book_id, member_id } = req.body;

  // Cek apakah book_id ada di database
  const checkBookQuery = `SELECT * FROM Books WHERE id = ${book_id}`;
  db.query(checkBookQuery, (err, bookResult) => {
    if (err)
      return response(500, "invalid", "Error saat mengambil data buku", res);
    if (bookResult.length === 0) {
      return response(
        404,
        "invalid",
        "book_id tidak ditemukan di database",
        res
      );
    }

    // Cek apakah member_id ada di database
    const checkMemberQuery = `SELECT * FROM Members WHERE id = ${member_id}`;
    db.query(checkMemberQuery, (err, memberResult) => {
      if (err)
        return response(
          500,
          "invalid",
          "Error saat mengambil data anggota",
          res
        );
      if (memberResult.length === 0) {
        return response(
          404,
          "invalid",
          "member_id tidak ditemukan di database",
          res
        );
      }

      // Cek apakah anggota sudah meminjam lebih dari 2 buku
      const checkBorrowedBooksQuery = `SELECT COUNT(*) as bookCount FROM BorrowingBooks WHERE member_id = ${member_id}`;
      db.query(checkBorrowedBooksQuery, (err, result) => {
        if (err)
          return response(
            500,
            "invalid",
            "Error saat memeriksa jumlah buku yang sedang dipinjam",
            res
          );

        const { bookCount } = result[0];
        if (bookCount >= 2) {
          return response(
            400,
            "invalid",
            "Anggota tidak boleh meminjam lebih dari 2 buku",
            res
          );
        }

        // Cek apakah anggota sedang dalam masa sanksi
        const checkSanctionQuery = `SELECT sanctionAt FROM Members WHERE id = ${member_id} AND sanctionAt IS NOT NULL AND sanctionAt > NOW()`;
        db.query(checkSanctionQuery, (err, sanctionResult) => {
          if (err)
            return response(
              500,
              "invalid",
              "Error saat memeriksa status sanksi anggota",
              res
            );

          if (sanctionResult.length > 0) {
            return response(
              400,
              "invalid",
              "Anggota tidak dapat meminjam buku karena sedang dalam masa sanksi",
              res
            );
          }

          // Cek apakah buku sedang dipinjam oleh anggota lain dan stok buku masih tersedia
          const checkBookAvailabilityQuery = `SELECT * FROM BorrowingBooks WHERE book_id = ${book_id} AND (updatedAt IS NULL)`;
          db.query(checkBookAvailabilityQuery, (err, result) => {
            console.log(result);
            if (err)
              return response(
                500,
                "invalid",
                "Error saat memeriksa status peminjaman buku",
                res
              );

            const bookIsBorrowed = result.some(
              (book) => book.updatedAt === null
            );

            if (bookIsBorrowed) {
              return response(
                400,
                "invalid",
                "Buku sedang dipinjam oleh anggota lain",
                res
              );
            }

            // Insert data peminjaman ke dalam tabel BorrowingBooks dan update stok buku
            const sql = `INSERT INTO BorrowingBooks(book_id, member_id, createdAt) VALUES(${book_id}, '${member_id}', NOW())`;
            db.query(sql, (err, fields) => {
              if (err)
                return response(
                  500,
                  "invalid",
                  "Error saat menambahkan data peminjaman buku",
                  res
                );

              if (fields?.affectedRows) {
                const sqlUpdateStock = `UPDATE Books SET stock = stock - 1 WHERE id = ${book_id}`;
                db.query(sqlUpdateStock, (err, updateResult) => {
                  if (err)
                    return response(
                      500,
                      "invalid",
                      "Error saat mengupdate stok buku",
                      res
                    );

                  const data = {
                    isSuccess: true,
                    id: fields.insertId,
                  };
                  response(200, data, "Data berhasil ditambahkan", res);
                });
              } else {
                response(404, "invalid", "Data tidak ditemukan", res);
              }
            });
          });
        });
      });
    });
  });
});

module.exports = router;
