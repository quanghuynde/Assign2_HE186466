const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const Book = require("../models/Book");
const Member = require("../models/Member");

const PERMITTED_STATUSES = ["Borrowing", "Returned", "Overdue"];

// GET /api/loans
const getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.find()
      .populate("member_id")
      .populate("items.book_id")
      .lean();

    return res.status(200).json(loans);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/loans/:id
const getLoanById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid loan id: ${id}` });
    }

    const loan = await Loan.findById(id)
      .populate("member_id")
      .populate("items.book_id")
      .lean();

    if (!loan) {
      return res.status(404).json({ error: `Loan with id = ${id} not found` });
    }

    return res.status(200).json(loan);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/loans/member/:memberId
const getLoansByMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: `Invalid member id: ${memberId}` });
    }

    const member = await Member.findById(memberId).lean();
    if (!member) {
      return res.status(404).json({ error: `Member with id = ${memberId} not found` });
    }

    const loans = await Loan.find({ member_id: memberId })
      .populate("member_id")
      .populate("items.book_id")
      .lean();

    return res.status(200).json(loans);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/loans
const createLoan = async (req, res) => {
  try {
    const { member_id, items, dueDate } = req.body;

    // Validate required fields
    if (!member_id || !items || !dueDate) {
      return res.status(400).json({
        error: "All required fields (member_id, items, dueDate) must be provided",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(member_id)) {
      return res.status(400).json({ error: `Invalid member id: ${member_id}` });
    }

    const member = await Member.findById(member_id).lean();
    if (!member) {
      return res.status(404).json({ error: `Member with id = ${member_id} not found` });
    }
    if (!member.isActive) {
      return res.status(400).json({ error: "Member is inactive and cannot borrow books" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items must be a non-empty array" });
    }

    // Validate each book item
    for (const item of items) {
      if (!item.book_id || !mongoose.Types.ObjectId.isValid(item.book_id)) {
        return res.status(400).json({ error: `Invalid book id: ${item.book_id}` });
      }

      if (!item.quantity || Number(item.quantity) < 1) {
        return res.status(400).json({ error: "Item quantity must be at least 1" });
      }

      const book = await Book.findById(item.book_id).lean();
      if (!book) {
        return res.status(404).json({ error: `Book with id = ${item.book_id} not found` });
      }

      if (book.availableCopies < Number(item.quantity)) {
        return res.status(400).json({
          error: `Not enough copies for book "${book.title}". Available: ${book.availableCopies}`,
        });
      }
    }

    // Deduct availableCopies for each book
    for (const item of items) {
      await Book.findByIdAndUpdate(item.book_id, {
        $inc: { availableCopies: -Number(item.quantity) },
      });
    }

    const newLoan = await Loan.create({
      member_id,
      items,
      dueDate: new Date(dueDate),
      status: "Borrowing",
    });

    const populatedLoan = await Loan.findById(newLoan._id)
      .populate("member_id")
      .populate("items.book_id")
      .lean();

    return res.status(201).json(populatedLoan);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/loans/:id
// - When status changes to "Returned", restore availableCopies and set returnDate
const updateLoan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid loan id: ${id}` });
    }

    // Validate status if provided
    if (req.body.status && !PERMITTED_STATUSES.includes(req.body.status)) {
      return res.status(400).json({
        error: `Invalid status: ${req.body.status}. Permitted values: ${PERMITTED_STATUSES.join(", ")}`,
      });
    }

    const existing = await Loan.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ error: `Loan with id = ${id} not found` });
    }

    // Restore availableCopies when returning
    if (req.body.status === "Returned" && existing.status !== "Returned") {
      for (const item of existing.items) {
        await Book.findByIdAndUpdate(item.book_id, {
          $inc: { availableCopies: Number(item.quantity) },
        });
      }
      if (!req.body.returnDate) {
        req.body.returnDate = new Date();
      }
    }

    const updated = await Loan.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("member_id")
      .populate("items.book_id")
      .lean();

    return res.status(200).json(updated);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/loans/:id
const deleteLoan = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid loan id: ${id}` });
    }

    const existing = await Loan.findById(id).lean();
    if (!existing) {
      return res.status(404).json({ error: `Loan with id = ${id} not found` });
    }

    // Restore availableCopies if loan is still active
    if (existing.status !== "Returned") {
      for (const item of existing.items) {
        await Book.findByIdAndUpdate(item.book_id, {
          $inc: { availableCopies: Number(item.quantity) },
        });
      }
    }

    await Loan.findByIdAndDelete(id);

    return res.status(200).json({ message: `Loan ${id} deleted successfully` });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllLoans,
  getLoanById,
  getLoansByMember,
  createLoan,
  updateLoan,
  deleteLoan,
};
