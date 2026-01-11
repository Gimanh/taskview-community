import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { $logger } from "../../../modules/logget";
import type { ExternalAuthUser } from "./external-auth.types";
import type { Profile } from "passport-github2";
import type { VerifyCallback } from "passport-google-oauth20";

export function initGithubStrategy() {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET || !process.env.GITHUB_CALLBACK_URL) {
        $logger.warn("GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL must be set");
        console.warn("GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, and GITHUB_CALLBACK_URL must be set");
        return;
    }

    const options = {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
        scope: ["user:email"],
    }

    passport.use(new GitHubStrategy(options, async (_accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback) => {
        try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(null, false);

            const user: ExternalAuthUser = {
                email,
                provider: "github",
            };

            done(null, user);
        } catch (e) {
            done(e);
        }
    }));
}
