const jwt = require("jsonwebtoken");

const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { id: user._id, email: user.email_address },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXP }
  );

  const refreshToken = jwt.sign(
    { id: user._id, email: user.email_address },
    process.env.JWT_REFRESH_SECRET
  );

  return { accessToken, refreshToken };
};

module.exports = { generateTokens };
