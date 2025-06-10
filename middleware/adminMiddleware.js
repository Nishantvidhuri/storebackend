const admin = (req, res, next) => {
  // The protect middleware should run before this to ensure req.user exists
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

module.exports = admin; 