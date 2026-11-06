import "dotenv/config";

const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
];

const recommended = [
  "GEMINI_API_KEY",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

const missingRequired = required.filter((name) => !process.env[name]);
const missingRecommended = recommended.filter((name) => !process.env[name]);

if (missingRequired.length) {
  console.error(`Missing required environment variables: ${missingRequired.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("Required deployment environment variables are configured.");
}

if (missingRecommended.length) {
  console.warn(`Missing recommended environment variables: ${missingRecommended.join(", ")}`);
}
