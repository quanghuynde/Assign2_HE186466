const express = require("express");
const router = express.Router();
const {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
} = require("../controllers/memberController");

router.get("/members", getAllMembers);          // GET /api/members
router.get("/members/:id", getMemberById);     // GET /api/members/:id
router.post("/members", createMember);         // POST /api/members
router.put("/members/:id", updateMember);      // PUT /api/members/:id
router.delete("/members/:id", deleteMember);   // DELETE /api/members/:id

module.exports = router;