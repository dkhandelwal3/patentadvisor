// app/api/pdf/triggerPipeline/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";

/**
 * API Route: Triggers the backend patent document processing pipeline.
 *
 * **Functionality:**
 * - Authenticates the user.
 * - Extracts patentId from the request body.
 * - Invokes the Python Pipeline API.
 * - Returns a success or error response based on the Pipeline API's response.
 *
 * **API Details:**
 * - URL: http://127.0.0.1:8000/patent/trigger/{{patentId}}
 * - Method: POST
 * - Response: 200 OK on success; no JSON response body.
 *
 * @param {NextRequest} req - Incoming request object.
 * @returns {Promise<NextResponse>} - JSON response indicating success or error.
 */
export async function POST(req: NextRequest) {
  const supabase = createClient();

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Authentication Error:", authError);
    return NextResponse.json(
      { error: "You must be logged in to trigger the pipeline." },
      { status: 401 }
    );
  }

  try {
    // Parse the request body
    const { patentId } = await req.json();

    if (!patentId || typeof patentId !== "string") {
      return NextResponse.json(
        { error: "A valid patentId is required." },
        { status: 400 }
      );
    }

    // Construct the Python API URL
    const pythonApiUrl = `http://127.0.0.1:8000/patent/trigger/${encodeURIComponent(
      patentId
    )}`;

    // Invoke the Python Pipeline API
    const pythonResponse = await fetch(pythonApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // No body as per API details
    });

    if (pythonResponse.status === 200) {
      return NextResponse.json(
        { message: "Pipeline triggered successfully." },
        { status: 200 }
      );
    } else {
      const errorText = await pythonResponse.text();
      console.error("Python Pipeline API Error:", errorText);
      return NextResponse.json(
        { error: `Pipeline API Error: ${errorText}` },
        { status: pythonResponse.status }
      );
    }
  } catch (error: any) {
    console.error("Trigger Pipeline API Route Error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "An error occurred while triggering the pipeline.",
      },
      { status: 500 }
    );
  }
}
