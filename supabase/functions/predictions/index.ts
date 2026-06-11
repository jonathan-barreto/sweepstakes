import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// 1. TYPE DEFINITIONS
interface Prediction {
  id: string
  participant_id: string
  match_id: string
  predicted_home_score: number | null
  predicted_away_score: number | null
  points: number | null
  match: {
    id: string
    stage: string
    group_name: string
    round_number: number
    match_date: string
    home_team: string
    away_team: string
    city: string
    status: string
    home_score: number | null
    away_score: number | null
  }
}

interface RoundData {
  round_number: number
  predictions: Prediction[]
  round_points: number
  round_correct: number
}

interface PredictionsResponse {
  success: boolean
  data: {
    participant_id: string
    total_predictions: number
    total_points: number
    rounds: {
      [key: number]: RoundData
    }
  } | null
  message: string
}

// 2. HELPER FUNCTIONS
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
  })
}

function logError(ctx: string, err: unknown, details?: any) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`[predictions] ${ctx}:`, message, details || "")
}

// 3. MAIN HANDLER
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return jsonResponse({}, 200)
  }

  if (req.method !== "GET") {
    return jsonResponse(
      {
        success: false,
        data: null,
        message: "Method not allowed",
      },
      405
    )
  }

  try {
    // Get query parameters
    const url = new URL(req.url)
    const participantId = url.searchParams.get("participant_id")

    if (!participantId) {
      return jsonResponse(
        {
          success: false,
          data: null,
          message: "participant_id is required",
        },
        400
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseKey) {
      logError("Missing configuration", new Error("Supabase env vars missing"))
      return jsonResponse(
        {
          success: false,
          data: null,
          message: "Internal Server Error",
        },
        500
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch predictions for the participant with match details
    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select(
        `
        id,
        participant_id,
        match_id,
        predicted_home_score,
        predicted_away_score,
        points,
        matches(
          id,
          stage,
          group_name,
          round_number,
          match_date,
          home_team,
          away_team,
          city,
          status,
          home_score,
          away_score
        )
      `
      )
      .eq("participant_id", participantId)
      .order("matches(match_date)", { ascending: true })

    if (predictionsError) {
      logError("Database error", predictionsError, { participantId })
      return jsonResponse(
        {
          success: false,
          data: null,
          message: "Failed to fetch predictions",
        },
        500
      )
    }

    // Group predictions by round
    const roundsMap: {
      [key: number]: RoundData
    } = {}

    let totalPoints = 0

    predictions?.forEach((prediction: any) => {
      const roundNumber = prediction.matches?.round_number || 0

      // Initialize round if not exists
      if (!roundsMap[roundNumber]) {
        roundsMap[roundNumber] = {
          round_number: roundNumber,
          predictions: [],
          round_points: 0,
          round_correct: 0,
        }
      }

      // Add prediction to round
      roundsMap[roundNumber].predictions.push(prediction)

      // Calculate round points
      const points = prediction.points || 0
      roundsMap[roundNumber].round_points += points
      totalPoints += points

      if (points > 0) {
        roundsMap[roundNumber].round_correct++
      }
    })

    // Sort rounds by number
    const sortedRounds: {
      [key: number]: RoundData
    } = {}
    Object.keys(roundsMap)
      .map(Number)
      .sort((a, b) => a - b)
      .forEach((roundNum) => {
        sortedRounds[roundNum] = roundsMap[roundNum]
      })

    return jsonResponse(
      {
        success: true,
        data: {
          participant_id: participantId,
          total_predictions: predictions?.length || 0,
          total_points: totalPoints,
          rounds: sortedRounds,
        },
        message: `Histórico de ${predictions?.length || 0} palpites - Total: ${totalPoints} pontos`,
      },
      200
    )
  } catch (error) {
    logError("Unhandled error", error)
    return jsonResponse(
      {
        success: false,
        data: null,
        message: "Internal Server Error",
      },
      500
    )
  }
})
