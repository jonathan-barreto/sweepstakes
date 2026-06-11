import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface LeaderboardSnapshot {
  id: string;
  user_id: string;
  username: string;
  score: number;
  correct_count: number;
  correct_results: number;
  current_rank: number;
  previous_rank: number | null;
  created_at: string;
  updated_at: string;
}

function jsonResponse(
  data: unknown,
  status: number,
  headers?: Record<string, string>
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...headers,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  if (req.method !== "GET") {
    return jsonResponse(
      { success: false, message: "Method not allowed" },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration");
      return jsonResponse(
        { success: false, message: "Internal Server Error" },
        500
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: leaderboard, error } = await supabase
      .from("leaderboard_snapshots")
      .select("*")
      .order("current_rank", { ascending: true });

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return jsonResponse(
        { success: false, message: "Error fetching leaderboard" },
        500
      );
    }

    return jsonResponse(
      {
        success: true,
        data: leaderboard,
        message: "Leaderboard fetched successfully",
      },
      200
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Unexpected error:", errorMessage);
    return jsonResponse(
      { success: false, message: "Internal server error" },
      500
    );
  }
});
