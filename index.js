import "dotenv/config";
import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";

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

app.get("/tutions", async(req, res)=>{
  const result = await tutions.find().toArray();
  res.send(result)
})




app.get("/", (req, res) => {
  res.send("Server is working!");
});

app.listen(PORT, () => {
  console.log(`Server is working on PORT ${PORT}`);
});
