const lowerSet = new Set("abcdefghijklmnopqrstuvwxyz");
const upperSet = new Set("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
const digitsSet = new Set("0123456789");
const specialSet = new Set("!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~");

function validate_password(password) {
  if (typeof password !== "string" || password.length < 8) {
    return new Error(
      "Criteria failure: Password length must be greater than or equal to 8 characters.",
    );
  }
  if (password.length > 30) {
    return new Error(
      "Criteria failure: Password length must be less than 30 characters.",
    );
  }

  let upperCharacter = 0;
  let lowerCharacter = 0;
  let specialCharacter = 0;
  let totalDigits = 0;
  let totalSpaces = 0;

  for (let i = 0; i < password.length; i++) {
    const char = password[i];
    if (lowerSet.has(char)) lowerCharacter++;
    else if (upperSet.has(char)) upperCharacter++;
    else if (specialSet.has(char)) specialCharacter++;
    else if (digitsSet.has(char)) totalDigits++;

    if (char === " ") totalSpaces++;
  }

  if (lowerCharacter === 0) {
    return new Error(
      "Criteria failure: Atleast 1 Lower character must be present in password",
    );
  }
  if (upperCharacter === 0) {
    return new Error(
      "Criteria failure: Atleast 1 Upper character must be present in password",
    );
  }
  if (specialCharacter === 0) {
    return new Error(
      "Criteria failure: Atleast 1 Special character must be present in password",
    );
  }
  if (totalDigits === 0) {
    return new Error(
      "Criteria failure: Atleast 1 Digit[0-9] must be present in password",
    );
  }
  if (totalSpaces > 0) {
    return new Error("Criteria failure: Password must not contain spaces");
  }

  return null;
}

export function validate_user(req, res, next) {
  const details = req.body;

  if (
    !details.first_name ||
    !details.last_name ||
    !details.email ||
    !details.password ||
    !details.phone
  ) {
    const error = new Error("All fields are required");
    error.statusCode = 422;
    return next(error);
  }

  if (
    typeof details.first_name !== "string" ||
    typeof details.last_name !== "string" ||
    typeof details.email !== "string" ||
    typeof details.password !== "string" ||
    typeof details.phone !== "string"
  ) {
    const error = new Error(
      "Criteria failure: All submitted fields must be strings",
    );
    error.statusCode = 422;
    return next(error);
  }

  const firstNameTrimmed = details.first_name.trim();
  const lastNameTrimmed = details.last_name.trim();
  const emailSanitized = details.email.trim().toLowerCase();

  if (firstNameTrimmed.length === 0 || lastNameTrimmed.length === 0) {
    const error = new Error(
      "Criteria failure: Names cannot consist only of spaces",
    );
    error.statusCode = 422;
    return next(error);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  const nameRegex = /^[A-Za-z\p{L}\s'-]+$/u;

  if (!emailRegex.test(emailSanitized)) {
    const error = new Error("Criteria failure: Invalid email format");
    error.statusCode = 422;
    return next(error);
  }

  if (!phoneRegex.test(details.phone)) {
    const error = new Error("Criteria failure: Invalid phone number format");
    error.statusCode = 422;
    return next(error);
  }

  if (!nameRegex.test(firstNameTrimmed) || !nameRegex.test(lastNameTrimmed)) {
    const error = new Error(
      "Criteria failure: Invalid first_name or last_name format",
    );
    error.statusCode = 422;
    return next(error);
  }

  const passwordError = validate_password(details.password);
  if (passwordError) {
    passwordError.statusCode = 422;
    return next(passwordError);
  }

  req.body.first_name = firstNameTrimmed;
  req.body.last_name = lastNameTrimmed;
  req.body.email = emailSanitized;

  next();
}
