create table
  patentdocuments (
    id text primary key,
    content text, -- corresponds to Document.pageContent
    metadata jsonb, -- corresponds to Document.metadata
    embedding vector (1536) -- 1536 works for OpenAI embeddings, change if needed
  );

  create table
  patentdocumentdetail (
    id text primary key,
    patentId text,
    content text, -- corresponds to Document.pageContent
    metadata jsonb, -- corresponds to Document.metadata
    embedding vector (1536) -- 1536 works for OpenAI embeddings, change if needed
  );

--   create or replace function match_documents (
--   query_embedding vector(384),
--   match_threshold float,
--   match_count int
-- )
-- returns table (
--   id bigint,
--   title text,
--   body text,
--   similarity float
-- )
-- language sql stable
-- as $$
--   select
--     documents.id,
--     documents.title,
--     documents.body,
--     1 - (documents.embedding <=> query_embedding) as similarity
--   from documents
--   where 1 - (documents.embedding <=> query_embedding) > match_threshold
--   order by (documents.embedding <=> query_embedding) asc
--   limit match_count;
-- $$;

create function match_documents (
  query_embedding vector (1536),
  filter jsonb default '{}'
) 
returns table (
  id text,
  content text,
  metadata jsonb,
  similarity float
) language sql stable 
as $$
  select
    patentdocuments.id,
    patentdocuments.content,
    patentdocuments.metadata,
    1 - (patentdocuments.embedding <=> query_embedding) as similarity
  from patentdocuments
  where metadata @> filter
  order by patentdocuments.embedding <=> query_embedding asc
$$;


create or replace function match_documents_native (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id text,
  page_content text,
  metadata text,
  similarity float
)
language sql stable
as $$
  select
    patentdocuments.id,
    patentdocuments.content,
    patentdocuments.metadata,
    1 - (patentdocuments.embedding <=> query_embedding) as similarity
  from patentdocuments
  where 1 - (patentdocuments.embedding <=> query_embedding) > match_threshold
  order by (patentdocuments.embedding <=> query_embedding) asc
  limit match_count;
$$;