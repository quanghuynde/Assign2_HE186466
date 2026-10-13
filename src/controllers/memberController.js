const mongoose = require("mongoose");
const Member = require("../models/Member");
const Loan = require("../models/Loan");

const PERMITTED_MEMBERSHIP_TYPES = ["Student", "Teacher", "Guest"];

// GET /api/members
const getAllMembers = async (req, res) => {
  try {
    const { membershipType, isActive } = req.query;

    // Validate membershipType query if provided
    if (membershipType && !PERMITTED_MEMBERSHIP_TYPES.includes(membershipType)) {
      return res.status(400).json({
        error: `Invalid membershipType: ${membershipType}. Permitted values: ${PERMITTED_MEMBERSHIP_TYPES.join(", ")}`,
      });
    }

    const filter = {};
    if (membershipType) filter.membershipType = membershipType;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const members = await Member.find(filter).lean();

    return res.status(200).json(members);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/members/:id
const getMemberById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid member id: ${id}` });
    }

    const member = await Member.findById(id).lean();

    if (!member) {
      return res.status(404).json({ error: `Member with id = ${id} not found` });
    }

    return res.status(200).json(member);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// POST /api/members
const createMember = async (req, res) => {
  try {
    const { fullName, email, phone, membershipType = "Student", isActive = true } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone) {
      return res.status(400).json({
        error: "All required fields (fullName, email, phone) must be provided",
      });
    }

    // Validate membershipType
    if (membershipType && !PERMITTED_MEMBERSHIP_TYPES.includes(membershipType)) {
      return res.status(400).json({
        error: `Invalid membershipType: ${membershipType}. Permitted values: ${PERMITTED_MEMBERSHIP_TYPES.join(", ")}`,
      });
    }

    // Check unique email
    const existingMember = await Member.findOne({ email }).lean();
    if (existingMember) {
      return res.status(400).json({ error: `Email ${email} already exists` });
    }

    const newMember = await Member.create({
      fullName,
      email,
      phone,
      membershipType,
      isActive,
    });

    return res.status(201).json(newMember);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// PUT /api/members/:id
const updateMember = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid member id: ${id}` });
    }

    // Validate membershipType if provided
    if (req.body.membershipType && !PERMITTED_MEMBERSHIP_TYPES.includes(req.body.membershipType)) {
      return res.status(400).json({
        error: `Invalid membershipType: ${req.body.membershipType}. Permitted values: ${PERMITTED_MEMBERSHIP_TYPES.join(", ")}`,
      });
    }

    // email unique 
    if (req.body.email) {
      const duplicate = await Member.findOne({ email: req.body.email, _id: { $ne: id } }).lean();
      if (duplicate) {
        return res.status(400).json({ error: `Email ${req.body.email} already exists` });
      }
    }

    const updated = await Member.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return res.status(404).json({ error: `Member with id = ${id} not found` });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/members/:id
const deleteMember = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: `Invalid member id: ${id}` });
    }

    // Cannot delete member who has active loans
    const activeLoan = await Loan.findOne({
      member_id: id,
      status: { $in: ["Borrowing", "Overdue"] },
    }).lean();

    if (activeLoan) {
      return res.status(400).json({ error: "Cannot delete member who has active loans" });
    }

    const deleted = await Member.findByIdAndDelete(id).lean();

    if (!deleted) {
      return res.status(404).json({ error: `Member with id = ${id} not found` });
    }

    return res.status(200).json({ message: `Member ${id} deleted successfully` });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllMembers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
};
