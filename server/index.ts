import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from "fs";
import path from "path";
const app = express();

// Middleware de traçage GLOBAL - le premier middleware, capture TOUTES les requêtes
app.use((req, res, next) => {
  console.log('[GLOBAL] Request:', req.method, req.originalUrl, 'isApi:', req.originalUrl.startsWith('/api'));
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  let server;
  try {
    server = await registerRoutes(app);
    } catch (err: any) {
    throw err;
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Middleware CRITIQUE : Intercepter TOUTES les routes API avant Vite
  // Ce middleware garantit que les routes API ne passent jamais par Vite
  app.use('/api', (req, res, next) => {
    console.log('[Pre-Vite API Middleware] Intercepting API route:', req.method, req.originalUrl);
    // Les routes API sont déjà enregistrées par registerRoutes
    // On laisse Express les gérer, on ne passe JAMAIS à Vite pour /api
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
    try {
      await setupVite(app, server);
      } catch (err: any) {
      throw err;
    }
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Ensure port is 5000 if not explicitly set or if invalid
  const finalPort = (isNaN(port) || port <= 0) ? 5000 : port;

  // On Windows, use localhost instead of 0.0.0.0 to avoid ENOTSUP errors
  // On Linux, use 0.0.0.0 for network access
  const host = process.platform === "win32" ? "127.0.0.1" : "0.0.0.0";

  // Build listen options
  const listenOptions: any = {
    port: finalPort,
    host: host,
  };

  // Only enable reusePort on Linux where it's supported
  if (process.platform === "linux") {
    listenOptions.reusePort = true;
  }

  // Handle server errors gracefully
  server.on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      log(`Port ${finalPort} is already in use`, "server");
      
      // Provide helpful message for Windows
      if (process.platform === "win32") {
        console.error(`\n❌ Le port ${finalPort} est déjà utilisé.`);
        console.error(`\n💡 Solution : Trouvez et arrêtez le processus qui utilise le port ${finalPort}`);
        console.error(`\n   Dans PowerShell, exécutez :`);
        console.error(`   netstat -ano | findstr :${finalPort}`);
        console.error(`\n   Puis tuez le processus avec :`);
        console.error(`   taskkill /PID <PID> /F`);
        console.error(`\n   Ou utilisez cette commande en une ligne :`);
        console.error(`   Get-NetTCPConnection -LocalPort ${finalPort} | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }`);
      } else {
        console.error(`\n❌ Le port ${finalPort} est déjà utilisé.`);
        console.error(`\n💡 Solution : Trouvez et arrêtez le processus qui utilise le port ${finalPort}`);
        console.error(`\n   Exécutez :`);
        console.error(`   lsof -ti:${finalPort} | xargs kill -9`);
        console.error(`\n   Ou :`);
        console.error(`   sudo kill -9 $(lsof -ti:${finalPort})`);
      }
    } else {
      log(`server listen error: ${err?.code || err?.message}`, "server");
    }
    process.exit(1);
  });

  server.listen(listenOptions, () => {
    log(`serving on http://${host}:${finalPort}`);
  });
})();
