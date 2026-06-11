import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// 1. TYPE DEFINITIONS
interface CreatePredictionRequest {
  participant_id: string
  match_id: string
  predicted_home_score: number
  predicted_away_score: number
}

// 2. LOGGER HELPER
const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString()
    console.info(`[${timestamp}] ℹ️ ${message}`, context || "")
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString()
    console.warn(`[${timestamp}] ⚠️ ${message}`, context || "")
  },
  error: (message: string, context?: Record<string, unknown>) => {
    const timestamp = new Date().toISOString()
    console.error(`[${timestamp}] ❌ ${message}`, context || "")
  },
}

// 4. VALIDATION HELPER
function validateInput(data: CreatePredictionRequest): string | null {
  if (!data.participant_id || typeof data.participant_id !== "string") {
    logger.warn("Invalid participant_id", { participant_id: data.participant_id, type: typeof data.participant_id })
    return "participant_id is required and must be a string"
  }

  if (!data.match_id || typeof data.match_id !== "string") {
    logger.warn("Invalid match_id", { match_id: data.match_id, type: typeof data.match_id })
    return "match_id is required and must be a string"
  }

  if (
    data.predicted_home_score === undefined ||
    typeof data.predicted_home_score !== "number"
  ) {
    logger.warn("Invalid predicted_home_score", { predicted_home_score: data.predicted_home_score, type: typeof data.predicted_home_score })
    return "predicted_home_score is required and must be a number"
  }

  if (
    data.predicted_away_score === undefined ||
    typeof data.predicted_away_score !== "number"
  ) {
    logger.warn("Invalid predicted_away_score", { predicted_away_score: data.predicted_away_score, type: typeof data.predicted_away_score })
    return "predicted_away_score is required and must be a number"
  }

  if (data.predicted_home_score < 0 || data.predicted_home_score > 99) {
    logger.warn("predicted_home_score out of range", { predicted_home_score: data.predicted_home_score })
    return "predicted_home_score must be between 0 and 99"
  }

  if (data.predicted_away_score < 0 || data.predicted_away_score > 99) {
    logger.warn("predicted_away_score out of range", { predicted_away_score: data.predicted_away_score })
    return "predicted_away_score must be between 0 and 99"
  }

  logger.info("Input validation successful", { participant_id: data.participant_id, match_id: data.match_id, home_score: data.predicted_home_score, away_score: data.predicted_away_score })
  return null
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
  })
}

// 5. MAIN HANDLER
Deno.serve(async (req) => {
  logger.info("Request received", { method: req.method, url: req.url })

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    logger.info("CORS preflight request handled")
    return jsonResponse({}, 200)
  }

  if (req.method !== "POST") {
    logger.warn("Invalid HTTP method", { method: req.method })
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
    const body: CreatePredictionRequest = await req.json()
    logger.info("Request body parsed", { participant_id: body.participant_id, match_id: body.match_id })

    // Validate input
    const validationError = validateInput(body)
    if (validationError) {
      logger.warn("Validation failed", { error: validationError, participant_id: body.participant_id, match_id: body.match_id })
      return jsonResponse(
        {
          success: false,
          data: null,
          message: validationError,
        },
        400
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseKey) {
      logger.error("Missing Supabase configuration", { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey })
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
    logger.info("Supabase client initialized")

    // Check if prediction already exists
    logger.info("Checking for existing prediction", { participant_id: body.participant_id, match_id: body.match_id })
    const { data: existingPrediction } = await supabase
      .from("predictions")
      .select("id")
      .eq("participant_id", body.participant_id)
      .eq("match_id", body.match_id)
      .single()

    if (existingPrediction) {
      logger.info("Existing prediction found, updating", {
        prediction_id: existingPrediction.id,
        participant_id: body.participant_id,
        match_id: body.match_id,
        new_home_score: body.predicted_home_score,
        new_away_score: body.predicted_away_score
      })

      // Update existing prediction
      const { data, error } = await supabase
        .from("predictions")
        .update({
          predicted_home_score: body.predicted_home_score,
          predicted_away_score: body.predicted_away_score,
        })
        .eq("participant_id", body.participant_id)
        .eq("match_id", body.match_id)
        .select()

      if (error) {
        logger.error("Failed to update prediction", {
          error: error.message,
          participant_id: body.participant_id,
          match_id: body.match_id
        })
        return jsonResponse(
          {
            success: false,
            data: null,
            message: "Failed to update prediction",
          },
          500
        )
      }

      const prediction = data?.[0]
      logger.info("Prediction updated successfully", {
        prediction_id: prediction.id,
        participant_id: prediction.participant_id,
        match_id: prediction.match_id,
        home_score: prediction.predicted_home_score,
        away_score: prediction.predicted_away_score
      })

      return jsonResponse(
        {
          success: true,
          data: {
            id: prediction.id,
            participant_id: prediction.participant_id,
            match_id: prediction.match_id,
            predicted_home_score: prediction.predicted_home_score,
            predicted_away_score: prediction.predicted_away_score,
            created_at: prediction.created_at,
          },
          message: "Prediction updated successfully",
        },
        200
      )
    } else {
      logger.info("No existing prediction found, creating new", {
        participant_id: body.participant_id,
        match_id: body.match_id,
        home_score: body.predicted_home_score,
        away_score: body.predicted_away_score
      })

      // Create new prediction
      const { data, error } = await supabase
        .from("predictions")
        .insert([
          {
            participant_id: body.participant_id,
            match_id: body.match_id,
            predicted_home_score: body.predicted_home_score,
            predicted_away_score: body.predicted_away_score,
          },
        ])
        .select()

      if (error) {
        if (error.message.includes("foreign key constraint")) {
          logger.warn("Foreign key constraint violation", {
            error: error.message,
            participant_id: body.participant_id,
            match_id: body.match_id
          })
          return jsonResponse(
            {
              success: false,
              data: null,
              message: "Invalid participant_id or match_id",
            },
            400
          )
        }
        logger.error("Failed to create prediction", {
          error: error.message,
          participant_id: body.participant_id,
          match_id: body.match_id
        })
        return jsonResponse(
          {
            success: false,
            data: null,
            message: "Failed to create prediction",
          },
          500
        )
      }

      const prediction = data?.[0]
      logger.info("Prediction created successfully", {
        prediction_id: prediction.id,
        participant_id: prediction.participant_id,
        match_id: prediction.match_id,
        home_score: prediction.predicted_home_score,
        away_score: prediction.predicted_away_score
      })

      return jsonResponse(
        {
          success: true,
          data: {
            id: prediction.id,
            participant_id: prediction.participant_id,
            match_id: prediction.match_id,
            predicted_home_score: prediction.predicted_home_score,
            predicted_away_score: prediction.predicted_away_score,
            created_at: prediction.created_at,
          },
          message: "Prediction created successfully",
        },
        201
      )
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error("Unhandled error in request", { error: errorMessage, stack: error instanceof Error ? error.stack : "no stack" })

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
