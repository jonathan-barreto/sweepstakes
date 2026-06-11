import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// 1. TYPE DEFINITIONS
interface GetParticipantResponse {
  success: boolean
  data: {
    id: string
    name: string
    email: string
    created_at: string
  } | null
  message: string
}

// 2. HELPER FUNCTIONS
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function validateInput(email: string | null): string | null {
  if (!email || typeof email !== "string") {
    return "Email is required"
  }

  if (email.trim().length === 0) {
    return "Email cannot be empty"
  }

  if (!email.includes("@")) {
    return "Invalid email format"
  }

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
    const email = url.searchParams.get("email")

    // Validate input
    const validationError = validateInput(email)
    if (validationError) {
      return jsonResponse(
        {
          success: false,
          data: null,
          message: validationError,
        },
        400
      )
    }

    // Normalize email
    const normalizedEmail = normalizeEmail(email!)

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

    // Fetch participant by email
    const { data: participant, error } = await supabase
      .from("participants")
      .select("id, name, email, created_at")
      .eq("email", normalizedEmail)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // No rows found
        return jsonResponse(
          {
            success: false,
            data: null,
            message: "Participant not found",
          },
          404
        )
      }
      console.error("Database error:", error.message)
      return jsonResponse(
        {
          success: false,
          data: null,
          message: "Failed to fetch participant",
        },
        500
      )
    }

    return jsonResponse(
      {
        success: true,
        data: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          created_at: participant.created_at,
        },
        message: "Participant found",
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
