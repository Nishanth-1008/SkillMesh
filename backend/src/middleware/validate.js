// Zod request-body validation middleware (Phase 1).

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = new Error('Validation failed');
      err.status = 400;
      err.details = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      return next(err);
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
