import { Application, NextFunction, Request as ExpressRequest, Response as ExpressResponse } from "express";
import passport from "passport";
import auth from "./auth";
import { Request, request_handler, Response } from "./http";

interface SteamAuthSpec {
    api_key: string;
    on_fail: (request: Request, response: Response, login_error?: any) => void;
    on_success: (request: Request, response: Response) => void;
    realm: string;
    session_path: string;
    session_secret: string;
    update_incoming_user?: (user: User) => Promise<void>;
}

export interface User {
    id: string;
    id2: string;
    name: string;
    photo: string;
}

interface SteamProfile {
    _json: {
        avatarfull: string;
        personaname: string;
        steamid: string;
    };
}

const ACCOUNT_ID_MASK = 0xffffffff;

const Strategy: any = require("passport-steam");

function steam_auth(spec: SteamAuthSpec) {
    function replace_one(value: number, fallback: number) {
        return (
            value === 1
            ? fallback
            : value
        );
    }

    function get_user_data(profile: SteamProfile): User {

// For more information on the calculation done below,
// refer to https://developer.valvesoftware.com/wiki/SteamID.

        const data = profile._json;
        const steam_id = BigInt(data.steamid);
        const universe_id = replace_one(Number(steam_id >> 56n), 0);
        const account_id = Number(steam_id & BigInt(ACCOUNT_ID_MASK));
        const id2 = (
            "STEAM_"
            + universe_id
            + ":"
            + (account_id & 1)
            + ":"
            + Math.floor(account_id / 2)
        );
        return {
            id: data.steamid,
            id2,
            name: data.personaname,
            photo: data.avatarfull
        };
    }

    async function update_incoming_user(user: User) {
        if (spec.update_incoming_user) {
            await spec.update_incoming_user(user);
        }
    }

    function serialize_user(
        id: any,
        done: (error: any, user_id?: string) => void
    ) {
        done(null, id);
    }

    function deserialize_user(
        id: string,
        done: (error: any, user_id?: string) => void
    ) {
        done(null, id);
    }

    async function validate(
        identifier: string,
        profile: SteamProfile,
        done: (error: any, user_id?: string) => void
    ) {
        try {
            const user_data = get_user_data(profile);
            await update_incoming_user(user_data);
            return done(null, user_data.id);
        } catch (error) {
            return done(error);
        }
    }

    function authenticate(
        request: ExpressRequest,
        response: ExpressResponse,
        error: any, 
        user_id: string
    ) {
        if (error) {
            return request_handler(spec.on_fail)(request, response, error);
        }
        if (!user_id) {
            return request_handler(spec.on_fail)(request, response);
        }
        request.logIn(user_id, function (login_error) {
            if (login_error) {
                return request_handler(spec.on_fail)(request, response, login_error);
            }
            return request_handler(spec.on_success)(request, response);
        })
    }

    function return_handler(
        request: ExpressRequest,
        response: ExpressResponse,
        next: NextFunction
    ) {
        passport.authenticate("steam", function (error, user) {
            authenticate(request, response, error, user);
        })(request, response, next);
    }

    return function (app: Application) {    
        const options = {
            apiKey: spec.api_key,
            returnURL: (
                spec.realm
                + "/__postlogin__"
            ),
            realm: spec.realm            
        };

        const steam_strategy = new Strategy(options, validate);
        const auth_handler = passport.authenticate("steam");

        auth(app, {
            session_path: spec.session_path,
            session_secret: spec.session_secret
        });

        app.use(passport.initialize());
        app.use(passport.session());

        passport.serializeUser(serialize_user);
        passport.deserializeUser(deserialize_user);
        passport.use(steam_strategy);

        app.get("/__login__", auth_handler);
        app.get("/__postlogin__", return_handler);
    };
};

export default steam_auth;