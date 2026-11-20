import 'dotenv/config'
import express from "express"
import cors from "cors"

const app = express()
app.use(cors())
app.use(express.json())
const PORT = 6000

import { MongoClient } from 'mongodb';
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





app.get('/', (req, res) => {
  res.send('Server is working!')
})

app.listen(PORT, () => {
  console.log(`Server is working on PORT ${PORT}`)
})