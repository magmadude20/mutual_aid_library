# send-request-email

Sends an email to an item owner when a logged-in user clicks "Request thing" / "Contact owner" on the thing detail page.

## Required secrets

Set these in the Supabase Dashboard (Project → Edge Functions → Secrets) or via CLI:

- **RESEND_API_KEY** – API key from [Resend](https://resend.com) (e.g. `re_...`).
- **EMAIL_FROM** – Sender address (e.g. `noreply@yourdomain.com` or Resend sandbox `onboarding@resend.dev`).

## Optional

- **PUBLIC_APP_URL** – Base URL for links in the email (e.g. `https://yourapp.com`). Defaults to `http://localhost:3000` if unset.

## Request

`POST` with `Authorization: Bearer <user JWT>` and JSON body:

```json
{
  "thing_id": "uuid",
  "subject": "Request to borrow: Thing name",
  "message": "Hi, I'd like to borrow..."
}
```

## Response

- **200** – `{ "success": true }`
- **4xx/5xx** – `{ "error": "message" }`
