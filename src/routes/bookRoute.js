const express = require("express");
const router = express.Router();
const {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
} = require("../controllers/bookController");

router.get("/books", getAllBooks);          // GET /api/books
router.get("/books/:id", getBookById);     // GET /api/books/:id
router.post("/books", createBook);         // POST /api/books
router.put("/books/:id", updateBook);      // PUT /api/books/:id
router.delete("/books/:id", deleteBook);   // DELETE /api/books/:id

module.exports = router;
