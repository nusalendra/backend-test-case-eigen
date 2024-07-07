const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");
const response = require("../response");

router.use(bodyParser.json());

/**
 * @swagger
 * /books-return:
 *   post:
 *     summary: Return a borrowed book
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
 *                 description: ID of the book to return
 *                 example: 1
 *               member_id:
 *                 type: integer
 *                 description: ID of the member returning the book
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
 *                 message:
 *                   type: string
 *                   example: "Buku berhasil dikembalikan dan stok diperbarui"
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
 *                       example: "Buku ini tidak sedang dipinjam oleh anggota"
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
 *                       example: "Tidak Ditemukan"
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
 *                       example: "Error saat update data peminjaman buku"
 */
router.post("/", (req, res) => {
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
