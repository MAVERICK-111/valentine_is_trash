const supabase = require("../config/supabase");

// Create a new bin
const createBin = async (req, res) => {
  try {
    const { latitude, longitude, capacity, department, corner_position, installation_date } = req.body;
    
    let imageUrl = null;

    // Upload image to Supabase Storage if provided
    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("bin-images")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);
      } else {
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from("bin-images")
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }
    }

    // Insert bin data into database
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
      console.error("Database error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data[0]);
  } catch (error) {
    console.error("Server error:", error);
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
      console.error("Database error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { createBin, getBins };