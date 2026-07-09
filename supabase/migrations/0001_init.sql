-- 0001_init.sql
-- Enables the extensions the platform relies on and the schema that holds the
-- OpenStreetMap-derived road network (populated in Task 2).
create extension if not exists postgis;
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create schema if not exists geo;
