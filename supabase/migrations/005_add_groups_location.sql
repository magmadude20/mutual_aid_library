-- Group location: optional latitude/longitude for the group (e.g. meeting place).
alter table groups add column if not exists latitude double precision;
alter table groups add column if not exists longitude double precision;
