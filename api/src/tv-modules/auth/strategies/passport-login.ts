import passport from "passport";
import { initGoogleStrategy } from "./google.strategy";
import { initGithubStrategy } from "./github.strategy";
import { initAppleStrategy } from "./apple.strategy";

export function initPassportLogin() {
    initGoogleStrategy();
    initGithubStrategy();
    initAppleStrategy();
}

export default passport;

