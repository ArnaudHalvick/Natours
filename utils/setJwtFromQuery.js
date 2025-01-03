const setJwtFromQuery = (req, res, next) => {
  if (!req.cookies.jwt && req.query.jwt) {
    res.cookie("jwt", req.query.jwt, {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 86400000,
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }
  next();
};

module.exports = setJwtFromQuery;
