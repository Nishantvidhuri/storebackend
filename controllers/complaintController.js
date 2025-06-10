const Complaint = require("../models/Complaint");

exports.bookComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.create({
      user: req.user.id,
      issue: req.body.issue,
      model: req.body.model,
      address: req.body.address,
      phoneNumber: req.body.phoneNumber,
    });
    res.status(201).json(complaint);
  } catch (err) {
    res.status(500).json({ message: "Failed to create complaint" });
  }
};

exports.getMyComplaints = async (req, res) => {
  const complaints = await Complaint.find({ user: req.user.id });
  res.json(complaints);
};

exports.getAllComplaints = async (req, res) => {
  const complaints = await Complaint.find().populate("user", "name email");
  res.json(complaints);
};

exports.updateComplaint = async (req, res) => {
  const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json(complaint);
};
