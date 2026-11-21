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

// update tution data by tutor
app.patch("/tutions/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid tuition id" });
  }
  const allowed = [
    "title", "subject", "classLevel", "mode", "location",
    "monthlyFee", "daysPerWeek", "bannerImage", "description",
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (!Object.keys(updates).length) {
    return res.status(400).send({ message: "No valid fields to update" });
  }

  const result = await tutions.updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );

  if (!result.matchedCount) {
    return res.status(404).send({ message: "Tuition not found" });
  }
  res.send({ success: true, updates });
});

// Tution data delete by tutor
app.delete("/tutions/:id", async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid tuition id" });
  }
  const result = await tutions.deleteOne({ _id: new ObjectId(id) });

  if (!result.deletedCount) {
    return res.status(404).send({ message: "Tuition not found" });
  }
  res.send({ success: true });
});


// create a new tuition listing (tutorId)
const nextTutionId = async () => {
  const [last] = await tutions
    .find({ tutionId: { $regex: /^MU\d+$/ } })
    .sort({ tutionId: -1 })
    .limit(1)
    .toArray();

  const lastNumber = last ? Number(last.tutionId.replace(/^MU/, "")) : 0;

  return `MU${String(lastNumber + 1).padStart(5, "0")}`;
};

// new post by tutor
app.post("/tutions", async (req, res) => {
  try {
    const body = req.body ?? {};

    if (!body.title || !body.subject || !body.tutorEmail) {
      return res
        .status(400)
        .send({ message: "title, subject and tutorEmail are required" });
    }

    const doc = {
      // Keep the same MU00001-style ids the existing records use.
      tutionId: body.tutionId || (await nextTutionId()),
      title: String(body.title).trim(),
      subject: String(body.subject).trim(),
      classLevel: body.classLevel ?? "",
      mode: body.mode === "Offline" ? "Offline" : "Online",
      location: body.location ?? "",
      monthlyFee: Number(body.monthlyFee) || 0,
      daysPerWeek: Number(body.daysPerWeek) || 0,
      bannerImage: body.bannerImage ?? "",
      description: body.description ?? "",
      tutorName: body.tutorName ?? "",
      tutorEmail: body.tutorEmail,
      // A new listing always waits for admin review and starts active.
      approvalStatus: "pending",
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    const result = await tutions.insertOne(doc);

    res.status(201).send({
      success: true,
      insertedId: result.insertedId,
      inserted: { ...doc, _id: result.insertedId },
    });
  } catch (error) {
    console.error("Failed to create tuition:", error);
    res.status(500).send({ message: "Failed to create tuition" });
  }
});




app.get("/", (req, res) => {
  res.send("Server is working!");
});

app.listen(PORT, () => {
  console.log(`Server is working on PORT ${PORT}`);
});



