export const PASSWORD_MIN_LENGTH = 12;

const PASSWORD_REQUIREMENTS = [
  { test: (password) => password.length >= PASSWORD_MIN_LENGTH, message: `at least ${PASSWORD_MIN_LENGTH} characters` },
  { test: (password) => /[A-Z]/.test(password), message: "an uppercase letter" },
  { test: (password) => /[a-z]/.test(password), message: "a lowercase letter" },
  { test: (password) => /\d/.test(password), message: "a number" },
  { test: (password) => /[^A-Za-z0-9]/.test(password), message: "a special character" },
];

export const getPasswordPolicyError = (password) => {
  if (typeof password !== "string") return "Password must be a string";

  const missing = PASSWORD_REQUIREMENTS.filter(({ test }) => !test(password)).map(({ message }) => message);
  return missing.length ? `Password must contain ${missing.join(", ")}` : null;
};

export const assertPasswordPolicy = (password, label = "Password") => {
  const error = getPasswordPolicyError(password);
  if (error) throw new Error(`${label}: ${error}`);
};
