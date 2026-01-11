import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { $logger } from "../../../modules/logget";
import type { ExternalAuthUser } from "./external-auth.types";

export function initGoogleStrategy() {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_CALLBACK_URL) {
        $logger.warn("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL must be set");
        console.warn("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALLBACK_URL must be set");
        return;
    }
    const options = {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
    }

    passport.use(new GoogleStrategy(options, async (_accessToken, _refreshToken, profile, done) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email || !profile._json.email_verified) return done(null, false);

            const user: ExternalAuthUser = {
                email,
                provider: "google",
            };

            done(null, user);
        } catch (e) {
            done(e);
        }
    }));
}
