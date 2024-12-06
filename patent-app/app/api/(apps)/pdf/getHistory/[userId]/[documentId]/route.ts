// app/api/pdf/getHistory/[userId]/[documentId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";

/**
 * API Route: Fetches chat history for a specific user and document.
 *
 * **Process:**
 * 1. Authenticate the user.
 * 2. Extract `userId` and `documentId` from the URL parameters.
 * 3. Call the Python API to fetch the chat history.
 * 4. Return the chat history to the frontend.
 *
 * @param {NextRequest} req - Incoming request object.
 * @param {Object} params - URL parameters containing `userId` and `documentId`.
 * @returns {Promise<NextResponse>} JSON response with chat history or error messages.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string; documentId: string } }
) {
  const supabase = createClient();

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Authentication Error:", authError);
    return NextResponse.json(
      { error: "You must be logged in to fetch chat history." },
      { status: 401 }
    );
  }

  // Verify that the userId in the URL matches the authenticated user
  if (params.userId !== user.id) {
    console.error(
      `Unauthorized access attempt by user ${user.id} to userId ${params.userId}`
    );
    return NextResponse.json(
      { error: "Unauthorized access to chat history." },
      { status: 403 }
    );
  }

  try {
    const { userId, documentId } = params;

    if (!userId || !documentId) {
      return NextResponse.json(
        { error: "Missing userId or documentId in the request." },
        { status: 400 }
      );
    }

    // Construct the Python API URL
    const pythonApiUrl = `${process.env.NEXT_PUBLIC_API_URL}/gethistory/${encodeURIComponent(
      userId
    )}/${encodeURIComponent(documentId)}`;

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

    // Validate the response structure
    if (!data.history || !Array.isArray(data.history)) {
      console.error("Invalid Python API response structure:", data);
      return NextResponse.json(
        { error: "Invalid response from Python API." },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    console.error("Fetch Chat History API Route Error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "An error occurred while fetching chat history.",
      },
      { status: 500 }
    );
  }
}

