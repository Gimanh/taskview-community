import passport from "passport";
import { initGoogleStrategy } from "./google.strategy";
import { initGithubStrategy } from "./github.strategy";

export function initPassportLogin() {
    initGoogleStrategy();
    initGithubStrategy();
}

export default passport;

