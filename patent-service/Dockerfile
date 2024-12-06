# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.11

FROM python:${PYTHON_VERSION}-bullseye

WORKDIR /app

# Install dependencies and build SQLite
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    wget \
    gcc \
    make \
    sqlite3 \
    libsqlite3-dev \
    libssl-dev \
    zlib1g-dev && \
    wget https://www.sqlite.org/2023/sqlite-autoconf-3410200.tar.gz && \
    tar -xvzf sqlite-autoconf-3410200.tar.gz && \
    cd sqlite-autoconf-3410200 && \
    ./configure && make && make install && \
    cd .. && rm -rf sqlite-autoconf-3410200* && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy the requirements and install Python dependencies
COPY requirements-docker.txt requirements-docker.txt

RUN python -m pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements-docker.txt

# Copy application files
COPY . .
COPY src/controller/__initdockerfix src/controller/__init__.py

# Define arguments for build-time (passed by GitHub Actions)
ARG HOME_PATH
ARG OPENAI_API_KEY
ARG SUPABASE_URL
ARG SUPABASE_KEY
ARG CLOUDFLARE_R2_ACCESS_KEY
ARG CLOUDFLARE_R2_SECRET_KEY
ARG CLOUDFLARE_URL
ARG CLOUDFLARE_BUCKET_NAME
ARG CLOUDFLARE_BUCKET_URL
ARG CLOUDFLARE_UPLOAD_DIRECTORY_PREFIX
ARG CLOUDFLARE_SUMMARY_DIRECTORY_PREFIX
ARG CLOUDFLARE_AUDIO_DIRECTORY_PREFIX
ARG CLOUDFLARE_PODCAST_DIRECTORY_PREFIX
ARG CLOUDFLARE_IMAGE_DIRECTORY_PREFIX
ARG CLOUDFLARE_PATENT_DIRECTORY_PREFIX
ARG CLEARML_API_ACCESS_KEY
ARG CLEARML_API_SECRET_KEY


# Pass arguments to environment variables
ENV HOME_PATH=$HOME_PATH \
    OPENAI_API_KEY=$OPENAI_API_KEY \
    SUPABASE_URL=$SUPABASE_URL \
    SUPABASE_KEY=$SUPABASE_KEY \
    CLOUDFLARE_R2_ACCESS_KEY=$CLOUDFLARE_R2_ACCESS_KEY \
    CLOUDFLARE_R2_SECRET_KEY=$CLOUDFLARE_R2_SECRET_KEY \
    CLOUDFLARE_URL=$CLOUDFLARE_URL \
    CLOUDFLARE_BUCKET_NAME=$CLOUDFLARE_BUCKET_NAME \
    CLOUDFLARE_BUCKET_URL=$CLOUDFLARE_BUCKET_URL \
    CLOUDFLARE_UPLOAD_DIRECTORY_PREFIX=$CLOUDFLARE_UPLOAD_DIRECTORY_PREFIX \
    CLOUDFLARE_SUMMARY_DIRECTORY_PREFIX=$CLOUDFLARE_SUMMARY_DIRECTORY_PREFIX \
    CLOUDFLARE_AUDIO_DIRECTORY_PREFIX=$CLOUDFLARE_AUDIO_DIRECTORY_PREFIX \
    CLOUDFLARE_PODCAST_DIRECTORY_PREFIX=$CLOUDFLARE_PODCAST_DIRECTORY_PREFIX \
    CLOUDFLARE_IMAGE_DIRECTORY_PREFIX=$CLOUDFLARE_IMAGE_DIRECTORY_PREFIX \
    CLOUDFLARE_PATENT_DIRECTORY_PREFIX=$CLOUDFLARE_PATENT_DIRECTORY_PREFIX \
    CLEARML_API_ACCESS_KEY=$CLEARML_API_ACCESS_KEY \
    CLEARML_API_SECRET_KEY=$CLEARML_API_SECRET_KEY \
    AI_ADVISOR_END_POINT_URL=http://13.49.111.193 \
    UPLOAD_USER_ID=7ec222c4-3bb2-418b-baf7-bf1b559a2a04

# Expose the application port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "src.controller.app:app", "--host", "0.0.0.0", "--port", "8000"]
