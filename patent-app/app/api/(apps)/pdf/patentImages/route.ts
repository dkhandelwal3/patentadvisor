// app/api/pdf/patentImages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/utils/supabase/server";

/**
 * API Route: Fetches patent images and their descriptions.
 *
 * **Functionality:**
 * - Authenticates the user.
 * - Extracts the patent ID from the query parameters.
 * - Fetches image and description files from the Python API.
 * - Pairs `.png` files with their corresponding `.txt` descriptions.
 * - Returns a structured array of images with descriptions.
 *
 * @param {NextRequest} req - Incoming request object.
 * @returns {Promise<NextResponse>} - JSON response with images and descriptions or error messages.
 */
export async function GET(req: NextRequest) {
  const supabase = createClient();

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("Authentication Error:", authError);
    return NextResponse.json(
      { error: "You must be logged in to fetch patent images." },
      { status: 401 }
    );
  }

  try {
    // Extract patentId from query parameters
    const { searchParams } = new URL(req.url);
    const patentId = searchParams.get("patentId");

    if (!patentId) {
      return NextResponse.json(
        { error: "Missing patentId in query parameters." },
        { status: 400 }
      );
    }

    // Construct the Python API URL
    const pythonApiUrl = `${process.env.NEXT_PUBLIC_API_URL}/patent/images/${encodeURIComponent(
      patentId
    )}`;

    // Call the Python Patent Document Image API
    const pythonResponse = await fetch(pythonApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error("Python Patent Image API Error:", errorText);
      return NextResponse.json(
        { error: `Python Patent Image API Error: ${errorText}` },
        { status: pythonResponse.status }
      );
    }

    const data = await pythonResponse.json();

    // Check if data is an array
    if (!Array.isArray(data)) {
      console.warn(`No images found for patentId: ${patentId}`);
      // Return an empty array if data is null or not an array
      return NextResponse.json({ images: [] }, { status: 200 });
    }

    // Process the response to pair .png and .txt files
    const imageMap: { [key: string]: { src: string; alt: string; description: string } } = {};

    // Collect promises for fetching descriptions
    const descriptionPromises: Promise<void>[] = [];

    data.forEach((file: { file_name: string; file_url: string }) => {
      const match = file.file_name.match(/US\d+_(\d+)\.(png|txt)$/);
      if (match) {
        const index = match[1];
        const extension = match[2];

        if (!imageMap[index]) {
          imageMap[index] = { src: "", alt: "", description: "" };
        }

        if (extension === "png") {
          imageMap[index].src = file.file_url;
          imageMap[index].alt = `Image ${index}`;
        } else if (extension === "txt") {
          // Fetch the description from the .txt file
          const descriptionPromise = fetch(file.file_url)
            .then((descResponse) => {
              if (descResponse.ok) {
                return descResponse.text();
              }
              throw new Error(`Failed to fetch description from ${file.file_url}`);
            })
            .then((descText) => {
              imageMap[index].description = descText.trim();
            })
            .catch((err) => {
              console.error(err);
              imageMap[index].description = `Description for Image ${index}`;
            });

          descriptionPromises.push(descriptionPromise);
        }
      }
    });

    // Wait for all description fetches to complete
    await Promise.all(descriptionPromises);

    // Convert the imageMap to an array
    const imagesWithDescriptions: { src: string; alt: string; description: string }[] = Object.values(
      imageMap
    ).filter((image) => image.src); // Ensure that src exists

    // Ensure imagesWithDescriptions is always an array
    const safeImages = Array.isArray(imagesWithDescriptions) ? imagesWithDescriptions : [];

    return NextResponse.json({ images: safeImages }, { status: 200 });
  } catch (error: any) {
    console.error("Patent Images API Route Error:", error);
    return NextResponse.json(
      {
        error:
          error.message ||
          "An error occurred while processing your request.",
      },
      { status: 500 }
    );
  }
}

