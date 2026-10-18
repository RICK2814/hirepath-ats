// Compatibility bridge. The application source of truth is server.ts.
// Node.js 22.18+ supports native TypeScript type stripping.
module.exports = require("./server.ts");
