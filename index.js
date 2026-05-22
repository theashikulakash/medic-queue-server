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

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// serverless invocations
let db;
async function getDb() {
  if (!db) {
    await client.connect();
    db = client.db("medicqueue");
  }
  return db;
}

// JWT Auth verifyToken
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

// test route
app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

// all doctors data 
app.get("/appointment", async (req, res) => {
  try {
    const database = await getDb();
    const result = await database.collection("doctors").find().toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// doctors info id wise
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

// all bookings data read
app.get("/bookings", async (req, res) => {
  try {
    const database = await getDb();
    const result = await database.collection("appointment").find().toArray();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// booking new booking api
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

// booking delete api
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

// user profile fetch api
app.get("/user/:email", verifyToken, async (req, res) => {
  try {
    const { email } = req.params;
    const database = await getDb();
    const user = await database.collection("user").findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// user profile update api
app.patch("/user/:email", verifyToken, async (req, res) => {
  try {
    const { email } = req.params;
    const { email: newEmail, name, gender, phone, image } = req.body;
    const database = await getDb();

    // Use the new email if provided, otherwise keep the old one
    const updatedEmail = newEmail || email;

    const result = await database.collection("user").updateOne(
      { email: email },
      { $set: { email: updatedEmail, name, gender, phone, image } },
      { upsert: true }
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// post review api
app.post("/reviews", verifyToken, async (req, res) => {
  try {
    const { doctorId, reviewText, stars } = req.body;
    const userEmail = req.user.email;

    // Validate input
    if (!doctorId || !reviewText || stars === undefined) {
      return res.status(400).json({ message: "Missing required fields: doctorId, reviewText, stars" });
    }

    if (typeof stars !== 'number' || stars < 0 || stars > 5) {
      return res.status(400).json({ message: "Stars must be a number between 0 and 5" });
    }

    if (typeof reviewText !== 'string' || reviewText.trim() === '') {
      return res.status(400).json({ message: "Review text cannot be empty" });
    }

    const database = await getDb();
    const reviewData = {
      doctorId: new ObjectId(doctorId),
      userEmail,
      reviewText: reviewText.trim(),
      stars,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await database.collection("reviews").insertOne(reviewData);
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get reviews for a specific doctor
app.get("/reviews/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;
    const database = await getDb();
    const reviews = await database
      .collection("reviews")
      .find({ doctorId: new ObjectId(doctorId) })
      .toArray();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get all reviews
app.get("/reviews", async (req, res) => {
  try {
    const database = await getDb();
    const reviews = await database.collection("reviews").find().toArray();
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




module.exports = app;




if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}