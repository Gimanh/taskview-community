import passport from "passport";
import { Strategy as AppleStrategy } from "passport-apple";
import jwt from "jsonwebtoken";
import { $logger } from "../../../modules/logget";
import type { ExternalAuthUser } from "./external-auth.types";

interface AppleDecodedToken {
    email?: string;
    email_verified?: boolean | string;
    sub?: string;
}

export function initAppleStrategy() {
    if (!process.env.APPLE_CLIENT_ID ||
        !process.env.APPLE_TEAM_ID ||
        !process.env.APPLE_KEY_ID ||
        !process.env.APPLE_CALLBACK_URL ||
        !process.env.APPLE_KEY_LOCATION) {
        $logger.warn("APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CALLBACK_URL, and APPLE_KEY_LOCATION must be set");
        console.warn("APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CALLBACK_URL, and APPLE_KEY_LOCATION must be set");
        return;
    }

    const options = {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        callbackURL: process.env.APPLE_CALLBACK_URL,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyLocation: process.env.APPLE_KEY_LOCATION,
        scope: ["name", "email"],
        passReqToCallback: true as const,
    };

    passport.use(new AppleStrategy(options, async (_req, _accessToken, _refreshToken, idToken, _profile, done) => {
        try {
            const decoded = jwt.decode(idToken) as AppleDecodedToken | null;
            const email = decoded?.email;
            if (!email) return done(null, undefined);

            const user: ExternalAuthUser = {
                email,
                provider: "apple",
            };

            done(null, user);
        } catch (e) {
            done(e instanceof Error ? e : new Error(String(e)));
        }
    }));
}
