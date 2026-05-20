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
const PORT = process.env.PORT;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



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
    console.log(payload);
    next();
  } catch (error) {
    return res.status(403).json({ message: "Forbidden" });
  }
};


async function run() {
  try {
    // create db or call db
    await client.connect();

    const db = client.db("medicqueue")
    const doctorsCollection = db.collection("doctors")
    const appointmentCollection = db.collection("appointment")
    const usersCollection = db.collection("users")

    // all doctors data 
    app.get("/doctors", async (req, res) => {
      const result = await doctorsCollection.find().toArray();
      res.json(result);
    });

    // doctors info id wise
    app.get("/doctors/:id", async (req, res) => {
      const { id } = req.params;

      const result = await doctorsCollection.findOne({
        _id: new ObjectId(id),
      });

      res.json(result);
    });




    // all appointment data  read
    app.get("/appointments", async (req, res) => {
      const result = await appointmentCollection.find().toArray();
      res.json(result);
    });



    // appointment booking api
    app.post("/appointment", verifyToken, async (req, res) => {
      const appointmentData = req.body;
      const result = await appointmentCollection.insertOne(appointmentData);

      res.status(201).json(result);
    });

    // appointment delete api
    app.delete("/appointment/:bookingId", verifyToken, async (req, res) => {
      const { bookingId } = req.params;
      const result = await appointmentCollection.deleteOne({
        _id: new ObjectId(bookingId),
      });

      res.json(result);
    });

    // user profile update api
    app.patch("/users/:email", verifyToken, async (req, res) => {
      const { email } = req.params;
      const updatedData = req.body;
      console.log("Updating user profile:", email, updatedData);

      const result = await usersCollection.updateOne(
        { email: email },
        { $set: { ...updatedData, email } },
        { upsert: true }
      );


      

      res.json(result);
    });




























    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("Server is running fine!");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});