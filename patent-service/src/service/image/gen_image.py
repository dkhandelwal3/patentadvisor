from unstructured_client import UnstructuredClient
from unstructured_client.models import operations, shared
from openai import OpenAI
import os
import base64
from dotenv import load_dotenv
import logging
from logging import config
import src.constants as const
import src.utils as utils
from src.llmtemplate import template

# Load logging configuration
config.fileConfig(const.CONFIG_DIR + "/logging.conf")
logger = logging.getLogger("patent")


class ImageGenerator:

    def __init__(self):
        load_dotenv()
        # Load the API key from environment variables

    #api_key = os.getenv("UNSTRUCTURED_API_KEY")
    api_key = "k9EBiZg9jUhE7n2WSY6J5HlQpMiU98"
    client = UnstructuredClient(api_key_auth=api_key, server_url="https://api.unstructured.io/general/v0/general")


    @staticmethod
    def extract_images(file_content, output_file):

        if not utils.is_output_file_exists(output_file):
            try:
                # Open the file for reading binary content
                #with open(file_name, "rb") as f:
                files = shared.Files(
                    content=file_content,
                    file_name="file_content"
                )

                # Set up the partition request
                request = operations.PartitionRequest(
                    partition_parameters=shared.PartitionParameters(
                        files=files,
                        strategy=shared.Strategy.HI_RES,
                        split_pdf_page=True,
                        split_pdf_concurrency_level=15,
                        extract_image_block_types=["Image"]
                    )
                )

                # Make the API request to process the PDF and extract images
                result = ImageGenerator.client.general.partition(request=request)

                if result.status_code != 200:
                    logger.error(f"Failed to process PDF. Status code: {result.status_code}")
                    return

                # Process the elements in the response
                i = 0
                for idx, element in enumerate(result.elements):
                    if "image_base64" in element["metadata"]:
                        if i > 0:
                            image_data = base64.b64decode(element["metadata"]["image_base64"])
                            image_file_path = f"{output_file}_{i + 1}.png"

                            with open(image_file_path, "wb") as image_file:
                                image_file.write(image_data)

                            logger.info(f"Image {i + 1} has been saved to {image_file_path}")

                            base64_image = ImageGenerator.encode_image(image_file_path)
                            summary_file_path = f"{output_file}_{i + 1}.txt"
                            ImageGenerator.gen_image_summary(base64_image, summary_file_path)
                        i = i + 1
                    if i > 4:
                        break

                logger.info(f"Extracted images from filename to location {output_file}")

            except Exception as e:
                logger.error(f"Error during image extraction from file_name: {e}", exc_info=True)
        else:
            logger.info(f"Images already exist for file_name at location {output_file}, skipping extraction.")

    @staticmethod
    def gen_image_summary(file_content, output_file):
        openai_client = OpenAI()
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system",
                 "content": "You are a helpful assistant that can understand images, analyze images and extract and insights from images. Help me analyze images!"},
                {"role": "user", "content": [
                    {"type": "text", "text": template.IMAGE_SUMMARY_PROMPT},
                    {"type": "image_url", "image_url": {
                        "url": f"data:image/png;base64,{file_content}"}
                     }
                ]
                 }
            ],
            temperature=0.0,
        )
        summary = response.choices[0].message.content
        #print(summary)
        summary_file_path = f"{output_file}"
        with open(summary_file_path, "w") as summary_file:
            summary_file.write(summary)

        logger.info(f"Summary  has been saved to {summary_file_path}")

    @staticmethod
    def encode_image(image_path):
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode("utf-8")


if __name__ == "__main__":
    image_gen = ImageGenerator()

    pdf_file = const.INPUT_PATENT_DIR_PATH + "/US8874431.pdf"
    _, file_name_without_ext = utils.get_file_name_and_without_extension(pdf_file)
    output_file = const.OUTPUT_DIR + '/images/' + file_name_without_ext

    image_gen.extract_images(pdf_file, output_file)
