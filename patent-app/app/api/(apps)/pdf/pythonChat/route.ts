// app/api/pdf/pythonChat/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";

/**
 * API Route: Handles communication with the Python Chat API.
 *
 * **Functionality:**
 * - Authenticates the user.
 * - Extracts user ID and document ID.
 * - Validates the query.
 * - Calls the Python Chat API with the necessary parameters.
 * - Returns the Python API response to the frontend.
 *
 * @param {NextRequest} req - Incoming request object.
 * @returns {Promise<NextResponse>} - JSON response with Python API data or error messages.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const userId = user?.id;
  const userEmail = user?.email;

  if (authError || !userId) {
    console.error("Authentication Error:", authError);
    return NextResponse.json(
      { error: "You must be logged in to use the Python Chat API." },
      { status: 401 }
    );
  }

  try {
    // Parse the request body
    const { documentId, query } = await req.json();

    // Validate the request parameters
    if (!documentId || typeof documentId !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing document ID." },
        { status: 400 }
      );
    }

    if (!query || typeof query !== "string" || query.trim() === "") {
      return NextResponse.json(
        { error: "Invalid or missing query." },
        { status: 400 }
      );
    }

    console.log(`User ${userEmail} is querying document ${documentId} with: "${query}"`);

    // Construct the Python API URL
    const pythonApiUrl = `${process.env.NEXT_PUBLIC_API_URL}/queryDocument/${encodeURIComponent(userId)}/${encodeURIComponent(documentId)}?query=${encodeURIComponent(query)}`;

    // Call the Python API
    const pythonResponse = await fetch(pythonApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error("Python API Error:", errorText);
      return NextResponse.json(
        { error: `Python API Error: ${errorText}` },
        { status: pythonResponse.status }
      );
    }

    const data = await pythonResponse.json();

    // Optionally, you could add any transformations or logging here

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("Python Chat API Route Error:", error);
    return NextResponse.json(
      {
        error:
          (error as Error).message ||
          "An error occurred while processing your request.",
      },
      { status: 500 }
    );
  }
}
