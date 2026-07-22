import express from "express";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Update user endpoint
app.post("/update", async (req, res) => { // <-- URL path, not file path
  const { id, email, role } = req.body;

  if (!id || !email || !role) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data, error } = await supabase
      .from("app_users")
      .update({ email, role })
      .eq("id", id)
      .select(); // return updated row

    if (error) throw error;

    res.status(200).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(4000, () => console.log("Server running on http://localhost:4000"));
