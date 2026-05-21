const express = require("express");
const cors = require('cors');
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");
dotenv.config();

const uri = process.env.MONGODB_URI;
const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Create a single client instance outside the handler for connection pooling
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Helper function to get DB cleanly on serverless invocations
let db;
async function getDb() {
  if (!db) {
    await client.connect();
    db = client.db("medicqueue");
  }
  return db;
}

// JWT Auth Middleware
const JWKS = createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`));

const verifyToken = async (req, res, next) => {
  const authHeader = req?.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    req.user = payload; // Attach user payload to request
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};

// --- ROUTES ---

// Base test route
app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

// All doctors data 
app.get("/appointment", async (req, res) => {
  try {
    const database = await getDb();
    const result = await database.collection("doctors").find().toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Doctors info id wise
app.get("/appointment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const database = await getDb();
    const result = await database.collection("doctors").findOne({
      _id: new ObjectId(id),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All bookings data read
app.get("/bookings", async (req, res) => {
  try {
    const database = await getDb();
    const result = await database.collection("appointment").find().toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Booking new booking api
app.post("/bookings", verifyToken, async (req, res) => {
  try {
    const appointmentData = req.body;
    const database = await getDb();
    const result = await database.collection("appointment").insertOne(appointmentData);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// booking update api
app.patch("/bookings/:bookingId", verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const updatedData = req.body;
    const database = await getDb();
    const result = await database.collection("appointment").updateOne(
      { _id: new ObjectId(bookingId) },
      { $set: updatedData }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Booking delete api
app.delete("/bookings/:bookingId", verifyToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const database = await getDb();
    const result = await database.collection("appointment").deleteOne({
      _id: new ObjectId(bookingId),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User profile update api
app.patch("/users/:email", verifyToken, async (req, res) => {
  try {
    const { email } = req.params;
    const updatedData = req.body;
    const database = await getDb();
    
    const result = await database.collection("users").updateOne(
      { email: email },
      { $set: { ...updatedData, email } },
      { upsert: true }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export for Vercel Serverless environment
module.exports = app;

// Keep listen block for local development fallback
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}