const express = require("express");
const router = express.Router();

const borrowingBooks = require("./routes/borrowing-books");
const booksReturn = require("./routes/book-return");
const checkBooks = require("./routes/check-books");
const checkMembers = require("./routes/check-members");

router.use("/borrowing-books", borrowingBooks);
router.use("/books-return", booksReturn);
router.use("/check-books", checkBooks);
router.use("/check-members", checkMembers);

module.exports = router;
