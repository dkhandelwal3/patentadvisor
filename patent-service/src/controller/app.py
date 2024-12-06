import json
import os

import boto3
import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, Response

from langchain.agents import initialize_agent, AgentType
from langchain.llms import OpenAI
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI

from src.controller.agent import get_ai_patent_advisor_agent, evaluate_response, get_fallback_agent
from src.service.document import searchDocumentService
from src.service.pipeline import PatentAdvisorPipeLine
from src.utils import logger

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


load_dotenv()
access_key = os.getenv('CLOUDFLARE_R2_ACCESS_KEY')
secret_key = os.getenv('CLOUDFLARE_R2_SECRET_KEY')
bucket_name = os.getenv('CLOUDFLARE_BUCKET_NAME')
bucket_url = os.getenv('CLOUDFLARE_BUCKET_URL')
endpoint_url = os.getenv('CLOUDFLARE_URL')
upload_dir_prefix = os.getenv('CLOUDFLARE_UPLOAD_DIRECTORY_PREFIX')
summary_dir_prefix = os.getenv('CLOUDFLARE_SUMMARY_DIRECTORY_PREFIX')
audio_dir_prefix = os.getenv('CLOUDFLARE_AUDIO_DIRECTORY_PREFIX')
podcast_dir_prefix = os.getenv('CLOUDFLARE_PODCAST_DIRECTORY_PREFIX')
image_dir_prefix = os.getenv('CLOUDFLARE_IMAGE_DIRECTORY_PREFIX')
patent_dir_prefix = os.getenv('CLOUDFLARE_PATENT_DIRECTORY_PREFIX')

if not all([access_key, secret_key, bucket_name, endpoint_url]):
    logger.error("One or more Cloudflare R2 credentials are missing in the .env file.")
    raise ValueError("One or more Cloudflare R2 credentials are missing in the .env file.")

    # Initialize the S3 client with Cloudflare R2 credentials
logger.info("Initializing S3 client for Cloudflare R2.")
s3_client = boto3.client(
    's3',
    region_name='auto',  # Cloudflare R2 uses 'auto' for region
    endpoint_url=endpoint_url,
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key
)


@app.get("/patent/summary/{patentID}")
def get_patent_summary(patentID: str):
    file_key = summary_dir_prefix + patentID + ".txt"
    file = s3_client.get_object(Bucket=bucket_name, Key=file_key)
    file_content = file['Body'].read()
    logger.info(f"Got summary text for {patentID} = {file_content}")
    return Response(content=file_content, media_type="text/plain")


@app.get("/patent/audio/{patentID}")
def get_patent_audio(patentID: str):
    file_url = bucket_url + "/" + audio_dir_prefix + patentID + ".mp3"
    logger.info(f"Got audio for {patentID} = {file_url}")
    # return Response(content=file_url, media_type="audio/mpeg")
    return Response(content=file_url, media_type="text/plain")


@app.get("/patent/podcast/{patentID}")
def get_patent_podcast(patentID: str):
    file_url = bucket_url + "/" + podcast_dir_prefix + patentID + ".wav"
    logger.info(f"Got podcast for {patentID} = {file_url}")
    # return Response(content=file_url, media_type="audio/mpeg")
    return Response(content=file_url, media_type="text/plain")


@app.get("/patent/images/{patentID}")
def get_patent_images(patentID: str):
    # List objects with the specified prefix
    folder = "image/" + patentID
    response = s3_client.list_objects_v2(Bucket=bucket_name, Prefix=folder)

    # Initialize the list to store file information
    file_data = []

    # Check if the response contains 'Contents'
    if 'Contents' in response:

        for obj in response['Contents']:
            full_file_name = obj['Key']
            # Extract just the file name (remove the prefix/folder path)
            file_name = os.path.basename(full_file_name)
            # Generate the URL for the object
            file_url = s3_client.generate_presigned_url('get_object',
                                                        Params={'Bucket': bucket_name, 'Key': full_file_name},
                                                        ExpiresIn=3600)  # URL expires in 1 hour (3600 seconds)
            # Append the file info (file name and URL) as a dictionary to the file_data list
            file_data.append({
                'file_name': file_name,
                'file_url': file_url
            })
        # Return the list of files as a JSON array
        response_json = json.dumps(file_data, indent=4)
        return json.loads(response_json)
    else:
        logger.error(f"No files found in '{bucket_name}' with prefix 'image'.")


@app.get('/searchPatent')
def search(query: str):
    try:

        documentList = searchDocumentService.searchDocument(query)

        # if not documentList or len(documentList) == 0:
        #     return Response(content="No data found", status_code=404)

        if not documentList:
            return {"patentList": []}

        for document in documentList:
            filename = document.get('filename', '')
            patentID = filename.split('.')[0]
            podcast_url = bucket_url + "/" + podcast_dir_prefix + patentID + ".wav"
            audio_url = bucket_url + "/" + audio_dir_prefix + patentID + ".mp3"
            file_key = summary_dir_prefix + patentID + ".txt"
            file = s3_client.get_object(Bucket=bucket_name, Key=file_key)
            file_content = file['Body'].read()
            document['podcast_url'] = podcast_url
            document['audio_url'] = audio_url
            document['summary'] = file_content.decode('utf-8')

        patent_list_json = json.dumps(documentList, indent=4)
        response = {"patentList": json.loads(patent_list_json)}

        return response
    except Exception as e:
        logger.error(f"Error in searchDocument: {str(e)}")
        return Response(content="Internal Error", status_code=500)


@app.get("/queryDocument/{userid}/{documentId}")
def searchDocument(query: str, userid: str, documentId: str):
    try:
        logger.info(f"Calling Search Document API {userid} {documentId}")
        llm_response, history_dict, bias_analyzer = searchDocumentService.queryDocument(query, userid, documentId)
        response = {"answer": llm_response, "history": history_dict, "bias": bias_analyzer, "documentId": documentId}
        response_json = json.dumps(response, indent=4)
        response = json.loads(response_json)
        # logger.info(f"Search results JSON Response :{response}")
        return response

    except Exception as e:
        logger.error(f"Error in searchDocument: {str(e)}")
        return Response(content="Internal Error", status_code=500)


@app.get("/gethistory/{userid}/{documentId}")
def getConversationHistory(userid: str, documentId: str):
    try:
        logger.info(f"Calling getConversationHistory API {userid} {documentId}")
        history_dict = searchDocumentService.getConversationHistory(userid, documentId)

        response = {"history": history_dict, "documentId": documentId}
        response_json = json.dumps(response, indent=4)
        response = json.loads(response_json)
        # logger.info(f"Search results JSON Response :{response}")
        return response

    except Exception as e:
        logger.error(f"Error in getConversationHistory: {str(e)}")
        return Response(content="Internal Error", status_code=500)


@app.post("/patent/trigger/{userId}/{patentID}")
def trigger_pipeline_for_pdf(userId: str, patentID: str):
    pipeline = PatentAdvisorPipeLine()
    key = upload_dir_prefix + patentID + ".pdf"
    logger.info(f"Triggering pipeline for pdf {key}")
    pipeline.trigger_pipeline_for_pdf(pdf_key=key, pipeline_type="all", userId=userId)


@app.get("/patent/query/{userId}/{patentID}")
def invoke_questions_answer_using_agent(userId: str, patentID: str, query: str):
    new_query = query + "? patentID is " + patentID + " and userId is " + userId
    logger.info(f"Invoked by for {patentID} a query - {new_query}")
    # Create the agent with the tool
    try:
        agent = get_ai_patent_advisor_agent()
        response = agent.run(new_query)
        if evaluate_response(response):
            logger.info(f"response returned from ai patent advisor is sufficient - {response}")
            media_asset = ["png", "mp3", "wav"]
            if any(word in response for word in media_asset):
                return response
            else:
                return "Response from AI Patent Advisor : " + response
        else:
            logger.info("response returned from ai patent advisor is not sufficient, hence fall backing to internet "
                        "using fallback agent")
            agent = get_fallback_agent()
            response = agent.run(query)
            return "Response from Fallback Agent (Google) : " + response
    except Exception as e:
        print(e)
        raise e


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5001)

# task = Task.init(project_name = "patentsearch", task_name = "documentsearch") 

