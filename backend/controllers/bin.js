const supabase = require("../models/bin");
const cloudinary = require("../config/cloudinary");
const axios = require("axios");

// Create a new bin
const createBin = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      capacity,
      department,
      corner_position,
      installation_date,
    } = req.body;

    let imageUrl = null;
    let prediction = null;
    let confidence = 0;

    // Upload image to Cloudinary if provided
    if (req.file) {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: "bins" }, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          })
          .end(req.file.buffer);
      });

      imageUrl = uploadResult.secure_url;
      //YOLO microservice
      try {
        const yoloResponse = await axios.post(
          "https://valentine-is-trash.onrender.com/predict",
          {
            image_url: imageUrl,
          }
        );

        prediction = yoloResponse.data.prediction;
        confidence = yoloResponse.data.confidence;
      } catch (yoloError) {
        console.error("YOLO API Error:", yoloError.message);
      }
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from("bins")
      .insert([
        {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          capacity,
          department,
          corner_position,
          installation_date,
          image_url: imageUrl,
          prediction,
          confidence,
        },
      ])
      .select();
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get all bins
const getBins = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("bins")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { createBin, getBins };
