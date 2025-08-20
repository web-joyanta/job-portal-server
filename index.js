const express = require("express");
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.BD_User}:${process.env.BD_Password}@cluster0.z1ypfcb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // jobs related apis
    const jobsDB = client.db("jobPortalDB");
    const jobsCollection = jobsDB.collection("jobs");
    const jobsApplicationCollection = jobsDB.collection("job_applications");

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const jobs = jobsCollection.find(query);
      const result = await jobs.toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // query data
    app.get("/job-application", async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };
      const result = await jobsApplicationCollection.find(query).toArray();

      // code ignore not best way
      for (const job of result) {
        const jobId = job.job_id;
        const jobQuery = { _id: new ObjectId(jobId) };
        const jobDetails = await jobsCollection.findOne(jobQuery);
        if (jobDetails) {
          job.title = jobDetails.title;
          job.company = jobDetails.company;
          job.company_logo = jobDetails.company_logo;
          job.location = jobDetails.location;
          job.description = jobDetails.description;
          job.applicationDeadline = jobDetails.applicationDeadline;
        }
      }
      // end code ignore

      res.send(result);
    });

    // recruiter view applications related apis
    app.get("/viewApplications/jobs/:job_id", async (req, res) => {
      const jobId = req.params.job_id;
      const query = { job_id: jobId };
      const result = await jobsApplicationCollection.find(query).toArray();
      res.send(result);
    })

    // job post
    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });

    // job collection apis
    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await jobsApplicationCollection.insertOne(application);
      // code ignore not best way
      const id = application.job_id;
      const query = { _id: new ObjectId(id) };
      const job = await jobsCollection.findOne(query);
      // update job application count
      let newCount = 0;
      if (job.applicationCount) {
        newCount = job.applicationCount + 1;
      } else {
        newCount = 1;
      }
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          applicationCount: newCount,
        }
      }
      const updateResult = await jobsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    })

  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Server is Connate Port: ${port}`);
});