const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STIPE_SECRET_KEY);

const port = process.env.PORT || 5000;
const app = express();

// midlewire
app.use(cors());
app.use(express.json());

// verify jwt token
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).send({ error: true, message: "unautorized access" });
  }

  // split token
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unautorized access" });
    }

    req.decoded = decoded;
    next();
  });
};

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
    const paymentCollenction = client.db("artshalaDb").collection("payments");
    const selectedClassesCollenction = client
      .db("artshalaDb")
      .collection("selectedClasses");

    // jwt token
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // ---------------------------common api---------------------------
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

    // get all instructors
    app.get("/instructors", async (req, res) => {
      const query = { role: "instructor" };
      const result = await usersCollenction.find(query).toArray();
      res.send(result);
    });
    // get class
    app.get("/classes", async (req, res) => {
      const result = await classCollenction.find().toArray();
      res.send(result);
    });

    // -------------------------admin relared api-----------------
    // verify if the user is admin or not
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEamil = req.decoded.email;
      if (email !== decodedEamil) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollenction.findOne(query);
      if (user) {
        const result = { admin: user?.role === "admin" };
        res.send(result);
      }
    });

    // make a user instructor
    app.patch("/user-role/:id", async (req, res) => {
      const id = req.params.id;
      const role = req.query.role;

      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: role,
        },
      };
      const result = await usersCollenction.updateOne(query, updatedDoc);
      res.send(result);
    });

    // get all classes
    app.get("/all-class", async (req, res) => {
      const result = await classCollenction.find().toArray();
      res.send(result);
    });

    // class status (approve or deny) api
    app.patch("/class-status/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.query.status;
      const query = { _id: new ObjectId(id) };
      const updatedStatus = {
        $set: {
          status: status,
        },
      };

      const result = await classCollenction.updateOne(query, updatedStatus);
      res.send(result);
    });

    // feedback api
    app.patch("/class-feedback/:id", async (req, res) => {
      const id = req.params.id;
      const feedback = req.body.feedback;

      const query = { _id: new ObjectId(id) };
      const updatedFeedback = {
        $set: {
          feedback: feedback,
        },
      };
      const result = await classCollenction.updateOne(query, updatedFeedback);
      res.send(result);
    });

    // -------------------------instructor relared api-----------------
    // verify if the user is instructor or not
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEamil = req.decoded.email;
      if (email !== decodedEamil) {
        res.send({ instructor: false });
      }

      const query = { email: email };
      const user = await usersCollenction.findOne(query);
      if (user) {
        const result = { instructor: user?.role === "instructor" };
        res.send(result);
      }
    });

    // add a class
    app.post("/class", async (req, res) => {
      const classData = req.body;
      const result = await classCollenction.insertOne(classData);
      res.send(result);
    });

    // get all classes of instructor by email
    app.get("/class/:email", async (req, res) => {
      const email = req.params.email;
      const query = { instructor_email: email };
      const result = await classCollenction.find(query).toArray();
      res.send(result);
    });

    // ------------------------ student related api---------------------
    // select class
    app.post("/select-class", async (req, res) => {
      const selectedClassInfo = req.body;
      const result = await selectedClassesCollenction.insertOne(
        selectedClassInfo
      );
      res.send(result);
    });

    // get student's selected classes by email
    app.get("/select-class/:email", async (req, res) => {
      const email = req.params.email;
      const query = { student_email: email };
      const result = await selectedClassesCollenction.find(query).toArray();
      res.send(result);
    });

    // remove selected class
    app.delete("/select-class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassesCollenction.deleteOne(query);
      res.send(result);
    });

    // ---------------------------- payment related api--------------------------
    // get information of selected class
    app.get("/select-single-class/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassesCollenction.findOne(query);
      res.send(result);
    });

    // stripe payment calculation
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment information save api
    app.post("/payments", async (req, res) => {
      const paymentData = req.body;
      const result = await paymentCollenction.insertOne(paymentData);
      res.send(result);
    });

    // reduce available seat after student paument
    app.patch("/class/:id", async (req, res) => {
      const id = req.params.id;
      const reduceSeats = req.body.reduceSeats;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          available_seats: reduceSeats,
        },
      };
      const result = await classCollenction.updateOne(query, updatedDoc);
      res.send(result);
    });

    // get payment history and info by student's email

    app.get("/payments/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const options = {
        sort: { date: -1 },
      };
      const result = await paymentCollenction.find(query, options).toArray();
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
