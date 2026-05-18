import { transformSpeechToProfessionalEnglish } from './src/lib/speechToEnglish.js';

const testCases = [
  "Enaku login panna mudiyala",
  "Ticket create pannumbothu error varuthu",
  "Mail notification varala",
  "Dashboard load aaga romba time edukuthu",
  "Password reset panna mail varala",
  "Server romba slow ah iruku",
  "User account lock aagiduchu",
  "file upload panna mudiyala",
  "report generate pannumbothu issue varuthu"
];

console.log("=== TRANSLATION PIPELINE TESTS ===");
for (const tc of testCases) {
  const result = transformSpeechToProfessionalEnglish(tc);
  console.log(`Input:  "${tc}"`);
  console.log(`Output: "${result}"`);
  console.log("-----------------------------------");
}
