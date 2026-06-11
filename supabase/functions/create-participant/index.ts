import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

// 1. TYPE DEFINITIONS
interface CreateParticipantRequest {
  email: string
}

interface Participant {
  id: string
  name: string
  email: string
  created_at: string
  updated_at: string
}

// 2. HELPER FUNCTIONS
function extractNameFromEmail(email: string): string {
  return email.split("@")[0].trim()
}

function normalizeData(data: CreateParticipantRequest) {
  const email = data.email.trim().toLowerCase()
  const name = extractNameFromEmail(email)

  return {
    name,
    email,
  }
}

function validateInput(data: CreateParticipantRequest): string | null {
  if (!data.email || typeof data.email !== "string") {
    return "Email is required and must be a string"
  }

  if (!data.email.includes("@")) {
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  if (req.method !== "POST") {
    return jsonResponse(
      { success: false, message: "Method not allowed" },
      405
    )
  }

  try {
    const body: CreateParticipantRequest = await req.json()

    // Validate input
    const validationError = validateInput(body)
    if (validationError) {
      return jsonResponse(
        { success: false, message: validationError },
        400
      )
    }

    // Normalize data
    const normalized = normalizeData(body)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase configuration")
      return jsonResponse(
        { success: false, message: "Internal Server Error" },
        500
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if participant already exists
    const { data: existingParticipant, error: queryError } = await supabase
      .from("participants")
      .select("*")
      .eq("email", normalized.email)
      .single()

    if (queryError && queryError.code !== "PGRST116") {
      console.error("Database error:", queryError.message)
      return jsonResponse(
        { success: false, message: "Failed to check participant" },
        500
      )
    }

    // If participant exists, return their data
    if (existingParticipant) {
      return jsonResponse(
        {
          success: true,
          message: "Participant already exists",
          data: existingParticipant,
        },
        200
      )
    }

    // Create new participant
    const { data: newParticipant, error: insertError } = await supabase
      .from("participants")
      .insert([
        {
          name: normalized.name,
          email: normalized.email,
        },
      ])
      .select()
      .single()

    if (insertError) {
      console.error("Database error:", insertError.message)
      return jsonResponse(
        { success: false, message: "Failed to create participant" },
        500
      )
    }

    return jsonResponse(
      {
        success: true,
        message: "Participant created successfully",
        data: newParticipant,
      },
      201
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error("Unhandled error:", errorMessage)

    return jsonResponse(
      { success: false, message: "Internal Server Error" },
      500
    )
  }
})
