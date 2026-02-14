const supabase = require("../models/bin");
const cloudinary = require("../config/cloudinary");

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
