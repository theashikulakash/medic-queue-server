const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require("mongodb");
dotenv.config();

const uri = process.env.MONGODB_URI;

const app = express();
const PORT = process.env.PORT;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // create db or call db
    await client.connect();

    const db = client.db("medicqueue")
    const doctorsCollection = db.collection("doctors")

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