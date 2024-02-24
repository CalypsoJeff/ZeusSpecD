const isLogin = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
    res.redirect("/admin");
  }
};

const isLogout = (req, res, next) => {
  if (!req.session.admin) {
    next();
  } else {
    req.session.admin = null;
    res.redirect("/admin");
  }
};

module.exports = { isLogin, isLogout };
