-- Run this once to create the PostgreSQL database for the cookbook application.
-- Tables are created automatically by Hibernate (ddl-auto: update) on first startup.
--
-- Usage:
--   psql -U postgres -f database/init.sql
--
-- Or paste into psql / pgAdmin manually.

CREATE DATABASE cookbook;
