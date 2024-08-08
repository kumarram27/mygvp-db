const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const serverless = require("serverless-http");

const app = express();
const router = express.Router();

// Hardcoded MongoDB URI (For testing purposes)
const uri =
  process.env.MONGODB_URI ||
  `mongodb+srv://mygvp0:kumarram59266@mygvp0.wrf9s.mongodb.net/mygvp?retryWrites=true&w=majority`;

// MongoDB connection
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Define a schema and model for GPA data
const gpaSchema = new mongoose.Schema({
  registrationNumber: { type: String, required: true, unique: true },
  gpas: {
    type: Map,
    of: Number,
  },
});

const Gpa = mongoose.model("Result", gpaSchema, "results");

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint to save GPA data
router.post("/save-gpa", async (req, res) => {
  const { registrationNumber, gpas } = req.body;

  try {
    if (typeof registrationNumber !== "string" || typeof gpas !== "object") {
      return res.status(400).json({ error: "Invalid input format" });
    }

    const existingGpa = await Gpa.findOne({ registrationNumber });

    if (existingGpa) {
      for (const [sem, gpa] of Object.entries(gpas)) {
        existingGpa.gpas.set(sem, gpa);
      }
      await existingGpa.save();
    } else {
      const newGpa = new Gpa({
        registrationNumber,
        gpas: new Map(Object.entries(gpas)),
      });
      await newGpa.save();
    }

    res.json({ message: "GPA data saved successfully" });
  } catch (error) {
    console.error("Error saving GPA data:", error.message);
    res.status(500).json({ error: "Error saving GPA data" });
  }
});

// Endpoint to retrieve GPA data
router.get("/get-gpa/:registrationNumber", async (req, res) => {
  const { registrationNumber } = req.params;

  try {
    const gpaData = await Gpa.findOne({ registrationNumber });

    if (gpaData) {
      res.json(gpaData);
    } else {
      res.status(404).json({ error: "GPA data not found" });
    }
  } catch (error) {
    console.error("Error retrieving GPA data:", error.message);
    res.status(500).json({ error: "Error retrieving GPA data" });
  }
});

app.use("/api", router);

// Export the app as a Vercel function
module.exports.handler = serverless(app);
