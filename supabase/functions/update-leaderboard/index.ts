import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface Prediction {
  id: string;
  participant_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points: number;
}

interface Match {
  id: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
}

interface ParticipantStats {
  participant_id: string;
  username: string;
  total_score: number;
  correct_count: number;
  correct_results: number;
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...headers,
    },
  });
}

function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number | null,
  actualAway: number | null
): number {
  if (actualHome === null || actualAway === null) {
    return 0;
  }

  const predictedResult = Math.sign(predictedHome - predictedAway);
  const actualResult = Math.sign(actualHome - actualAway);

  if (predictedHome === actualHome && predictedAway === actualAway) {
    return 3;
  }

  if (predictedResult === actualResult) {
    return 1;
  }

  return 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, 200);
  }

  if (req.method !== "POST") {
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

    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id, home_score, away_score, status")
      .eq("status", "finished");

    if (matchesError) {
      console.error("Error fetching matches:", matchesError);
      return jsonResponse(
        { success: false, message: "Error fetching matches" },
        500
      );
    }

    const matchMap = new Map<string, Match>();
    matches.forEach((match: Match) => {
      matchMap.set(match.id, match);
    });

    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("*");

    if (predictionsError) {
      console.error("Error fetching predictions:", predictionsError);
      return jsonResponse(
        { success: false, message: "Error fetching predictions" },
        500
      );
    }

    const participantStats = new Map<string, ParticipantStats>();

    for (const prediction of predictions) {
      const match = matchMap.get(prediction.match_id);
      const points = calculatePoints(
        prediction.predicted_home_score,
        prediction.predicted_away_score,
        match?.home_score ?? null,
        match?.away_score ?? null
      );

      const { error: updateError } = await supabase
        .from("predictions")
        .update({ points })
        .eq("id", prediction.id);

      if (updateError) {
        console.error(`Error updating prediction ${prediction.id}:`, updateError);
        continue;
      }

      if (!participantStats.has(prediction.participant_id)) {
        const { data: participant, error: participantError } = await supabase
          .from("participants")
          .select("id, name")
          .eq("id", prediction.participant_id)
          .single();

        if (participantError || !participant) {
          console.error(`Error fetching participant ${prediction.participant_id}:`, participantError);
          continue;
        }

        participantStats.set(prediction.participant_id, {
          participant_id: prediction.participant_id,
          username: participant.name,
          total_score: 0,
          correct_count: 0,
          correct_results: 0,
        });
      }

      const stats = participantStats.get(prediction.participant_id)!;
      stats.total_score += points;

      if (points === 3) {
        stats.correct_count++;
      } else if (points === 1) {
        stats.correct_results++;
      }
    }

    const { data: participants, error: participantsError } = await supabase
      .from("participants")
      .select("id, name");

    if (participantsError) {
      console.error("Error fetching participants:", participantsError);
      return jsonResponse(
        { success: false, message: "Error fetching participants" },
        500
      );
    }

    for (const participant of participants) {
      if (!participantStats.has(participant.id)) {
        participantStats.set(participant.id, {
          participant_id: participant.id,
          username: participant.name,
          total_score: 0,
          correct_count: 0,
          correct_results: 0,
        });
      }
    }

    const sortedStats = Array.from(participantStats.values()).sort(
      (a, b) => b.total_score - a.total_score
    );

    const { data: existingSnapshots, error: snapshotsError } = await supabase
      .from("leaderboard_snapshots")
      .select("user_id, current_rank");

    if (snapshotsError) {
      console.error("Error fetching existing snapshots:", snapshotsError);
      return jsonResponse(
        { success: false, message: "Error fetching snapshots" },
        500
      );
    }

    const rankMap = new Map<string, number>();
    existingSnapshots.forEach((snapshot: { user_id: string; current_rank: number }) => {
      rankMap.set(snapshot.user_id, snapshot.current_rank);
    });

    const snapshotsToUpsert = sortedStats.map((stats, index) => ({
      user_id: stats.participant_id,
      username: stats.username,
      score: stats.total_score,
      correct_count: stats.correct_count,
      correct_results: stats.correct_results,
      current_rank: index + 1,
      previous_rank: rankMap.get(stats.participant_id) || null,
    }));

    const { error: upsertError } = await supabase
      .from("leaderboard_snapshots")
      .upsert(snapshotsToUpsert, { onConflict: "user_id" });

    if (upsertError) {
      console.error("Error upserting leaderboard snapshots:", upsertError);
      return jsonResponse(
        { success: false, message: "Error updating leaderboard" },
        500
      );
    }

    return jsonResponse(
      {
        success: true,
        message: "Leaderboard updated successfully",
        updated_participants: snapshotsToUpsert.length,
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
