const express = require("express");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

// midlewire
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kgqetuh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    const usersCollenction = client.db("artshalaDb").collection("users");
    const classCollenction = client.db("artshalaDb").collection("classes");
    const instructorCollenction = client
      .db("artshalaDb")
      .collection("instructors");

    // users related api
    // get all users
    app.get("/users", async (req, res) => {
      const result = await usersCollenction.find().toArray();
      res.send(result);
    });

    // save user's information
    app.put("/users/:email", async (req, res) => {
      const user = req.body;
      const email = req.params.email;

      const query = { email: email };
      const options = { upsert: true };
      const updateUser = {
        $set: {
         ...user,
        },
      };

      const isExist = await usersCollenction.findOne(query);
      if (isExist) {
        return;
      } else {
        const result = await usersCollenction.updateOne(
          user,
          updateUser,
          options
        );
        res.send(result);
      }
    });

    app.patch("/user-role/:id", async (req, res) => {
      const id = req.params.id;
      const role = req.query.role;
      console.log(role);
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: role,
        },
      };
      const result = await usersCollenction.updateOne(query, updatedDoc);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to Artshala Server");
});

app.listen(port, () => {
  console.log(`Artshala server is running on port: ${port}`);
});
