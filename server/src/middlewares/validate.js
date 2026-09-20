import { AppError } from "../utils/AppError.js";

// Usage: validate({ body: schema, query: schema, params: schema })
// Parsed (and coerced/trimmed) values are exposed on req.validated. req.query is
// read-only in Express 5, so we never write back to the request itself.
export const validate = (schemas) => (req, _res, next) => {
  const validated = {};
  const details = [];

  for (const key of ["params", "query", "body"]) {
    if (!schemas[key]) continue;
    const result = schemas[key].safeParse(req[key] ?? {});
    if (result.success) {
      validated[key] = result.data;
    } else {
      details.push(
        ...result.error.issues.map((issue) => ({
          in: key,
          field: issue.path.join("."),
          message: issue.message,
        })),
      );
    }
  }

  if (details.length) {
    return next(new AppError(422, "VALIDATION_ERROR", "Request validation failed", details));
  }

  req.validated = validated;
  next();
};
