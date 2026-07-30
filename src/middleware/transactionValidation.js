export async function validate_transaction(req, res, next) {
  try {
    const { sender_account_number, receiver_account_number, amount } = req.body;

    if (typeof sender_account_number !== "string") {
      res.status(400);
      return next(new Error("Sender account number must be a string"));
    }

    if (typeof receiver_account_number !== "string") {
      res.status(400);
      return next(new Error("Receiver account number must be a string"));
    }

    if (sender_account_number === receiver_account_number) {
      res.status(400);
      return next(new Error("Sender and receiver account must be different"));
    }

    if (typeof amount !== "number" || Number.isNaN(amount)) {
      res.status(400);
      return next(new Error("Amount must be a valid number"));
    }

    if (amount <= 0) {
      res.status(400);
      return next(new Error("Amount must be greater than zero"));
    }

    next();
  } catch (error) {
    next(error);
  }
}
