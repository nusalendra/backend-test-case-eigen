const express = require('express');
const router = express.Router();

const borrowingBooks = require('./routes/borrowing-books');

router.use('/borrowing-books', borrowingBooks);

module.exports = router;