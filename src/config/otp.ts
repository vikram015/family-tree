// Number of digits in the login OTP. Configurable via the REACT_APP_OTP_LENGTH
// build-time env var; defaults to 6 (Firebase phone-auth SMS codes are 6 digits).
const DEFAULT_OTP_LENGTH = 6;

const parsed = Number(process.env.REACT_APP_OTP_LENGTH);

export const OTP_LENGTH =
  Number.isInteger(parsed) && parsed >= 4 && parsed <= 8
    ? parsed
    : DEFAULT_OTP_LENGTH;
