const mongoose = require("mongoose");
const Book = require("../models/Book");
const Loan = require("../models/Loan");

// GET /api/books
const getAllBooks = async (req, res) => {
  try {
    const books = await Book.find().lean();
    return res.status(200).json(books);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/books/:id
const getBookById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid book id: ${id}` });
    }

    const book = await Book.findById(id).lean();

    if (!book) {
      return res.status(404).json({ error: `Book with id = ${id} not found` });
    }

    return res.status(200).json(book);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/books
const createBook = async (req, res) => {
  try {
    const { title, author, category, isbn, publishedYear, totalCopies = 0, availableCopies } = req.body;

    // Validate required fields
    if (!title || !author || !category || !isbn) {
      return res.status(400).json({
        error: "All required fields (title, author, category, isbn) must be provided",
      });
    }

    // Validate copies
    const total = Number(totalCopies);
    const available = availableCopies !== undefined ? Number(availableCopies) : total;

    if (total < 0 || available < 0) {
      return res.status(400).json({ error: "Copies cannot be negative" });
    }

    if (available > total) {
      return res.status(400).json({ error: "availableCopies cannot exceed totalCopies" });
    }

    // Check unique ISBN
    const existingBook = await Book.findOne({ isbn }).lean();
    if (existingBook) {
      return res.status(400).json({ error: `Book with ISBN ${isbn} already exists` });
    }

    const newBook = await Book.create({
      title,
      author,
      category,
      isbn,
      publishedYear,
      totalCopies: total,
      availableCopies: available,
    });

    return res.status(201).json(newBook);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/books/:id
const updateBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid book id: ${id}` });
    }

    // Copies cannot be negative
    if (req.body.totalCopies !== undefined && Number(req.body.totalCopies) < 0) {
      return res.status(400).json({ error: "totalCopies cannot be negative" });
    }
    if (req.body.availableCopies !== undefined && Number(req.body.availableCopies) < 0) {
      return res.status(400).json({ error: "availableCopies cannot exceed totalCopies" });
    }

    // isbn must remain unique (exclude current book)
    if (req.body.isbn) {
      const duplicate = await Book.findOne({ isbn: req.body.isbn, _id: { $ne: id } }).lean();
      if (duplicate) {
        return res.status(400).json({ error: `Book with ISBN ${req.body.isbn} already exists` });
      }
    }

    const updated = await Book.findByIdAndUpdate(id, req.body, { new: true, runValidators: true }).lean();

    if (!updated) {
      return res.status(404).json({ error: `Book with id = ${id} not found` });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/books/:id
const deleteBook = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid book id: ${id}` });
    }

    // Cannot delete if currently borrowed
    const activeLoan = await Loan.findOne({
      "items.book_id": id,
      status: { $in: ["Borrowing", "Overdue"] },
    }).lean();

    if (activeLoan) {
      return res.status(400).json({ error: "Cannot delete book that is currently being borrowed" });
    }

    const deleted = await Book.findByIdAndDelete(id).lean();

    if (!deleted) {
      return res.status(404).json({ error: `Book with id = ${id} not found` });
    }

    return res.status(200).json({ message: `Book ${id} deleted successfully` });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
};
