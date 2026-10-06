-- Maoni: suggestions and complaints from drivers, read by the meneja, the meneja wa kiwanda and the
-- mkurugenzi. They are anonymous to those readers: the app never shows them who wrote one (nor the
-- car, nor the time of day). author_id is kept only so a driver can see their own and whether they
-- have been read.
CREATE TABLE feedback (
  id         serial PRIMARY KEY,
  author_id  integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       text NOT NULL CHECK (length(body) BETWEEN 3 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feedback_author_idx ON feedback (author_id, created_at);
CREATE INDEX feedback_created_at_idx ON feedback (created_at);

-- Each reader marks a note read for themselves, so one reader doesn't hide it from the others.
CREATE TABLE feedback_reads (
  feedback_id integer NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  reader_id   integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (feedback_id, reader_id)
);
