import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();

  // Use environment port for deployment
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  const frontendPath = path.join(process.cwd(), "frontend");

  if (process.env.NODE_ENV !== "production") {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: frontendPath,
    });

    app.use(vite.middlewares);
  } else {
    // Production: serve built React files
    const distPath = path.join(frontendPath, "dist");

    app.use(express.static(distPath));

    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
