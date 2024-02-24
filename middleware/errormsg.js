function setErrorMessage(req, res, next) {
  const errorMessage = req.query.error;
  res.locals.errorMessage = errorMessage;
  next();
}

module.exports = setErrorMessage;
