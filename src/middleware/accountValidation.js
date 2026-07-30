export function validateAccount(req, res, next) {
  try {
    const details = req.body;
    let account_type = details.account_type;

    if (!account_type) {
      account_type = "SAVINGS";
    }

    if (typeof account_type !== "string") {
      res.status(400);
      return next(new Error("Account type must be text"));
    }

    const upper_account_type = account_type.toUpperCase();
    const valid_account_types = ["SAVINGS", "CURRENT"];

    if (!valid_account_types.includes(upper_account_type)) {
      res.status(400);
      return next(new Error("Account type not offered"));
    }

    req.body.account_type = upper_account_type;

    next();
  } catch (error) {
    next(error);
  }
}
