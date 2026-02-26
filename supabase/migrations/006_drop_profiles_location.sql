-- Remove user location from profiles. Only group locations are used now.
alter table profiles drop column if exists latitude;
alter table profiles drop column if exists longitude;
