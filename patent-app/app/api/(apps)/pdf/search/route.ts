// app/api/pdf/search/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";

/**
 * API Route: Handles patent search functionality.
 *
 * **Process:**
 * 1. Authenticates the user.
 * 2. Validates the search query.
 * 3. Calls the Python `searchPatent` API with the query.
 * 4. Transforms the Python API response.
 * 5. Returns the transformed search results.
 *
 * @param {Request} request - The incoming request object.
 * @returns {Promise<NextResponse>} JSON response containing the search results or error messages.
 */
export async function POST(request: Request) {
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
      { error: "You must be logged in to search patents." },
      { status: 401 }
    );
  }

  try {
    // Parse the request body
    const { query } = await request.json();

    // Validate the search query
    if (!query || typeof query !== "string" || query.trim() === "") {
      return NextResponse.json(
        { error: "Invalid or missing search query." },
        { status: 400 }
      );
    }

    console.log(`User ${userEmail} is searching for: "${query}"`);

    // Call the Python API using IPv4 address
    const pythonApiUrl = `${process.env.NEXT_PUBLIC_API_URL}/searchPatent?query=${encodeURIComponent(
      query
    )}`; 

    const pythonResponse = await fetch(pythonApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Add any additional headers if required by your Python API
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

    const pythonData = await pythonResponse.json();

    // Log the received data for debugging
    console.log("Python API Response:", pythonData);
    console.log("Type of pythonData:", typeof pythonData);
    console.log("Is pythonData an array?", Array.isArray(pythonData));

    // Check if pythonData has 'patentList' and it's an array
    if (
      !pythonData ||
      !pythonData.patentList ||
      !Array.isArray(pythonData.patentList)
    ) {
      console.error(
        "Expected an object with a 'patentList' array from Python API, but received:",
        pythonData
      );
      return NextResponse.json(
        { error: "Unexpected response format from Python API." },
        { status: 500 }
      );
    }

    // Define TypeScript interfaces based on your Python API response
    interface PatentResponse {
      title: string;
      claims: string;
      domain: string;
      sector: string;
      abstract: string;
      industry: string;
      assignees: string[]; // Always an array
      grantdate: string;
      inventors: string[];
      filingdate: string;
      legalstatus: string;
      assigneetype: string;
      businessline: string;
      patentnumber: string;
      applicationarea: string;
      countryoffiling: string;
      patentauthority: string;
      publicationdate: string;
      applicationnumber: string;
      technologykeywords: string;
      marketrelevanceindicators: string;
      provisionalapplicationdate: string;
      filename: string;
      documentId: string;
      podcast_url: string;
      audio_url: string;
    }

    interface TransformedDocumentType {
      id: string;
      patentId: string; // New field: file_name without extension
      file_name: string;
      created_at: string;
      summary: string;
      classification: string;
      title: string;
      domain: string;
      sector: string;
      industry: string;
      grantdate: string;
      patentnumber: string;
      applicationarea: string;
      assignees: string;
      documentId: string;
      podcast_url: string;
      audio_url: string;
      abstract: string;
    }

    // Helper function to remove file extension
    const removeFileExtension = (filename: string): string => {
      return filename.substring(0, filename.lastIndexOf(".")) || filename;
    };

    // Extract the patentList
    const patentList: PatentResponse[] = pythonData.patentList;

    // Transform the Python API data to match frontend expectations
    const transformedData: TransformedDocumentType[] = patentList.map(
      (patent: PatentResponse) => ({
        id: patent.patentnumber || "N/A", // Use a unique identifier from the patent data
        patentId: removeFileExtension(patent.filename || "N/A"), // Extract patentId
        file_name: patent.filename || "N/A",
        created_at: patent.filingdate || "N/A", // Adjust based on your requirements
        summary: patent.abstract || "N/A",
        classification: patent.domain || "N/A",
        title: patent.title || "N/A",
        domain: patent.domain || "N/A",
        sector: patent.sector || "N/A",
        industry: patent.industry || "N/A",
        grantdate: patent.grantdate || "N/A",
        patentnumber: patent.patentnumber || "N/A",
        applicationarea: patent.applicationarea || "N/A",
        documentId: patent.documentId || "N/A",
        podcast_url: patent.podcast_url,
        audio_url: patent.audio_url,
        abstract: patent.abstract,
        assignees:
          patent.assignees && patent.assignees.length > 0
            ? patent.assignees.join(", ")
            : "N/A",
      })
    );

    console.log(`Search results for "${query}" transformed successfully.`);

    // Return the transformed search results
    return NextResponse.json({ results: transformedData }, { status: 200 });
  } catch (error) {
    console.error("Search Patent API Error:", error);
    return NextResponse.json(
      {
        error:
          (error as Error).message ||
          "An error occurred during the patent search process.",
      },
      { status: 500 }
    );
  }
}

