import { Request, Response, server } from "./http";
import steam_auth from "./steam_auth";

function handle_auth_success(request: Request, response: Response) {
    return response.redirect("/hello");
}

function handle_auth_fail(request: Request, response: Response) {
    return response.json({
        status: 200,
        data: "Something wrong happened, please try again."
    });
}

const get_hello_route = {
    method: "get",
    path: "/hello",
    handler(request: Request, response: Response) {
        if (!request.user_id) {
            return response.json({
                status: 200,
                data: "You are not authenticated."
            });
        }
        return response.json({
            status: 200,
            data: "Hello, your id is " + request.user_id + "."
        });
    }
};

const get_logout_route = {
    method: 'get',
    path: '/logout',
    handler(request: Request, response: Response) {
        request.logout();
        response.redirect("/hello");
    }
};

server({
    port: 3000,
    routes: [
        get_hello_route,
        get_logout_route
    ],
    plugins: [
        steam_auth({
            api_key: process.env.STEAM_API_KEY as string,
            realm: "http://localhost:3000",
            on_success: handle_auth_success,
            on_fail: handle_auth_fail,
            session_path: "./test/session",
            session_secret: "some_secret",
        })
    ],
    on_listen() {
        console.log("Server is up and running.")
    }
});