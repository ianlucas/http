import body_parser from "body-parser";
import express, { Application, Request as ExpressRequest, Response as ExpressResponse } from "express";

interface JsonResponseSpec {
    status: number;
    data: any;
}

export interface Request {
    body: any;
    error: any;
    logout: () => void;
    user_id?: string;
}

export interface Response {
    login: () => void;
    redirect: (url: string) => void;
    json: (spec: JsonResponseSpec) => void;
}

export function request_handler(handler: (request: Request, response: Response) => void) {

// This API should be kept as minimal as possible.

    return function (request: ExpressRequest, response: ExpressResponse, error?: any) {
        return handler(
            {
                body: (request.body || undefined),
                error,
                logout() {
                    request.logout(function (logout_error) {
                        if (logout_error) {
                            throw "Unable to unauthenticate.";
                        }
                    });
                },
                user_id: ((request.user as string) || undefined)
            },
            {
                json(spec: JsonResponseSpec) {
                    response.status(spec.status);
                    response.json(spec.data);
                },
                login() {
                    response.redirect('__login__');
                },
                redirect(url: string) {
                    response.redirect(url);
                }
            }
        );
    };
}

interface Route {
    method: string;
    path: string;
    handler: (request: Request, response: Response) => void;
}

interface ServerSpec {
    routes?: Route[];
    on_listen?: () => void;
    plugins?: ((app: Application) => void)[];
    port: number;
    static_path?: string;
}

export function server(initial_spec: ServerSpec) {
    const default_spec: ServerSpec = {
        routes: [],
        plugins: [],
        port: 80
    };
    const spec = Object.assign(
        default_spec,
        initial_spec
    );
    const app = express();
    app.use(body_parser.json());
    app.use(body_parser.urlencoded({
        extended: true
    }));
    if (spec.plugins) {
        spec.plugins.forEach(function (plugin) {
            plugin(app);
        });
    }
    if (spec.routes) {
        spec.routes.forEach(function (route) {
            app[route.method as keyof Application](
                route.path,
                request_handler(
                    route.handler
                )
            );
        });
    }
    if (spec.static_path) {
        app.use(
            express.static(
                spec.static_path
            )
        );
    }
    app.listen(spec.port, spec.on_listen);
    return app;
}