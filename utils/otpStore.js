// utils/otpStore.js (or in-memory / Redis)
const otpMap = new Map(); // or use Redis in production

function generateOTP(userId) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

  otpMap.set(userId, { otp, expiresAt });
  return otp;
}

function verifyOTP(userId, code) {
  const data = otpMap.get(userId);
  if (!data) return false;

  const isValid = data.otp === code && Date.now() <= data.expiresAt;
  if (isValid) otpMap.delete(userId); // remove after successful use
  return isValid;
}


function setCode(userId, code) {
  otpMap.set(userId, { code, expires: Date.now() + 15 * 60 * 1000 });
}

function isCodeValid(userId, submittedCode) {
  const entry = otpMap.get(userId);
  if (!entry) return false;
  const valid = entry.code === submittedCode && Date.now() <= entry.expires;
  if (valid) otpMap.delete(userId);
  return valid;
}

module.exports = { generateOTP, verifyOTP, setCode, isCodeValid };// utils/otpStore.js (or in-memory / Redis)
