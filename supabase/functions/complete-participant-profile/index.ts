import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

interface CompleteParticipantProfileRequest {
  name: string
  nickname: string
  favorite_team: string
}

function normalizeText(value: string): string {
  return value.trim()
}

function normalizeNickname(value: string): string {
  return value.trim().toLowerCase()
}

function validateInput(data: CompleteParticipantProfileRequest): string | null {
  if (!data.name || typeof data.name !== "string") {
    return "name is required and must be a string"
  }

  if (!data.nickname || typeof data.nickname !== "string") {
    return "nickname is required and must be a string"
  }

  if (!data.favorite_team || typeof data.favorite_team !== "string") {
    return "favorite_team is required and must be a string"
  }

  if (data.name.trim().length < 2) {
    return "name must contain at least 2 characters"
  }

  if (data.nickname.trim().length < 2) {
    return "nickname must contain at least 2 characters"
  }

  if (data.favorite_team.trim().length < 2) {
    return "favorite_team must contain at least 2 characters"
  }

  return null
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  return authHeader.substring(7).trim()
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({}, 200)
  }

  if (req.method !== "POST") {
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
    const body: CompleteParticipantProfileRequest = await req.json()

    const validationError = validateInput(body)
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

    const token = getBearerToken(req)
    if (!token) {
      return jsonResponse(
        {
          success: false,
          data: null,
          message: "Missing or invalid Authorization header",
        },
        401
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token)

    if (userError || !user?.email) {
      return jsonResponse(
        {
          success: false,
          data: null,
          message: "Unauthorized",
        },
        401
      )
    }

    const normalizedEmail = user.email.trim().toLowerCase()
    const normalizedNickname = normalizeNickname(body.nickname)
    const normalizedData = {
      name: normalizeText(body.name),
      nickname: normalizedNickname,
      favorite_team: normalizeText(body.favorite_team),
      profile_completed: true,
    }

    // Pre-check for clearer error message before update.
    const { data: nicknameOwner, error: nicknameQueryError } = await supabase
      .from("participants")
      .select("email")
      .eq("nickname", normalizedNickname)
      .maybeSingle()

    if (nicknameQueryError) {
      console.error("Database error:", nicknameQueryError.message)
      return jsonResponse(
        {
          success: false,
          data: null,
          message: "Failed to validate nickname",
        },
        500
      )
    }

    if (nicknameOwner && nicknameOwner.email !== normalizedEmail) {
      return jsonResponse(
        {
          success: false,
          data: null,
          message: "Nickname already in use",
        },
        409
      )
    }

    const { data: updatedParticipant, error: updateError } = await supabase
      .from("participants")
      .update(normalizedData)
      .eq("email", normalizedEmail)
      .select("id, name, nickname, favorite_team, email, profile_completed, created_at, updated_at")
      .single()

    if (updateError) {
      if (updateError.code === "PGRST116") {
        return jsonResponse(
          {
            success: false,
            data: null,
            message: "Participant not found. Complete initial registration first.",
          },
          404
        )
      }

      if (updateError.code === "23505") {
        return jsonResponse(
          {
            success: false,
            data: null,
            message: "Nickname already in use",
          },
          409
        )
      }

      console.error("Database error:", updateError.message)
      return jsonResponse(
        {
          success: false,
          data: null,
          message: "Failed to complete profile",
        },
        500
      )
    }

    return jsonResponse(
      {
        success: true,
        data: updatedParticipant,
        message: "Profile completed successfully",
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
