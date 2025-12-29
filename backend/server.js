require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const redis = require("redis");

const app = express();
const PORT = process.env.PORT || 5000;

// PostgreSQL Pool
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  keepAlive: true,
  idleTimeoutMillis: 0,
});

// Redis Client
const REDIS_ENABLED = process.env.REDIS_CACHE === "on";
let redisClient = null;

if (REDIS_ENABLED) {
  redisClient = redis.createClient({
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
  });

  redisClient.on("error", (err) => console.error("Redis Client Error", err));
}

// Middleware
app.use(
  cors({
    origin: "*", // Or your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  res.header({
    "cache-control": "no-store",
  });
  req.startTime = Date.now();
  next();
});

// Helper: Generate cache key
function getCacheKey(page, limit) {
  return `products:page:${page}:limit:${limit}`;
}

// Main API endpoint
app.get("/api/products", async (req, res) => {
  const page = parseInt(req.query.page - 1) || 0;
  const limit = parseInt(req.query.limit) || 50;
  const offset = page * limit;
  const cacheKey = getCacheKey(page, limit);

  try {
    let redisHit = false;
    let data = null;
    let dbTime = null;

    // Step 1: Check Redis
    if (REDIS_ENABLED && redisClient) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        data = JSON.parse(cachedData);
        redisHit = true;
        console.log(`[REDIS CACHE HIT] ${cacheKey}`);
      }
    }

    // Step 2: Query database if no cache hit
    if (!data) {
      console.log(`[DATABASE QUERY] ${cacheKey}`);
      const query = `
        SELECT 
          p.id, 
          p.name, 
          c.name AS category, 
          COUNT(oi.id) AS total_orders, 
          COALESCE(AVG(r.rating), 0) AS avg_rating, 
          COALESCE(i.stock, 0) AS stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN order_items oi ON oi.product_id = p.id
        LEFT JOIN reviews r ON r.product_id = p.id
        LEFT JOIN inventory i ON i.product_id = p.id
        GROUP BY p.id, c.name, i.stock
        ORDER BY p.id
        LIMIT $1 OFFSET $2
      `;
      const dbStart = Date.now();
      const result = await pool.query(query, [limit, offset]);
      dbTime = Date.now() - dbStart;

      data = result.rows;

      // Store in Redis with dynamic TTL
      const ttl = process.env.TTL || 60; // default 60s
      if (REDIS_ENABLED && redisClient) {
        redisClient.setEx(cacheKey, ttl, JSON.stringify(data));
        console.log(`[REDIS CACHE SET] ${cacheKey} TTL:${ttl}s`);
      }
    }

    // Calculate backend processing time
    const backendProcessingTime = Date.now() - req.startTime;

    // Response with metrics
    res.json({
      success: true,
      data,
      metrics: {
        backendProcessingTime,
        dbTime,
        redisHit,
        cacheStrategy: REDIS_ENABLED ? "Redis Only" : "None",
        timestamp: new Date().toISOString(),
      },
    });

    console.log(
      `[METRICS] Backend: ${backendProcessingTime}ms | Redis Hit: ${redisHit}`
    );
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    config: {
      redisCache: REDIS_ENABLED ? "on" : "off",
    },
  });
});

async function startServer() {
  if (REDIS_ENABLED && redisClient) {
    await redisClient.connect();
    console.log("Connected to Redis");
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Redis Cache: ${REDIS_ENABLED ? "ON" : "OFF"}`);
  });
}

startServer();
