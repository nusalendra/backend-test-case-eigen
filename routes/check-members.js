const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");
const response = require("../response");

router.use(bodyParser.json());

/**
 * @swagger
 * /check-members:
 *   get:
 *     summary: Get a list of all members and the number of books they are borrowing
 *     tags: [Members]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 members:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                         example: "M001"
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       jumlahPinjamBuku:
 *                         type: integer
 *                         example: 2
 *       400:
 *         description: Bad Request
 *         content:
 *           application/json:
 *             example:
 *               error:
 *                 message: "Bad Request"
 */
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
