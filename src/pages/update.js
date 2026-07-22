import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // service role key
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const { id, email, role } = req.body;
  if (!id || !email || !role) return res.status(400).send("Missing fields");

  try {
    const { data, error } = await supabase
      .from("app_users")
      .update({ email, role })
      .eq("id", id)
      .select();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
