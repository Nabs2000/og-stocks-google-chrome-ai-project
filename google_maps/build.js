const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Read the manifest file
const manifestPath = path.join(__dirname, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Set the client ID based on environment
if (process.env.NODE_ENV === "development") {
  // Use development client ID from .env
  manifest.oauth2.client_id = process.env.CLIENT_ID;
  manifest.key = process.env.KEY;
} else {
  // For production, the client ID will be provided by Chrome Web Store
  delete manifest.oauth2.client_id;
  delete manifest.key;
}

// Write the updated manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log("Manifest updated successfully!");
