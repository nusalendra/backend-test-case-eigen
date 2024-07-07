const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bodyParser = require("body-parser");
const response = require("../response");

router.use(bodyParser.json());

/**
 * @swagger
 * /check-books:
 *   get:
 *     summary: Get a list of all available books
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 datas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "The Great Gatsby"
 *                       author:
 *                         type: string
 *                         example: "F. Scott Fitzgerald"
 *                       stock:
 *                         type: integer
 *                         example: 3
 *       500:
 *         description: Internal Server Error
 *         content:
 *           application/json:
 *             example:
 *               error:
 *                 message: "Error saat mengambil data buku"
 */
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
