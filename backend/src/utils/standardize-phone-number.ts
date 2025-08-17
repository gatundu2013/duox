export function standardizePhoneNumber(phoneNumber: string) {
  let formatted = phoneNumber.trim();

  if (formatted.startsWith("+254")) {
    formatted = `0${formatted.slice(4)}`;
  } else if (formatted.startsWith("254")) {
    formatted = `0${formatted.slice(3)}`;
  }

  return formatted;
}
