const supabase = require("../models/bin");

exports.createBin = async (req, res) => {
  try {
    const { latitude, longitude, capacity, department, installation_date } = req.body;

    let image_url = null;

    if (req.file) {
      const fileName = `bin-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("bin-images")
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("bin-images")
        .getPublicUrl(fileName);

      image_url = data.publicUrl;
    }

    const { data, error } = await supabase
      .from("bins")
      .insert([{ latitude, longitude, capacity, department, installation_date, image_url }]);

    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getBins = async (req, res) => {
  const { data, error } = await supabase.from("bins").select("*");

  if (error) return res.status(500).json({ error });

  res.json(data);
};