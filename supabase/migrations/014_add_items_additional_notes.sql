-- Add optional 'additional notes' to items (stipulations, quirks, etc.)
alter table items add column if not exists additional_notes text;
