import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 8000;

const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}
// db and collections
const mongoClient = await connectToMongoDB();
const db = mongoClient.db("mentor-lagbe");
const users = db.collection("user")
const tutions = db.collection("tution");
const applications = db.collection("application");
const payments = db.collection("payment")

// get user data
app.get("/users", async(req, res)=>{
  const query = {}
  const result = await users.find(query).toArray();
  res.send(result)
})

// access to tution by query
app.get("/tutions", async(req, res)=>{
  const query = {}
  if (req.query.tutorEmail){
    query.tutorEmail= req.query.tutorEmail
  }
  if (req.query.approvalStatus){
    query.approvalStatus= req.query.approvalStatus
  }
  if (req.query.isActive){
    query.isActive= req.query.isActive
  }
  const result = await tutions.find(query).toArray();
  res.send(result)
})


// approval status updated by admin
// app.patch('/tutions/:id/approvalStatus', async(req, res)=>{
//   const id = req.params.id;
//   const query = {_id: ObjectId(id)}
//   const updatedDoc = {
//     $set:{
//       approvalStatus: req.body.approvalStatus
//     }
//   }
//   const result = await tutions.updateOne(query, updatedDoc)
//   res.send(result)
// })

// approval status updated by admin
app.patch("/tutions/:id/approvalStatus", async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).send({ message: "Invalid approvalStatus" });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid tuition id" });
    }

    const result = await tutions.updateOne(
      { _id: new ObjectId(id) },
      { $set: { approvalStatus, isActive: approvalStatus === "approved" } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Tuition not found" });
    }

    res.send({ success: true, approvalStatus });
  } catch (error) {
    console.error("Failed to update approval status:", error);
    res.status(500).send({ message: "Failed to update approval status" });
  }
});

// active /closed by tutor
app.patch("/tutions/:id/isActive", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).send({ message: "Invalid isActive" });
    }

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid tuition id" });
    }

    const result = await tutions.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Tuition not found" });
    }

    res.send({ success: true, isActive });
  } catch (error) {
    console.error("Failed to update isActive status:", error);
    res.status(500).send({ message: "Failed to update active status" });
  }
});

// access to tution application by query
app.get("/applications", async(req, res)=>{
  const query = {}
  if (req.query.tutorEmail){
    query.tutorEmail= req.query.tutorEmail
  }
  const result = await applications.find(query).toArray();
  res.send(result)
})

// accepted/rejected/pending of student request by tutor
// tutor accepts or rejects a student's application
app.patch("/applications/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!["accepted", "rejected"].includes(status) || !ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid request" });
  }
  const result = await applications.updateOne(
    { _id: new ObjectId(id) },
    { $set: { status } }
  );
  if (!result.matchedCount) {
    return res.status(404).send({ message: "Application not found" });
  }
  res.send({ success: true, status });
});

app.get("/", (req, res) => {
  res.send("Server is working!");
});

app.listen(PORT, () => {
  console.log(`Server is working on PORT ${PORT}`);
});

