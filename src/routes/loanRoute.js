const express = require("express");
const router = express.Router();
const {
  getAllLoans,
  getLoanById,
  getLoansByMember,
  createLoan,
  updateLoan,
  deleteLoan,
} = require("../controllers/loanController");

router.get("/loans", getAllLoans);                         // GET /api/loans
router.get("/loans/member/:memberId", getLoansByMember);  // GET /api/loans/member/:memberId
router.get("/loans/:id", getLoanById);                    // GET /api/loans/:id
router.post("/loans", createLoan);                        // POST /api/loans
router.put("/loans/:id", updateLoan);                     // PUT /api/loans/:id
router.delete("/loans/:id", deleteLoan);                  // DELETE /api/loans/:id

module.exports = router;