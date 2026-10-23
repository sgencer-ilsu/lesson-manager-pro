import { google } from "googleapis";

export const GOOGLE_SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

export function getOAuth2Client(origin: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/google/callback`
  );
}
