import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// 1. TYPE DEFINITIONS
interface Match {
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
  predicted_home_score?: number | null
  predicted_away_score?: number | null
}

interface GroupedMatches {
  [key: string]: Match[]
}

interface GetMatchesResponse {
  success: boolean
  data: {
    current_round: number
    current_date: string
    total_matches: number
    current_group: string | null
    groups: GroupedMatches
    matches: Match[]
  }
  message: string
}

// 2. HELPER FUNCTIONS
function getCurrentRound(now: Date): number {
  const round1Start = new Date("2026-06-11")
  const round2Start = new Date("2026-06-18")
  const round3Start = new Date("2026-06-24")
  const groupPhaseEnd = new Date("2026-06-28")

  if (now < round2Start) {
    return 1
  } else if (now < round3Start) {
    return 2
  } else if (now < groupPhaseEnd) {
    return 3
  }

  return 3
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
  })
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

    // Get current round
    const now = new Date()
    const currentRound = getCurrentRound(now)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration")
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

    // Fetch matches for current round
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("*")
      .eq("round_number", currentRound)
      .order("group_name", { ascending: true })
      .order("match_date", { ascending: true })

    if (matchesError) {
      console.error("Database error:", matchesError.message)
      return jsonResponse(
        {
          success: false,
          data: null,
          message: "Failed to fetch matches",
        },
        500
      )
    }

    // Fetch predictions if participant_id provided
    let predictions: { [key: string]: Match } = {}
    if (participantId) {
      const { data: predictionsData } = await supabase
        .from("predictions")
        .select("match_id, predicted_home_score, predicted_away_score")
        .eq("participant_id", participantId)

      if (predictionsData) {
        predictionsData.forEach((pred: any) => {
          predictions[pred.match_id] = {
            predicted_home_score: pred.predicted_home_score,
            predicted_away_score: pred.predicted_away_score,
          } as any
        })
      }
    }

    // Group matches by group_name (alphabetically)
    const groupedMatches: GroupedMatches = {}
    const allGroups: string[] = []

    matches?.forEach((match: any) => {
      if (!groupedMatches[match.group_name]) {
        groupedMatches[match.group_name] = []
        allGroups.push(match.group_name)
      }

      // Add predictions to match if available
      const matchWithPredictions = {
        ...match,
        predicted_home_score: predictions[match.id]?.predicted_home_score ?? null,
        predicted_away_score: predictions[match.id]?.predicted_away_score ?? null,
      }

      groupedMatches[match.group_name].push(matchWithPredictions)
    })

    // Sort groups alphabetically
    allGroups.sort()
    const sortedGroupedMatches: GroupedMatches = {}
    allGroups.forEach((group) => {
      sortedGroupedMatches[group] = groupedMatches[group]
    })

    // Determine current group (first group with incomplete predictions)
    let currentGroup: string | null = null
    if (participantId) {
      for (const group of allGroups) {
        const groupMatches = sortedGroupedMatches[group]
        const hasIncomplete = groupMatches.some(
          (m) => m.predicted_home_score === null || m.predicted_away_score === null
        )
        if (hasIncomplete) {
          currentGroup = group
          break
        }
      }
    } else {
      // If no participant_id, start with group A
      currentGroup = allGroups[0] || null
    }

    // 4. ERROR HANDLING (handled above with database error)

    // 5. CORS (configured in jsonResponse)

    // 6. RESPONSE
    return jsonResponse(
      {
        success: true,
        data: {
          current_round: currentRound,
          current_date: now.toISOString(),
          total_matches: matches?.length || 0,
          current_group: currentGroup,
          groups: sortedGroupedMatches,
          matches: matches || [],
        },
        message: `Rodada ${currentRound} - Grupo ${currentGroup || "A"} - ${matches?.length || 0} matches`,
      },
      200
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Unhandled error:", errorMessage)

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
